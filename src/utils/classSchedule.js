function toShortTime(value) {
  return value ? String(value).slice(0, 5) : ''
}

export function isOpenAccessSchedule(classItem) {
  return Boolean(classItem?.isOpenAccess ?? classItem?.is_open_access)
}

export function isUnlimitedSchedule(classItem) {
  return Boolean(classItem?.unlimitedCapacity ?? classItem?.unlimited_capacity)
}

export function getScheduleEndTime(classItem) {
  return toShortTime(classItem?.endTime ?? classItem?.end_time)
}

export function formatScheduleTime(classItem) {
  const startTime = toShortTime(classItem?.time)
  const endTime = getScheduleEndTime(classItem)
  return startTime && endTime ? `${startTime}–${endTime}` : startTime
}
