import { isUnlimitedSchedule } from './classSchedule.js'

export function addCalendarDays(day, amount) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}
export function weekRange(day) {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
  const start = addCalendarDays(day, -((weekday + 6) % 7))
  return { start, end: addCalendarDays(start, 6) }
}
export function renewalCandidates(profiles, memberships, today) {
  return profiles.filter(profile => {
    if (profile.status !== 'active' || ['admin','coach'].includes(profile.role)) return false
    const allCycles = memberships.filter(item => item.profile_id === profile.id)
    const cycles = allCycles.filter(item => item.start_date <= today)
    if (allCycles.some(item => item.status === 'active' && item.payment_status === 'paid' && (item.end_date ?? item.expires_at) >= today)) return false
    const last = cycles.filter(item => item.status !== 'cancelled').sort((a,b) => String(b.end_date ?? b.expires_at).localeCompare(String(a.end_date ?? a.expires_at)))[0]
    return Boolean(last && (last.end_date ?? last.expires_at) < today)
  })
}
export function weeklyOccupancy(schedule, reservations, today) {
  const { start, end } = weekRange(today)
  const classes = schedule.filter(item => item.active && !isUnlimitedSchedule(item))
  const capacity = classes.reduce((sum,item) => sum + Math.max(0, Number(item.max_spots) || 0), 0)
  if (!capacity) return null
  const ids = new Set(classes.map(item => item.id))
  const occupied = reservations.filter(item => ids.has(item.class_schedule_id) && item.reservation_date >= start && item.reservation_date <= end && ['reserved','attended','no_show'].includes(item.status)).length
  return Math.round(100 * occupied / capacity)
}
export function monthlyAttendance(reservations, today) {
  const closed = reservations.filter(item => String(item.reservation_date).startsWith(today.slice(0,7)) && item.reservation_date <= today && ['attended','no_show'].includes(item.status))
  const noShows = closed.filter(item => item.status === 'no_show').length
  return { attended: closed.length - noShows, noShows, closed: closed.length, noShowRate: closed.length ? 100 * noShows / closed.length : null }
}
export function completedThisWeek(reservations, today) {
  const { start, end } = weekRange(today)
  return reservations.filter(item => item.status === 'attended' && (item.reservation_date ?? item.reservationDate) >= start && (item.reservation_date ?? item.reservationDate) <= end && (item.reservation_date ?? item.reservationDate) <= today).length
}
