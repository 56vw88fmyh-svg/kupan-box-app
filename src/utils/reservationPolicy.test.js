import assert from 'node:assert/strict'
import { getCancellationPolicy } from './reservationPolicy.js'

const classDate = '2026-08-11'
const classTime = '20:00'
const makePolicy = (minutesBefore, overrides = {}) => getCancellationPolicy({
  reservationDate: classDate,
  time: classTime,
  now: new Date(new Date('2026-08-11T20:00:00-04:00').getTime() - minutesBefore * 60_000),
  ...overrides,
})

assert.equal(makePolicy(46).kind, 'timely')
assert.equal(makePolicy(46).refundsToken, true)
assert.equal(makePolicy(45).kind, 'timely')
assert.equal(makePolicy(45).refundsToken, true)
assert.equal(makePolicy(44).kind, 'late')
assert.equal(makePolicy(44).refundsToken, false)
assert.equal(makePolicy(-1).kind, 'late')
assert.equal(makePolicy(-1).refundsToken, false)
assert.equal(makePolicy(-1, { actor: 'kupan' }).kind, 'kupan')
assert.equal(makePolicy(-1, { actor: 'kupan' }).refundsToken, true)
assert.equal(makePolicy(46, { tokenCharged: false }).refundsToken, false)
assert.equal(makePolicy(44, { tokenCharged: false }).consumesFullDailyReservation, true)
