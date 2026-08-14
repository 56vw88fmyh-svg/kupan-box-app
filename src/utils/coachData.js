import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { gymConfig } from '../config/gymConfig.js'
import { getHumanErrorMessage, logAppError } from './appState.js'
import { formatScheduleTime, getScheduleEndTime, isOpenAccessSchedule, isUnlimitedSchedule } from './classSchedule.js'

const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function getCoachError(message = 'No pudimos cargar el modo coach.') {
  return { ok: false, message }
}

function getSafeCoachError(scope, error, fallback) {
  logAppError(scope, error)
  return getCoachError(getHumanErrorMessage(error, fallback))
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
  const unlimitedCapacity = isUnlimitedSchedule(classItem)

  return {
    id: classItem.id,
    day: dayNames[classItem.day_of_week],
    time: classItem.time?.slice(0, 5) ?? '',
    endTime: getScheduleEndTime(classItem),
    timeLabel: formatScheduleTime(classItem),
    className: classItem.class_name,
    coach: classItem.coach ?? `Coach ${gymConfig.identity.name}`,
    maxSpots: unlimitedCapacity ? null : maxSpots,
    usedSpots,
    availableSpots: unlimitedCapacity ? null : Math.max(maxSpots - usedSpots, 0),
    isOpenAccess: isOpenAccessSchedule(classItem),
    unlimitedCapacity,
    reservations: classReservations,
  }
}

function pickCurrentAndNext(classes) {
  const now = getChileNow()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const withDistance = classes.map((classItem) => {
    const [hours, minutes] = classItem.time.split(':').map(Number)
    const [endHours, endMinutes] = (classItem.endTime || '').split(':').map(Number)
    const classMinutes = hours * 60 + minutes
    const endClassMinutes = Number.isFinite(endHours) && Number.isFinite(endMinutes)
      ? endHours * 60 + endMinutes
      : classMinutes + 75
    return {
      ...classItem,
      classMinutes,
      isCurrent: currentMinutes >= classMinutes && currentMinutes < endClassMinutes,
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
    return getCoachError('El servicio de datos aún no está configurado.')
  }

  const today = getChileDateString()
  const dayOfWeek = getChileDayOfWeek()

  try {
    const [scheduleResult, reservationsResult] = await Promise.all([
      supabase
        .from('class_schedule')
        .select('id, day_of_week, time, end_time, class_name, coach, max_spots, is_open_access, unlimited_capacity, active')
        .eq('active', true)
        .eq('day_of_week', dayOfWeek)
        .order('time', { ascending: true }),
      loadCoachReservations(today),
    ])

    if (scheduleResult.error) return getSafeCoachError('coach.load_schedule', scheduleResult.error, 'No fue posible cargar las clases de hoy. Revisa tu conexión y vuelve a intentarlo.')

    const reservations = (reservationsResult ?? []).map(normalizeReservation)
    const classes = (scheduleResult.data ?? []).map((classItem) => decorateClass(classItem, reservations))
    const { currentClass, nextClass } = pickCurrentAndNext(classes)

    return { ok: true, today, classes, currentClass, nextClass }
  } catch (error) {
    return getSafeCoachError('coach.load_dashboard', error, 'No fue posible cargar el modo coach. Revisa tu conexión y vuelve a intentarlo.')
  }
}

export async function loadCoachManualReservationOptions() {
  if (!isSupabaseConfigured || !supabase) {
    return getCoachError('El servicio de datos aún no está configurado.')
  }

  try {
    const [profilesResult, membershipsResult] = await Promise.all([
      supabase.rpc('coach_get_manual_reservation_profiles'),
      supabase.rpc('coach_get_manual_reservation_memberships'),
    ])

    if (profilesResult.error) return getSafeCoachError('coach.load_manual_profiles', profilesResult.error, 'No fue posible cargar alumnos para reserva manual.')
    if (membershipsResult.error) return getSafeCoachError('coach.load_manual_memberships', membershipsResult.error, 'No fue posible revisar membresías para reserva manual.')

    return {
      ok: true,
      profiles: profilesResult.data ?? [],
      memberships: membershipsResult.data ?? [],
    }
  } catch (error) {
    return getSafeCoachError('coach.load_manual_options', error, 'No fue posible preparar la reserva manual.')
  }
}

export async function markCoachReservation(reservationId, status) {
  const arrivalStatus = status === 'attended' ? 'on_time' : null
  const { error } = await supabase.rpc('coach_mark_attendance', {
    target_reservation_id: reservationId,
    target_status: status,
    target_arrival_status: arrivalStatus,
    reason_input: status === 'reserved' ? 'Corrección de asistencia' : null,
  })

  if (error) return getSafeCoachError('coach.mark_reservation', error, 'No pudimos marcar asistencia. Intenta nuevamente.')
  if (status === 'reserved') return { ok: true, message: 'Asistencia revertida y registrada en el historial.' }
  return { ok: true, message: status === 'attended' ? 'Asistencia marcada. Token consumido.' : 'No show marcado. Token consumido.' }
}

export async function markCoachLateArrival(reservationId) {
  const { error } = await supabase.rpc('coach_mark_attendance', {
    target_reservation_id: reservationId,
    target_status: 'attended',
    target_arrival_status: 'late',
    reason_input: 'Llegada tardía registrada por coach',
  })
  if (error) return getSafeCoachError('coach.mark_late', error, 'No pudimos registrar la llegada tardía.')
  return { ok: true, message: 'Llegada tardía y asistencia registradas.' }
}

export async function loadCoachPrivateNotes(profileId) {
  const { data, error } = await supabase
    .from('coach_private_notes')
    .select('id, profile_id, reservation_id, note_type, content, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) return getSafeCoachError('coach.load_notes', error, 'No pudimos cargar las observaciones privadas.')
  return { ok: true, notes: data ?? [] }
}

export async function createCoachPrivateNote({ profileId, reservationId, noteType, content }) {
  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase.from('coach_private_notes').insert({
    profile_id: profileId,
    reservation_id: reservationId || null,
    note_type: noteType,
    content: content.trim(),
    created_by: userData.user?.id,
  })
  if (error) return getSafeCoachError('coach.create_note', error, 'No pudimos guardar la observación privada.')
  return { ok: true, message: 'Observación privada guardada.' }
}

export async function cancelCoachReservation(reservationId) {
  const { data, error } = await supabase.rpc('admin_cancel_reservation', {
    target_reservation_id: reservationId,
    cancellation_reason: 'Cancelación operativa desde Modo Coach',
  })

  if (error) return getSafeCoachError('coach.cancel_reservation', error, 'No pudimos cancelar la reserva. Intenta nuevamente.')
  const reservation = Array.isArray(data) ? data[0] : data
  return {
    ok: true,
    message: reservation?.token_refunded
      ? `Reserva cancelada por ${gymConfig.identity.name}. Token devuelto.`
      : `Reserva cancelada por ${gymConfig.identity.name}.`,
  }
}
