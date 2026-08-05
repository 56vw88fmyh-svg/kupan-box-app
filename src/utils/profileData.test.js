import assert from 'node:assert/strict'
import { getMembershipTokenSummary } from './profileData.js'

assert.deepEqual(getMembershipTokenSummary({
  classes_total: 16,
  classes_used: 5,
  is_unlimited: false,
}), {
  isUnlimited: false,
  total: 16,
  used: 5,
  remaining: 11,
})

assert.deepEqual(getMembershipTokenSummary({
  classes_total: 8,
  classes_used: 2,
  is_unlimited: false,
}, 5), {
  isUnlimited: false,
  total: 8,
  used: 2,
  remaining: 5,
})

assert.deepEqual(getMembershipTokenSummary({
  classes_total: null,
  classes_used: 7,
  plan: { is_unlimited: true },
}), {
  isUnlimited: true,
  total: null,
  used: 0,
  remaining: null,
})

assert.deepEqual(getMembershipTokenSummary(null), {
  isUnlimited: false,
  total: 0,
  used: 0,
  remaining: 0,
})
