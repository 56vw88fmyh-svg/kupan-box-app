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

export function mapReservationRow(row) {
  if (row?.class_schedule) return row

  return {
    ...row,
    class_schedule: {
      id: row.class_schedule_id,
      day_of_week: row.schedule_day_of_week,
      time: row.schedule_time,
      class_name: row.schedule_class_name,
      coach: row.schedule_coach,
      max_spots: row.schedule_max_spots,
    },
  }
}

export async function loadReservationData(profileId) {
  if (!isSupabaseConfigured || !supabase) {
    return getReservationError('Supabase aun no esta configurado.')
  }

  const [scheduleResult, reservationsResult, membershipResult] = await Promise.all([
    supabase
      .from('class_schedule')
      .select('id, day_of_week, time, class_name, coach, max_spots, active')
      .eq('active', true)
      .order('day_of_week', { ascending: true })
      .order('time', { ascending: true }),
    profileId
      ? supabase
        .rpc('get_my_reservations')
      : Promise.resolve({ data: [], error: null }),
    profileId
      ? supabase
        .rpc('get_active_membership', { target_profile_id: profileId })
      : Promise.resolve({ data: null, error: null }),
  ])

  if (scheduleResult.error) return getReservationError(`No pudimos cargar los horarios reales: ${scheduleResult.error.message}`)
  if (reservationsResult.error) return getReservationError(`No pudimos cargar tus reservas: ${reservationsResult.error.message}`)
  if (membershipResult.error) return getReservationError(`No pudimos revisar tu membresia: ${membershipResult.error.message}`)

  const userReservations = (reservationsResult.data ?? []).map(mapReservationRow)
  const membership = Array.isArray(membershipResult.data) ? membershipResult.data[0] : membershipResult.data
  const hasActiveMembership = Boolean(membership?.status === 'active' && membership?.payment_status === 'paid')
  const { data: remainingTokens, error: remainingTokensError } = membership?.id
    ? await supabase.rpc('membership_remaining_tokens', { target_membership_id: membership.id })
    : { data: null }
  if (remainingTokensError) return getReservationError(`No pudimos calcular tus tokens: ${remainingTokensError.message}`)

  const classes = await Promise.all((scheduleResult.data ?? []).map(async (classItem) => {
    const reservationDate = getNextDateForDay(classItem.day_of_week)
    const { data: availableSpots, error: availableSpotsError } = await supabase.rpc('available_spots', {
      class_id: classItem.id,
      target_date: reservationDate,
    })
    if (availableSpotsError) {
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
        spots: classItem.max_spots ?? 12,
        isFull: false,
        isReserved: false,
      }
    }
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
    remainingTokens,
  }
}

export async function createSupabaseReservation(profileId, classItem, hasActiveMembership) {
  if (!profileId) return getReservationError('Inicia sesion para reservar.')
  if (!hasActiveMembership) return getReservationError('Necesitas una membresia activa y pagada para reservar. Si tu plan esta vencido, pausado o sin pago confirmado, habla con KUPAN.')
  const { data, error } = await supabase.rpc('reserve_class', {
    target_profile_id: profileId,
    target_class_schedule_id: classItem.classScheduleId,
    target_reservation_date: classItem.reservationDate,
  })

  if (error) {
    const message = error.message?.toLowerCase() ?? ''
    if (message.includes('duplicate') || message.includes('unique')) {
      return getReservationError('Ya tienes una reserva para esa clase y fecha.')
    }
    if (message.includes('function') && message.includes('reserve_class')) return getReservationError('Falta ejecutar el SQL de reservas en Supabase. Ejecuta tokens-payments-reservations.sql.')
    if (message.includes('tokens')) return getReservationError('No tienes tokens disponibles. Debes renovar tu plan.')
    if (message.includes('membresia') || message.includes('membresía')) return getReservationError('Necesitas una membresía activa y pagada para reservar.')
    if (message.includes('completa')) return getReservationError('Clase completa.')
    return getReservationError(error.message || 'No pudimos confirmar tu reserva.')
  }

  return { ok: true, reservation: { ...data, ...classItem } }
}

export async function cancelSupabaseReservation(reservationId) {
  const { error } = await supabase.rpc('cancel_reservation', {
    target_reservation_id: reservationId,
  })

  if (error) return getReservationError(error.message || 'No pudimos cancelar la reserva.')
  return { ok: true, message: 'Reserva cancelada. Si correspondia, el token fue devuelto.' }
}

export async function adminReserveForStudent({
  profileId,
  classScheduleId,
  reservationDate,
  allowWithoutMembership = false,
  note = '',
}) {
  if (!isSupabaseConfigured || !supabase) {
    return getReservationError('Supabase aun no esta configurado.')
  }

  if (!profileId) return getReservationError('Selecciona un alumno.')
  if (!classScheduleId) return getReservationError('Selecciona una clase.')
  if (!reservationDate) return getReservationError('Selecciona una fecha.')

  const { data, error } = await supabase.rpc('admin_reserve_for_student', {
    target_profile_id: profileId,
    target_class_schedule_id: classScheduleId,
    target_reservation_date: reservationDate,
    allow_without_membership: allowWithoutMembership,
    admin_note: note || null,
  })

  if (error) {
    const message = error.message || 'No pudimos agregar el alumno a la clase.'
    return getReservationError(message)
  }

  return {
    ok: true,
    reservation: data,
    message: 'Alumno agregado correctamente a la clase.',
  }
}
