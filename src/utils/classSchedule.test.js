import assert from 'node:assert/strict'
import {
  formatScheduleTime,
  getScheduleEndTime,
  isOpenAccessSchedule,
  isUnlimitedSchedule,
} from './classSchedule.js'

assert.equal(formatScheduleTime({ time: '09:00:00', end_time: '13:00:00' }), '09:00–13:00')
assert.equal(formatScheduleTime({ time: '18:00:00', endTime: '19:00:00' }), '18:00–19:00')
assert.equal(formatScheduleTime({ time: '20:00:00' }), '20:00')
assert.equal(getScheduleEndTime({ end_time: '22:00:00' }), '22:00')
assert.equal(isOpenAccessSchedule({ is_open_access: true }), true)
assert.equal(isUnlimitedSchedule({ unlimitedCapacity: true }), true)
