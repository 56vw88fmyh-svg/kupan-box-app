import assert from 'node:assert/strict'
import { adminNavigationModules, getAdminModuleId, getAdminNavigationItemIds } from '../config/adminNavigation.js'
import {
  createEmptyManualReservationDraft,
  createEmptyMembershipDraft,
  createEmptyMembershipEditDraft,
  createEmptyPlanDraft,
  createEmptyPostDraft,
  createEmptyScheduleDraft,
  createEmptyStudentDraft,
  createEmptyWodDraft,
  studentFilters,
  weekdayLabels,
} from '../constants/adminConstants.js'
import { formatDate, formatMoney, getChileDateString, getDateTimeValue, toTime } from './adminFormatters.js'
import { addDays, calculateDaysBetween, getChileDayOfWeek, getMembershipTokens, getPlanTokenTotal } from './adminMetrics.js'

function testNavigationModules() {
  assert.equal(getAdminModuleId('overview'), 'inicio')
  assert.equal(getAdminModuleId('reservations'), 'clases')
  assert.equal(getAdminModuleId('wod'), 'entrenamientos')
  assert.equal(getAdminModuleId('students'), 'alumnos')
  assert.equal(getAdminModuleId('plans'), 'planes-pagos')
  assert.equal(getAdminModuleId('community'), 'comunicaciones')
  assert.equal(getAdminModuleId('texts'), 'configuracion')
  assert.equal(getAdminModuleId('unknown-section'), 'inicio')

  const ids = getAdminNavigationItemIds()
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(adminNavigationModules.map((module) => module.id), [
    'inicio',
    'clases',
    'entrenamientos',
    'alumnos',
    'planes-pagos',
    'comunicaciones',
    'configuracion',
  ])
}

function testInitialDraftFactories() {
  const firstPlan = createEmptyPlanDraft()
  const secondPlan = createEmptyPlanDraft()
  firstPlan.name = 'Cambio local'
  assert.equal(secondPlan.name, '')

  const firstWod = createEmptyWodDraft()
  const secondWod = createEmptyWodDraft()
  firstWod.warmup = 'No compartir referencia'
  assert.equal(secondWod.warmup, '')

  assert.deepEqual(Object.keys(createEmptyMembershipDraft()), [
    'profile_id',
    'plan_id',
    'start_date',
    'end_date',
    'status',
    'classes_total',
    'classes_used',
    'payment_status',
    'payment_provider',
    'payment_reference',
    'notes',
  ])
  assert.equal(createEmptyMembershipDraft().status, 'active')
  assert.equal(createEmptyMembershipDraft().payment_status, 'paid')
  assert.equal(createEmptyMembershipEditDraft().classes_used, 0)
  assert.equal(createEmptyScheduleDraft().max_spots, 12)
  assert.equal(createEmptyPostDraft().type, 'noticia')
  assert.equal(createEmptyStudentDraft().level, 'Iniciado')
  assert.equal(createEmptyManualReservationDraft().allow_without_membership, false)
  assert.equal(studentFilters[0].id, 'all')
  assert.equal(weekdayLabels[6], 'Sabado')
}

function testDateFormatters() {
  assert.equal(formatDate(null), 'Sin fecha')
  assert.equal(formatDate('fecha-mala'), 'Sin fecha')
  assert.match(formatDate('2026-06-30'), /2026/)
  assert.equal(getChileDateString(new Date('2026-07-01T02:00:00.000Z')), '2026-06-30')
  assert.equal(getChileDateString(new Date('2026-07-01T12:00:00.000Z')), '2026-07-01')
  assert.equal(toTime('18:30:00'), '18:30')
  assert.equal(toTime(null), '')
  assert.equal(getDateTimeValue('2026-06-30', '18:30:00'), '2026-06-30T18:30')
}

function testMoneyFormatters() {
  assert.equal(formatMoney(0), '$0')
  assert.equal(formatMoney(null), '$0')
  assert.equal(formatMoney(30000), '$30.000')
  assert.equal(formatMoney(30000.8), '$30.001')
}

function testMetrics() {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29')
  assert.equal(addDays('2026-01-31', 1), '2026-02-01')
  assert.equal(addDays('fecha-mala', 1), '')
  assert.equal(calculateDaysBetween('2026-06-01', '2026-07-01'), 30)
  assert.equal(calculateDaysBetween('fecha-mala', '2026-07-01'), 999)
  assert.equal(getChileDayOfWeek(new Date('2026-07-01T02:00:00.000Z')), 2)
  assert.equal(getChileDayOfWeek(new Date('2026-07-04T15:00:00.000Z')), 6)

  assert.equal(getPlanTokenTotal(null), '')
  assert.equal(getPlanTokenTotal({ name: 'Full', is_unlimited: true }), '')
  assert.equal(getPlanTokenTotal({ name: '16 clases', is_unlimited: false }), 16)
  assert.equal(getPlanTokenTotal({ name: 'Plan semanal', is_unlimited: false, classes_per_week: 3 }), 12)

  assert.deepEqual(getMembershipTokens({ plan: { is_unlimited: true }, classes_total: null, classes_used: 8 }), {
    total: 'Ilimitado',
    used: 'No descuenta',
    remaining: 'Ilimitado',
  })
  assert.deepEqual(getMembershipTokens({ plan: { is_unlimited: false }, classes_total: 16, classes_used: 5 }), {
    total: 16,
    used: 5,
    remaining: 11,
  })
  assert.deepEqual(getMembershipTokens({ plan: { is_unlimited: false }, classes_total: 4, classes_used: 9 }), {
    total: 4,
    used: 9,
    remaining: 0,
  })
  assert.deepEqual(getMembershipTokens(null), {
    total: 0,
    used: 0,
    remaining: 0,
  })
}

testNavigationModules()
testInitialDraftFactories()
testDateFormatters()
testMoneyFormatters()
testMetrics()
