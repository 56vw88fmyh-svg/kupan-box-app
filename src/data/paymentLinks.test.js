import assert from 'node:assert/strict'
import { getPaymentUrlForPlan, paymentLinks } from './paymentLinks.js'

assert.equal(getPaymentUrlForPlan('8 clases'), paymentLinks.eightClasses)
assert.equal(getPaymentUrlForPlan('12 clases'), paymentLinks.twelveClasses)
assert.equal(getPaymentUrlForPlan('Full CrossFit'), paymentLinks.full)
assert.equal(getPaymentUrlForPlan('Pase diario'), paymentLinks.dailyPass)
assert.equal(getPaymentUrlForPlan('16 clases'), '')
assert.equal(new Set(Object.values(paymentLinks)).size, 4)
