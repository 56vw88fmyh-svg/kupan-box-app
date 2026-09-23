import assert from 'node:assert/strict'
import {
  formatScheduleTime,
  getScheduleEndTime,
  isOpenAccessSchedule,
  isUnlimitedSchedule,
} from './classSchedule.js'
import { buildLegacySchedulePayload, isMissingOptionalScheduleColumn } from './scheduleCompatibility.js'

assert.equal(formatScheduleTime({ time: '09:00:00', end_time: '13:00:00' }), '09:00–13:00')
assert.equal(formatScheduleTime({ time: '18:00:00', endTime: '19:00:00' }), '18:00–19:00')
assert.equal(formatScheduleTime({ time: '20:00:00' }), '20:00')
assert.equal(getScheduleEndTime({ end_time: '22:00:00' }), '22:00')
assert.equal(isOpenAccessSchedule({ is_open_access: true }), true)
assert.equal(isUnlimitedSchedule({ unlimitedCapacity: true }), true)
assert.equal(isMissingOptionalScheduleColumn({ code: '42703', message: 'missing' }), true)
assert.equal(isMissingOptionalScheduleColumn({ code: '', message: 'column class_schedule.end_time does not exist' }), true)
assert.equal(isMissingOptionalScheduleColumn({ code: '500', message: 'network error' }), false)
assert.deepEqual(buildLegacySchedulePayload({
  day_of_week: 2,
  time: '19:00',
  end_time: '20:00',
  class_name: 'CrossFit',
  coach: 'Coach KUPAN',
  max_spots: 12,
  is_open_access: true,
  unlimited_capacity: true,
  active: true,
}), {
  day_of_week: 2,
  time: '19:00',
  class_name: 'CrossFit',
  coach: 'Coach KUPAN',
  max_spots: 12,
  active: true,
})
