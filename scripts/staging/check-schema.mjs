import { writeFileSync } from 'node:fs'
import { createAdminClient, getEnvironment, mask } from './lib/environment.mjs'

const requiredTables = [
  'profiles',
  'plans',
  'memberships',
  'class_schedule',
  'reservations',
  'wod',
  'community_posts',
  'app_settings',
  'personal_records',
  'membership_token_movements',
  'notifications',
]

const requiredRpc = [
  'is_admin',
  'get_my_profile',
  'admin_get_profiles',
  'admin_get_plans',
  'admin_get_memberships',
  'admin_get_reservations',
  'admin_get_wod',
  'admin_get_schedule',
  'admin_get_community_posts',
  'admin_get_app_settings',
  'admin_get_personal_records',
  'admin_get_token_movements',
  'get_active_membership',
  'membership_remaining_tokens',
  'reserve_class',
  'cancel_reservation',
  'admin_activate_membership',
  'admin_update_membership',
  'admin_renew_membership',
  'admin_adjust_tokens',
  'admin_extend_membership',
  'admin_reserve_for_student',
  'coach_get_day_reservations',
  'admin_mark_reservation',
  'birthdays_this_month',
  'get_public_todays_wod',
  'get_public_pr_ranking',
]

async function tableExists(supabase, table) {
  const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  return !error
}

async function rpcExists(supabase, rpcName) {
  const { error } = await supabase.rpc(rpcName)
  if (!error) return true
  const message = String(error.message || '')
  return !message.includes('Could not find the function') && !message.includes('function') ? true : false
}

const environment = getEnvironment()
const report = {
  date: new Date().toISOString(),
  projectRef: mask(environment.stagingRef),
  tables: [],
  rpc: [],
  rls: [],
  status: 'BLOCKED',
}

if (!environment.isValid) {
  console.log('Schema check: BLOCKED')
  for (const error of environment.errors) console.log(`- ${error}`)
  writeFileSync('docs/staging-schema-validation.md', `# Validacion Esquema Staging\n\nFecha: ${report.date}\n\nEstado: BLOQUEADO\n\n${environment.errors.map((error) => `- ${error}`).join('\n')}\n`)
  process.exit(1)
}

const supabase = createAdminClient(environment)

for (const table of requiredTables) {
  const ok = await tableExists(supabase, table)
  report.tables.push({ name: table, status: ok ? 'OK' : 'MISSING' })
}

for (const rpcName of requiredRpc) {
  const ok = await rpcExists(supabase, rpcName)
  report.rpc.push({ name: rpcName, status: ok ? 'OK_OR_PERMISSION_BLOCKED' : 'MISSING' })
}

report.status = report.tables.every((item) => item.status === 'OK') ? 'COMPLETE_OR_PARTIAL_RPC' : 'INCOMPLETE'

const markdown = `# Validacion Esquema Staging

Fecha: ${report.date}

Estado: ${report.status}

## Tables

${report.tables.map((item) => `- ${item.name}: ${item.status}`).join('\n')}

## RPC

${report.rpc.map((item) => `- ${item.name}: ${item.status}`).join('\n')}

## RLS

La verificacion directa de RLS requiere consultas a catalogos expuestos o SQL administrativo. No se modifica el esquema desde este script.
`

writeFileSync('docs/staging-schema-validation.md', markdown)
console.log('KUPAN STAGING SCHEMA')
for (const item of report.tables) console.log(`Table ${item.name}: ${item.status}`)
for (const item of report.rpc) console.log(`RPC ${item.name}: ${item.status}`)
process.exit(report.tables.some((item) => item.status === 'MISSING') ? 1 : 0)
