import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const formNames = [
  'AdminWodForm.jsx',
  'AdminScheduleForm.jsx',
  'AdminCommunityPostForm.jsx',
  'AdminSettingsForm.jsx',
  'AdminManualReservationForm.jsx',
  'AdminPlanForm.jsx',
  'AdminMembershipActivationForm.jsx',
  'AdminMembershipEditForm.jsx',
  'AdminCreateStudentForm.jsx',
]

const forbiddenPatterns = [
  /from ['"].*supabase/,
  /getCurrentSupabaseUser/,
  /adminReserveForStudent/,
  /useAdminData/,
  /useAdminFeedback/,
  /\.rpc\s*\(/,
  /\.from\s*\(/,
  /defaultValue=/,
]

const requiredSnippets = {
  'AdminWodForm.jsx': ['value={draft.date}', 'label="Warm up"', 'label="Skill / Strength"', 'label="WOD"', 'onSubmit={onSubmit}', 'disabled={isDisabled}'],
  'AdminScheduleForm.jsx': ['value={draft.day_of_week}', 'value={draft.time}', 'checked={draft.active}', 'onSubmit={onSubmit}', 'disabled={isDisabled}'],
  'AdminCommunityPostForm.jsx': ['value={draft.type}', 'value={draft.title}', 'checked={draft.active}', 'onSubmit={onSubmit}', 'disabled={isDisabled}'],
  'AdminSettingsForm.jsx': ['value={draft.homeEyebrow}', "onTextChange('homeEyebrow', value)", 'value={draft.communityPhrase}', 'onSubmit={onSubmit}'],
  'AdminManualReservationForm.jsx': ['value={draft.class_schedule_id}', 'value={draft.profile_id}', 'checked={draft.allow_without_membership}', 'ref={formRef}', 'onSubmit={onSubmit}'],
  'AdminPlanForm.jsx': ['value={draft.name}', 'value={draft.price}', 'checked={draft.is_unlimited}', 'checked={draft.active}', 'onSubmit={onSubmit}'],
  'AdminMembershipActivationForm.jsx': ['ref={formRef}', 'value={draft.profile_id}', 'value={draft.plan_id}', 'getPlanTokenTotal(selectedPlan)', 'onSubmit={onSubmit}'],
  'AdminMembershipEditForm.jsx': ['ref={formRef}', 'value={draft.plan_id}', 'value={draft.status}', 'getPlanTokenTotal(nextPlan)', 'onSubmit={onSubmit}'],
  'AdminCreateStudentForm.jsx': ['value={draft.full_name}', 'value={draft.email}', 'value={draft.birth_date}', 'value={draft.plan_id}', 'onSubmit={onSubmit}'],
}

const formsRoot = dirname(fileURLToPath(import.meta.url))

for (const formName of formNames) {
  const source = readFileSync(join(formsRoot, formName), 'utf8')
  assert.match(source, /export function Admin.*Form/, `${formName} debe exportar un formulario admin`)
  assert.match(source, /<form[\s\S]*onSubmit=\{onSubmit\}/, `${formName} debe delegar submit al callback recibido`)

  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(source), false, `${formName} no debe consultar datos ni usar inputs no controlados`)
  }

  for (const snippet of requiredSnippets[formName]) {
    assert.equal(source.includes(snippet), true, `${formName} debe mantener ${snippet}`)
  }
}
