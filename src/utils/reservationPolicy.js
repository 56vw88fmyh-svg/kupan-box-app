import { formatChileTime, getChileDateTime } from './chileDateTime.js'
import { gymConfig } from '../config/gymConfig.js'

export const CANCELLATION_REFUND_MINUTES = gymConfig.operations.cancellationWindowMinutes
export const RESERVATION_CLOSES_MINUTES = gymConfig.operations.reservationClosesMinutes

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
  const isGymCancellation = actor === 'gym' || actor === 'kupan'
  const isTimely = now.getTime() <= cutoffAt.getTime()
  const kind = isGymCancellation ? 'kupan' : isTimely ? 'timely' : 'late'
  const refundsToken = Boolean(tokenCharged && (isGymCancellation || isTimely))

  return {
    valid: true,
    startsAt,
    cutoffAt,
    cutoffLabel: formatChileTime(cutoffAt),
    kind,
    refundsToken,
    consumesFullDailyReservation: !isGymCancellation && !isTimely,
    message: isGymCancellation
      ? `${gymConfig.identity.name} canceló esta clase. Tu token será devuelto.`
      : isTimely
        ? 'Cancelarás con anticipación y recuperarás tu token.'
        : `Estás fuera del plazo de ${refundMinutes} minutos. La reserva se cancelará sin devolver el token.`,
  }
}

export function getReservationTiming({ reservationDate, time, now = new Date(), closesMinutes = RESERVATION_CLOSES_MINUTES }) {
  const startsAt = getChileDateTime(reservationDate, time)
  if (!startsAt) return { valid: false, canReserve: false }
  const closesAt = new Date(startsAt.getTime() - closesMinutes * 60_000)
  return { valid: true, startsAt, closesAt, canReserve: now.getTime() <= closesAt.getTime() }
}
