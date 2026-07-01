import { createAdminClient, getEnvironment } from './lib/environment.mjs'
import { readManifest, validateManifest, writeManifest } from './resource-manifest.mjs'

const dryRun = process.argv.includes('--dry-run')
const environment = getEnvironment()
const manifest = readManifest(environment)
const validation = validateManifest(manifest, environment)

if (!environment.isValid) {
  console.log('Reset E2E data: BLOCKED')
  for (const error of environment.errors) console.log(`- ${error}`)
  process.exit(1)
}
if (!validation.ok) {
  console.log('Reset E2E data: BLOCKED, manifest invalido')
  for (const error of validation.errors) console.log(`- ${error}`)
  process.exit(1)
}

const order = [
  ['reservations', 'reservations'],
  ['tokenMovements', 'membership_token_movements'],
  ['memberships', 'memberships'],
  ['schedules', 'class_schedule'],
  ['plans', 'plans'],
  ['posts', 'community_posts'],
  ['wodDates', 'wod'],
  ['profiles', 'profiles'],
]

if (dryRun) {
  console.log('Reset E2E data dry-run: OK')
  for (const [type] of order) console.log(`- ${type}: ${manifest.resources[type]?.length || 0} registered`)
  console.log(`- authUsers: ${manifest.resources.authUsers?.length || 0} registered`)
  process.exit(0)
}

const supabase = createAdminClient(environment)
const remaining = []

async function deleteTableResource(type, table, resource) {
  if (type === 'wodDates') {
    const { error } = await supabase.from(table).delete().eq('date', resource.reference || resource.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from(table).delete().eq('id', resource.id)
  if (error) throw error
}

for (const [type, table] of order) {
  for (const resource of manifest.resources[type] || []) {
    try {
      await deleteTableResource(type, table, resource)
      resource.cleanupStatus = 'deleted'
      console.log(`${type} ${String(resource.id).slice(0, 8)}: DELETED_OR_ABSENT`)
    } catch (error) {
      resource.cleanupStatus = 'pending'
      remaining.push({ type, id: resource.id, error: error.message })
      console.log(`${type} ${String(resource.id).slice(0, 8)}: PENDING`)
    }
  }
}

for (const resource of manifest.resources.authUsers || []) {
  try {
    const { error } = await supabase.auth.admin.deleteUser(resource.id)
    if (error) throw error
    resource.cleanupStatus = 'deleted'
    console.log(`authUsers ${String(resource.id).slice(0, 8)}: DELETED_OR_ABSENT`)
  } catch (error) {
    resource.cleanupStatus = 'pending'
    remaining.push({ type: 'authUsers', id: resource.id, error: error.message })
    console.log(`authUsers ${String(resource.id).slice(0, 8)}: PENDING`)
  }
}

writeManifest(manifest)
console.log(`Reset E2E data: ${remaining.length ? 'PENDING_RESOURCES' : 'OK'}`)
process.exit(remaining.length ? 1 : 0)
