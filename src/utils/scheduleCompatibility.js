export const ENHANCED_SCHEDULE_FIELDS = 'id, day_of_week, time, end_time, class_name, coach, max_spots, is_open_access, unlimited_capacity, active'
export const LEGACY_SCHEDULE_FIELDS = 'id, day_of_week, time, class_name, coach, max_spots, active'

export function isMissingOptionalScheduleColumn(error) {
  return error?.code === '42703' || /column .* does not exist/i.test(error?.message ?? '')
}

export function buildLegacySchedulePayload(payload) {
  return {
    day_of_week: payload.day_of_week,
    time: payload.time,
    class_name: payload.class_name,
    coach: payload.coach,
    max_spots: payload.max_spots,
    active: payload.active,
  }
}
