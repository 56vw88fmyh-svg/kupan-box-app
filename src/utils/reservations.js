export const RESERVATIONS_STORAGE_KEY = 'kupan-reservations'
export const CLASS_MAX_SPOTS = 12

export function getClassKey(classItem) {
  return `${classItem.dayId}-${classItem.time}-${classItem.name}`
}

export function getReservedCount(classItem, reservations) {
  const classKey = getClassKey(classItem)
  return reservations.filter((reservation) => getClassKey(reservation) === classKey).length
}

export function getAvailableSpots(classItem, reservations) {
  const maxSpots = classItem.maxSpots ?? CLASS_MAX_SPOTS
  const adminAvailableSpots = Math.min(classItem.spots ?? maxSpots, maxSpots)
  return Math.max(adminAvailableSpots - getReservedCount(classItem, reservations), 0)
}

export function hasActiveReservation(classItem, reservations, userId) {
  const classKey = getClassKey(classItem)
  return reservations.some((reservation) => (
    getClassKey(reservation) === classKey &&
    (!userId || reservation.userId === userId)
  ))
}

export function withReservationState(classItem, reservations, userId) {
  const maxSpots = classItem.maxSpots ?? CLASS_MAX_SPOTS
  const spots = getAvailableSpots({ ...classItem, maxSpots }, reservations)

  return {
    ...classItem,
    maxSpots,
    spots,
    isFull: spots === 0,
    isReserved: hasActiveReservation(classItem, reservations, userId),
  }
}
