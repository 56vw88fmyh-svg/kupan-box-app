/* global console */
import assert from 'node:assert/strict'
import { getManualReservationError } from './manualReservationErrors.js'

for (const [message, expected] of [
  ['Clase completa.', 'completa'],
  ['El alumno ya tiene una reserva para esta clase.', 'ya está inscrito'],
  ['El alumno no tiene plan activo.', 'plan activo y pagado'],
  ['El alumno no tiene tokens disponibles.', 'tokens disponibles'],
  ['El alumno alcanzó el límite diario del plan Full.', 'límite diario'],
  ['La fecha no corresponde al horario.', 'no coincide'],
  ['La reserva está fuera del período permitido.', 'desde hoy'],
  ['El plan no está vigente para esa fecha.', 'no está vigente'],
  ['Solo admin puede reservar sin plan activo.', 'Solo un administrador'],
]) assert.ok(getManualReservationError({ code: 'P0001', message }).includes(expected))
const sensitive = 'internal relation profiles, SQL context, secret database detail'
assert.equal(getManualReservationError({ code: 'P0001', message: sensitive }).includes(sensitive), false)
assert.equal(getManualReservationError({ code: '42703', message: sensitive }).includes(sensitive), false)
assert.match(getManualReservationError({ code: '42501', message: 'permission denied for table reservations' }), /permiso/)
assert.match(getManualReservationError({ message: 'Failed to fetch' }), /internet/)
console.log('Reviewed manual booking errors, unknown SQL detail redaction and connection/permission messages OK')
