import assert from 'node:assert/strict'
import {
  getActiveNavId,
  getPathForPageId,
  getRouteMeta,
  primaryNavItems,
  routeAliases,
  userCanAccessRoute,
} from './routes.js'

assert.equal(primaryNavItems.length, 5, 'La navegacion principal debe tener maximo cinco items')
assert.deepEqual(primaryNavItems.map((item) => item.id), ['home', 'reservations', 'wod', 'community', 'profile'])
assert.equal(new Set(primaryNavItems.map((item) => item.path)).size, 5, 'Cada item principal debe tener ruta unica')

assert.equal(getPathForPageId('reservations'), '/reservas')
assert.equal(getPathForPageId('prs'), '/mis-pr')
assert.equal(getPathForPageId('unknown'), '/')

assert.equal(getActiveNavId('/mis-pr'), 'wod')
assert.equal(getActiveNavId('/wod/pr'), 'wod')
assert.equal(getActiveNavId('/ranking'), 'community')
assert.equal(getActiveNavId('/comunidad/ranking'), 'community')
assert.equal(getActiveNavId('/admin'), 'profile')
assert.equal(getActiveNavId('/coach'), 'profile')

for (const alias of routeAliases) {
  assert.notEqual(alias.from, alias.to, `Alias ${alias.from} no debe apuntarse a si mismo`)
  assert.ok(getRouteMeta(alias.to), `Alias ${alias.from} debe apuntar a una ruta conocida`)
}

const adminRoute = getRouteMeta('/admin')
const coachRoute = getRouteMeta('/coach')
assert.equal(userCanAccessRoute(adminRoute, null), false)
assert.equal(userCanAccessRoute(adminRoute, { role: 'student', status: 'active' }), false)
assert.equal(userCanAccessRoute(adminRoute, { role: 'coach', status: 'active' }), false)
assert.equal(userCanAccessRoute(adminRoute, { role: 'admin' }), false)
assert.equal(userCanAccessRoute(adminRoute, { role: 'admin', status: 'inactive' }), false)
assert.equal(userCanAccessRoute(adminRoute, { role: 'admin', status: 'active' }), true)
assert.equal(userCanAccessRoute(coachRoute, { role: 'coach', status: 'active' }), true)
assert.equal(userCanAccessRoute(coachRoute, { role: 'admin', status: 'active' }), true)
assert.equal(userCanAccessRoute(coachRoute, { role: 'student', status: 'active' }), false)
