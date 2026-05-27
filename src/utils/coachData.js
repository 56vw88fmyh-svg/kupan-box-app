import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

const dayNames = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']

function getCoachError(message = 'No pudimos cargar el modo coach.') {
  return { ok: false, message }
}

export function getChileNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
}

export function getChileDateString(date = getChileNow()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getChileDayOfWeek(date = getChileNow()) {
  const day = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    weekday: 'short',
  }).format(date)
    .replace('Sun', '0')
    .replace('Mon', '1')
    .replace('Tue', '2')
    .replace('Wed', '3')
    .replace('Thu', '4')
    .replace('Fri', '5')
    .replace('Sat', '6'))

  return day === 0 ? 7 : day
}

function normalizeReservation(row) {
  if (row?.class_schedule) return row

  return {
    ...row,
    profile: row.profile ?? {
      full_name: row.profile_full_name,
      email: row.profile_email,
      phone: row.profile_phone,
    },
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

function decorateClass(classItem, reservations) {
  const classReservations = reservations.filter((reservation) => reservation.class_schedule_id === classItem.id)
  const usedSpots = classReservations.filter((reservation) => reservation.status !== 'cancelled').length
  const maxSpots = classItem.max_spots ?? 12

  return {
    id: classItem.id,
    day: dayNames[classItem.day_of_week],
    time: classItem.time?.slice(0, 5) ?? '',
    className: classItem.class_name,
    coach: classItem.coach ?? 'Coach KUPAN',
    maxSpots,
    usedSpots,
    availableSpots: Math.max(maxSpots - usedSpots, 0),
    reservations: classReservations,
  }
}

function pickCurrentAndNext(classes) {
  const now = getChileNow()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const withDistance = classes.map((classItem) => {
    const [hours, minutes] = classItem.time.split(':').map(Number)
    const classMinutes = hours * 60 + minutes
    return {
      ...classItem,
      classMinutes,
      isCurrent: currentMinutes >= classMinutes && currentMinutes < classMinutes + 75,
      isUpcoming: classMinutes >= currentMinutes,
    }
  })

  const currentClass = withDistance.find((classItem) => classItem.isCurrent)
  const nextClass = withDistance.find((classItem) => classItem.isUpcoming && classItem.id !== currentClass?.id)

  return {
    currentClass: currentClass ?? withDistance.find((classItem) => classItem.isUpcoming) ?? withDistance[0] ?? null,
    nextClass: nextClass ?? null,
  }
}

async function loadCoachReservations(date) {
  const coachResult = await supabase.rpc('coach_get_day_reservations', { target_date: date })
  if (!coachResult.error) return coachResult.data ?? []

  const adminResult = await supabase.rpc('admin_get_reservations')
  if (adminResult.error) throw adminResult.error

  return (adminResult.data ?? []).filter((reservation) => reservation.reservation_date === date)
}

export async function loadCoachDashboard() {
  if (!isSupabaseConfigured || !supabase) {
    return getCoachError('Supabase aun no esta configurado.')
  }

  const today = getChileDateString()
  const dayOfWeek = getChileDayOfWeek()

  try {
    const [scheduleResult, reservationsResult] = await Promise.all([
      supabase
        .from('class_schedule')
        .select('id, day_of_week, time, class_name, coach, max_spots, active')
        .eq('active', true)
        .eq('day_of_week', dayOfWeek)
        .order('time', { ascending: true }),
      loadCoachReservations(today),
    ])

    if (scheduleResult.error) return getCoachError(`No pudimos cargar clases de hoy: ${scheduleResult.error.message}`)

    const reservations = (reservationsResult ?? []).map(normalizeReservation)
    const classes = (scheduleResult.data ?? []).map((classItem) => decorateClass(classItem, reservations))
    const { currentClass, nextClass } = pickCurrentAndNext(classes)

    return { ok: true, today, classes, currentClass, nextClass }
  } catch (error) {
    return getCoachError(`No pudimos cargar el modo coach: ${error.message}`)
  }
}

export async function markCoachReservation(reservationId, status) {
  const { error } = await supabase.rpc('admin_mark_reservation', {
    target_reservation_id: reservationId,
    target_status: status,
  })

  if (error) return getCoachError(error.message || 'No pudimos marcar asistencia.')
  return { ok: true, message: status === 'attended' ? 'Asistencia marcada. Token consumido.' : 'No show marcado. Token consumido.' }
}

export async function cancelCoachReservation(reservationId) {
  const { error } = await supabase.rpc('cancel_reservation', {
    target_reservation_id: reservationId,
  })

  if (error) return getCoachError(error.message || 'No pudimos cancelar la reserva.')
  return { ok: true, message: 'Reserva cancelada. Si correspondia, el token fue devuelto.' }
}
