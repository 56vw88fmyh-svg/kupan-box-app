import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildCommunityPostPayload,
  buildCreateStudentBody,
  buildManualReservationInput,
  buildMembershipActivationPayload,
  buildMembershipStatusPayload,
  buildMembershipUpdatePayload,
  buildPlanPayload,
  buildSchedulePayload,
} from '../../utils/adminMutationBuilders.js'

const hooksRoot = dirname(fileURLToPath(import.meta.url))
const hookFiles = [
  'useAdminWod.js',
  'useAdminSchedule.js',
  'useAdminCommunications.js',
  'useAdminSettings.js',
  'useAdminPlans.js',
  'useAdminStudents.js',
  'useAdminReservations.js',
  'useAdminMemberships.js',
]

const forbiddenHookPatterns = [
  /components\/admin/,
  /showSuccess/,
  /showError/,
  /setActivePage/,
  /scrollIntoView/,
  /window\.alert/,
]

for (const hookFile of hookFiles) {
  const source = readFileSync(join(hooksRoot, hookFile), 'utf8')
  assert.match(source, /export function useAdmin/, `${hookFile} debe exportar un hook admin`)

  for (const pattern of forbiddenHookPatterns) {
    assert.equal(pattern.test(source), false, `${hookFile} no debe controlar UI, feedback o navegación`)
  }
}

const reservationsSource = readFileSync(join(hooksRoot, '..', '..', 'pages', 'Reservations.jsx'), 'utf8')
assert.match(
  reservationsSource,
  /if \(processingClassKey === classKey\) return/,
  'Reservations debe bloquear doble ejecución al confirmar cancelación',
)
assert.match(
  reservationsSource,
  /variant="destructive"[\s\S]*disabled=\{Boolean\(cancelTarget && processingClassKey === getClassKey\(cancelTarget\)\)\}/,
  'El botón destructivo de cancelación debe quedar deshabilitado mientras procesa',
)

assert.deepEqual(buildPlanPayload({
  name: '  Full  ',
  price: '55000',
  classes_per_week: '',
  is_unlimited: true,
  active: true,
}), {
  name: 'Full',
  price: 55000,
  classes_per_week: null,
  is_unlimited: true,
  active: true,
})

assert.deepEqual(buildSchedulePayload({
  day_of_week: '3',
  time: '19:00',
  class_name: 'CrossFit',
  coach: 'Coach KUPAN',
  max_spots: '12',
  active: false,
}), {
  day_of_week: 3,
  time: '19:00',
  class_name: 'CrossFit',
  coach: 'Coach KUPAN',
  max_spots: 12,
  active: false,
})

assert.deepEqual(buildCommunityPostPayload({
  type: 'evento',
  title: 'Team WOD',
  content: 'Sábado comunitario',
  event_date: '',
  active: true,
}), {
  type: 'evento',
  title: 'Team WOD',
  content: 'Sábado comunitario',
  event_date: null,
  active: true,
})

const tokenPlan = { is_unlimited: false, classes_per_week: 4, name: '16 clases' }
const activation = buildMembershipActivationPayload({
  profile_id: 'profile-1',
  plan_id: 'plan-1',
  start_date: '2026-06-30',
  classes_total: '',
  classes_used: '5',
  payment_provider: '',
  payment_reference: 'manual-ref',
  notes: '',
}, tokenPlan, () => new Date('2026-06-30T12:00:00.000Z'))
assert.equal(activation.end_date, '2026-07-30')
assert.equal(activation.classes_total, 16)
assert.equal(activation.classes_used, 5)
assert.equal(activation.payment_provider, 'manual_admin')
assert.equal(activation.payment_reference, 'manual-ref')
assert.equal(activation.notes, null)

const unlimitedActivation = buildMembershipActivationPayload({
  profile_id: 'profile-1',
  plan_id: 'plan-full',
  start_date: '2026-06-30',
  classes_total: '99',
  classes_used: '22',
  payment_provider: '',
  payment_reference: '',
  notes: 'Full',
}, { is_unlimited: true }, () => new Date('2026-06-30T12:00:00.000Z'))
assert.equal(unlimitedActivation.classes_total, null)
assert.equal(unlimitedActivation.classes_used, 0)

assert.deepEqual(buildMembershipUpdatePayload({
  id: 'membership-1',
  plan_id: 'plan-1',
  start_date: '2026-06-30',
  status: 'active',
  payment_status: 'paid',
  payment_provider: '',
  payment_reference: '',
  notes: '',
  classes_total: '16',
  classes_used: '4',
}, tokenPlan), {
  target_membership_id: 'membership-1',
  target_plan_id: 'plan-1',
  start_date_input: '2026-06-30',
  status_input: 'active',
  payment_status_input: 'paid',
  payment_provider_input: null,
  payment_reference_input: null,
  notes_input: null,
  classes_total_input: 16,
  classes_used_input: 4,
})

assert.deepEqual(buildMembershipStatusPayload({
  id: 'membership-1',
  plan_id: 'plan-1',
  start_date: '2026-06-30',
  payment_status: 'pending',
  payment_provider: null,
  payment_reference: null,
  notes: null,
  classes_total: 16,
  classes_used: 3,
}, 'active').payment_status_input, 'paid')

assert.deepEqual(buildCreateStudentBody({
  full_name: 'Alumno KUPAN',
  email: 'alumno@kupan.cl',
  phone: '',
  birth_date: '1990-01-01',
  level: 'Rookie',
  status: 'active',
  temporary_password: '',
  internal_notes: '',
  plan_id: '',
  membership_start_date: '',
}), {
  full_name: 'Alumno KUPAN',
  email: 'alumno@kupan.cl',
  phone: null,
  birth_date: '1990-01-01',
  level: 'Rookie',
  status: 'active',
  temporary_password: null,
  internal_notes: null,
  plan_id: null,
  membership_start_date: null,
  membership_end_date: null,
})

assert.deepEqual(buildManualReservationInput({
  profile_id: 'profile-1',
  class_schedule_id: 'class-1',
  reservation_date: '2026-06-30',
  allow_without_membership: true,
  note: 'Drop in',
}), {
  profileId: 'profile-1',
  classScheduleId: 'class-1',
  reservationDate: '2026-06-30',
  allowWithoutMembership: true,
  note: 'Drop in',
})
