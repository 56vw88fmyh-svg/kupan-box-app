/* global URL */
import assert from 'node:assert/strict'
import { safeReturnTo, destinationFor, loginDestination } from './flowContext.js'
assert.equal(destinationFor('my-plan'),'/perfil?tab=membership')
assert.equal(destinationFor('result'),'/wod?action=result')
assert.equal(destinationFor('reservations',{date:'2026-11-04'}),'/reservas?date=2026-11-04')
assert.equal(safeReturnTo('/reservas?date=2026-11-04'),'/reservas?date=2026-11-04')
for(const value of ['https://evil.test','//evil.test','/\\evil','/login?returnTo=/admin','javascript:alert(1)','/%2f%2fevil.test']) assert.equal(safeReturnTo(value),'/')
assert.equal(new URL('https://local.test'+loginDestination('/wod?action=result')).searchParams.get('returnTo'),'/wod?action=result')
