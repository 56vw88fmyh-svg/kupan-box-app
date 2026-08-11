import { formatChileTime, getChileDateTime } from './chileDateTime.js'

export const CANCELLATION_REFUND_MINUTES = 45
export const RESERVATION_CLOSES_MINUTES = 15

export function getCancellationPolicy({
  reservationDate,
  time,
  now = new Date(),
  actor = 'student',
  tokenCharged = true,
  refundMinutes = CANCELLATION_REFUND_MINUTES,
}) {
  const startsAt = getChileDateTime(reservationDate, time)
  if (!startsAt) {
    return { valid: false, kind: 'unknown', refundsToken: false, message: 'No pudimos calcular la hora de esta clase.' }
  }

  const cutoffAt = new Date(startsAt.getTime() - refundMinutes * 60_000)
  const isKupanCancellation = actor === 'kupan'
  const isTimely = now.getTime() <= cutoffAt.getTime()
  const kind = isKupanCancellation ? 'kupan' : isTimely ? 'timely' : 'late'
  const refundsToken = Boolean(tokenCharged && (isKupanCancellation || isTimely))

  return {
    valid: true,
    startsAt,
    cutoffAt,
    cutoffLabel: formatChileTime(cutoffAt),
    kind,
    refundsToken,
    consumesFullDailyReservation: !isKupanCancellation && !isTimely,
    message: isKupanCancellation
      ? 'KUPAN canceló esta clase. Tu token será devuelto.'
      : isTimely
        ? 'Cancelarás con anticipación y recuperarás tu token.'
        : 'Estás fuera del plazo de 45 minutos. La reserva se cancelará sin devolver el token.',
  }
}

export function getReservationTiming({ reservationDate, time, now = new Date(), closesMinutes = RESERVATION_CLOSES_MINUTES }) {
  const startsAt = getChileDateTime(reservationDate, time)
  if (!startsAt) return { valid: false, canReserve: false }
  const closesAt = new Date(startsAt.getTime() - closesMinutes * 60_000)
  return { valid: true, startsAt, closesAt, canReserve: now.getTime() <= closesAt.getTime() }
}
