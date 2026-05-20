import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

const dayNames = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
const shortDayNames = ['', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

function getReservationError(message = 'No pudimos completar la reserva. Intenta nuevamente.') {
  return { ok: false, message }
}

function toDateInput(date) {
  return date.toISOString().slice(0, 10)
}

function getNextDateForDay(dayOfWeek) {
  const today = new Date()
  const jsToday = today.getDay() === 0 ? 7 : today.getDay()
  const daysToAdd = (dayOfWeek - jsToday + 7) % 7
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + daysToAdd)
  return toDateInput(targetDate)
}

function getBlock(time) {
  return Number(time.slice(0, 2)) < 12 ? 'AM' : 'PM'
}

export function formatReservationDate(date) {
  if (!date) return ''
  return new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${date}T00:00:00`))
}

export async function loadReservationData(profileId) {
  if (!isSupabaseConfigured || !supabase) {
    return getReservationError('Supabase aun no esta configurado.')
  }

  const today = toDateInput(new Date())
  const [scheduleResult, reservationsResult, membershipResult] = await Promise.all([
    supabase
      .from('class_schedule')
      .select('id, day_of_week, time, class_name, coach, max_spots, active')
      .eq('active', true)
      .order('day_of_week', { ascending: true })
      .order('time', { ascending: true }),
    profileId
      ? supabase
        .from('reservations')
        .select('id, profile_id, class_schedule_id, reservation_date, status, created_at, class_schedule:class_schedule(id, day_of_week, time, class_name, coach, max_spots)')
        .eq('profile_id', profileId)
        .in('status', ['reserved', 'attended'])
        .gte('reservation_date', today)
        .order('reservation_date', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    profileId
      ? supabase
        .from('memberships')
        .select('id, status, start_date, end_date, plan:plans(name)')
        .eq('profile_id', profileId)
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (scheduleResult.error) return getReservationError('No pudimos cargar los horarios reales.')
  if (reservationsResult.error) return getReservationError('No pudimos cargar tus reservas.')
  if (membershipResult.error) return getReservationError('No pudimos revisar tu membresia.')

  const userReservations = reservationsResult.data ?? []
  const membership = membershipResult.data
  const hasActiveMembership = Boolean(
    membership?.status === 'active' &&
    today >= membership.start_date &&
    today <= membership.end_date,
  )

  const classes = await Promise.all((scheduleResult.data ?? []).map(async (classItem) => {
    const reservationDate = getNextDateForDay(classItem.day_of_week)
    const { data: availableSpots } = await supabase.rpc('available_spots', {
      class_id: classItem.id,
      target_date: reservationDate,
    })
    const spots = Number(availableSpots ?? classItem.max_spots ?? 12)
    const isReserved = userReservations.some((reservation) => (
      reservation.class_schedule_id === classItem.id &&
      reservation.reservation_date === reservationDate &&
      reservation.status === 'reserved'
    ))

    return {
      id: classItem.id,
      classScheduleId: classItem.id,
      reservationDate,
      dayId: String(classItem.day_of_week),
      day: dayNames[classItem.day_of_week],
      short: shortDayNames[classItem.day_of_week],
      block: getBlock(classItem.time),
      time: classItem.time.slice(0, 5),
      name: classItem.class_name,
      coach: classItem.coach ?? 'Coach KUPAN',
      maxSpots: classItem.max_spots ?? 12,
      spots,
      isFull: spots <= 0,
      isReserved,
    }
  }))

  return {
    ok: true,
    classes,
    reservations: userReservations,
    membership,
    hasActiveMembership,
  }
}

export async function createSupabaseReservation(profileId, classItem, hasActiveMembership) {
  if (!profileId) return getReservationError('Inicia sesion para reservar.')
  if (!hasActiveMembership) return getReservationError('Necesitas una membresia activa para reservar. Si tu plan esta vencido, pausado o cancelado, habla con KUPAN.')

  const { data: spots } = await supabase.rpc('available_spots', {
    class_id: classItem.classScheduleId,
    target_date: classItem.reservationDate,
  })

  if (Number(spots ?? 0) <= 0) return getReservationError('Clase completa.')

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      profile_id: profileId,
      class_schedule_id: classItem.classScheduleId,
      reservation_date: classItem.reservationDate,
      status: 'reserved',
    })
    .select('id, profile_id, class_schedule_id, reservation_date, status, created_at')
    .single()

  if (error) {
    const message = error.message?.toLowerCase() ?? ''
    if (message.includes('duplicate') || message.includes('unique')) {
      return getReservationError('Ya tienes una reserva para esa clase y fecha.')
    }
    return getReservationError('No pudimos confirmar tu reserva.')
  }

  return { ok: true, reservation: { ...data, ...classItem } }
}

export async function cancelSupabaseReservation(reservationId) {
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)

  if (error) return getReservationError('No pudimos cancelar la reserva.')
  return { ok: true, message: 'Reserva cancelada.' }
}
