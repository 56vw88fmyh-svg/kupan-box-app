import assert from 'node:assert/strict'
import { DEFAULT_GYM_ID, findGymIdByHostname, getGymConfig, gymConfigs, resolveGymId } from './gyms.js'

/* global console */

assert.equal(DEFAULT_GYM_ID, 'kupan')
assert.equal(resolveGymId(), 'kupan')
assert.equal(resolveGymId({ explicitId: 'fittest', hostname: 'kupan-box-app.vercel.app' }), 'fittest')
assert.equal(findGymIdByHostname('www.fittest.cl'), 'fittest')
assert.equal(findGymIdByHostname('kupan-box-app.vercel.app'), 'kupan')
assert.throws(() => getGymConfig('no-existe'), /desconocida/)

assert.equal(gymConfigs.fittest.theme.background, '#000000')
assert.equal(gymConfigs.fittest.theme.text, '#FFFFFF')
assert.equal(gymConfigs.fittest.theme.border, '#E31B23')
assert.equal(gymConfigs.fittest.features.wod, false)
assert.equal(gymConfigs.fittest.features.reservations, true)
assert.equal(gymConfigs.fittest.features.notifications, true)
assert.equal(gymConfigs.kupan.operations.cancellationWindowMinutes, 45)
assert.equal(gymConfigs.fittest.operations.cancellationWindowMinutes, 30)
assert.equal(gymConfigs.kupan.operations.membershipRenewalReminderDays, 3)
assert.equal(gymConfigs.fittest.operations.membershipRenewalReminderDays, 3)
assert.equal(gymConfigs.fittest.operations.defaultClassCapacity, 15)
assert.notEqual(gymConfigs.kupan.assets.logo, gymConfigs.fittest.assets.logo)
assert.notEqual(gymConfigs.kupan.domains.production, gymConfigs.fittest.domains.production)

console.log('gymConfig tests passed')
