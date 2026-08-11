import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getHumanErrorMessage, logAppError } from './appState.js'
import { getChileDateKey } from './chileDateTime.js'
import { formatCoachName } from './coachName.js'

const dayNames = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
const shortDayNames = ['', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

function getReservationError(message = 'No pudimos completar la reserva. Intenta nuevamente.') {
  return { ok: false, message }
}

function getSafeReservationError(scope, error, fallback) {
  logAppError(scope, error)
  return getReservationError(getHumanErrorMessage(error, fallback))
}

function toDateInput(date) {
  return getChileDateKey(date)
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
    return getReservationError('El servicio de datos aún no está configurado.')
  }

  const [scheduleResult, reservationsResult, membershipResult, waitlistResult] = await Promise.all([
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
    profileId
      ? supabase
        .from('class_waitlist')
        .select('id, profile_id, class_schedule_id, reservation_date, status, position_hint, joined_at')
        .eq('profile_id', profileId)
        .eq('status', 'waiting')
      : Promise.resolve({ data: [], error: null }),
  ])

  if (scheduleResult.error) return getSafeReservationError('reservations.load_schedule', scheduleResult.error, 'No fue posible cargar los horarios. Revisa tu conexión y vuelve a intentarlo.')
  if (reservationsResult.error) return getSafeReservationError('reservations.load_user_reservations', reservationsResult.error, 'No fue posible cargar tus reservas. Revisa tu conexión y vuelve a intentarlo.')
  if (membershipResult.error) return getSafeReservationError('reservations.load_membership', membershipResult.error, 'No fue posible revisar tu plan. Intenta nuevamente.')

  const userReservations = (reservationsResult.data ?? []).map(mapReservationRow)
  const membership = Array.isArray(membershipResult.data) ? membershipResult.data[0] : membershipResult.data
  const hasActiveMembership = Boolean(membership?.status === 'active' && membership?.payment_status === 'paid')
  const { data: remainingTokens, error: remainingTokensError } = membership?.id
    ? await supabase.rpc('membership_remaining_tokens', { target_membership_id: membership.id })
    : { data: null }
  if (remainingTokensError) return getSafeReservationError('reservations.remaining_tokens', remainingTokensError, 'No fue posible calcular tus tokens. Intenta nuevamente.')

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
        coach: formatCoachName(classItem.coach),
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
      coach: formatCoachName(classItem.coach),
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
    waitlist: waitlistResult.error ? [] : (waitlistResult.data ?? []),
  }
}

export async function createSupabaseReservation(profileId, classItem, hasActiveMembership) {
  if (!profileId) return getReservationError('Inicia sesión para reservar.')
  if (!hasActiveMembership) return getReservationError('Necesitas una membresía activa y pagada para reservar. Si tu plan está vencido, pausado o sin pago confirmado, habla con KUPAN.')
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
    if (message.includes('function') && message.includes('reserve_class')) return getReservationError('Las reservas aún no están disponibles. Revisa la configuración con el administrador.')
    if (message.includes('tokens')) return getReservationError('No tienes tokens disponibles. Debes renovar tu plan.')
    if (message.includes('membresia') || message.includes('membresía')) return getReservationError('Necesitas una membresía activa y pagada para reservar.')
    if (message.includes('completa')) return getReservationError('Clase completa.')
    return getSafeReservationError('reservations.reserve_class', error, 'No pudimos confirmar tu reserva. Revisa tu conexión y vuelve a intentarlo.')
  }

  return { ok: true, reservation: { ...data, ...classItem } }
}

export async function cancelSupabaseReservation(reservationId, reason = '') {
  const { data, error } = await supabase.rpc('cancel_reservation', {
    target_reservation_id: reservationId,
    reason_input: reason || null,
  })

  if (error) return getSafeReservationError('reservations.cancel_reservation', error, 'No pudimos cancelar la reserva. Intenta nuevamente.')
  const reservation = Array.isArray(data) ? data[0] : data
  return {
    ok: true,
    reservation,
    message: reservation?.token_refunded
      ? 'Reserva cancelada. Tu token fue devuelto.'
      : 'Reserva cancelada. Por estar dentro de los 45 minutos previos, el token quedó utilizado.',
  }
}

export async function joinSupabaseWaitlist(classItem) {
  const { data, error } = await supabase.rpc('join_class_waitlist', {
    target_class_schedule_id: classItem.classScheduleId,
    target_reservation_date: classItem.reservationDate,
  })
  if (error) return getSafeReservationError('reservations.join_waitlist', error, 'No pudimos agregarte a la lista de espera.')
  return { ok: true, entry: data, message: 'Quedaste en la lista de espera. Te avisaremos si se libera un cupo.' }
}

export async function leaveSupabaseWaitlist(waitlistId) {
  const { data, error } = await supabase.rpc('leave_class_waitlist', { target_waitlist_id: waitlistId })
  if (error) return getSafeReservationError('reservations.leave_waitlist', error, 'No pudimos sacarte de la lista de espera.')
  return { ok: true, entry: data, message: 'Saliste de la lista de espera.' }
}

export async function adminReserveForStudent({
  profileId,
  classScheduleId,
  reservationDate,
  allowWithoutMembership = false,
  note = '',
}) {
  if (!isSupabaseConfigured || !supabase) {
    return getReservationError('El servicio de datos aún no está configurado.')
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

  if (error) return getSafeReservationError('reservations.admin_reserve_for_student', error, 'No pudimos agregar el alumno a la clase. Intenta nuevamente.')

  return {
    ok: true,
    reservation: data,
    message: 'Alumno agregado correctamente a la clase.',
  }
}
