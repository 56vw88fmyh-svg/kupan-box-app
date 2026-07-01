import { createAdminClient, getEnvironment } from './lib/environment.mjs'
import { readManifest } from './resource-manifest.mjs'

const checks = [
  ['profiles', 'profiles', 'full_name'],
  ['plans', 'plans', 'name'],
  ['posts', 'community_posts', 'title'],
  ['schedules', 'class_schedule', 'class_name'],
  ['wodDates', 'wod', 'title'],
]

const environment = getEnvironment()
if (!environment.isValid) {
  console.log('Orphan audit: BLOCKED')
  for (const error of environment.errors) console.log(`- ${error}`)
  process.exit(1)
}

const supabase = createAdminClient(environment)
const manifest = readManifest(environment)
let orphanCount = 0

console.log('KUPAN E2E ORPHAN AUDIT')
for (const [type, table, column] of checks) {
  const registeredIds = new Set((manifest.resources[type] || []).map((resource) => resource.id))
  const { data, error } = await supabase.from(table).select('*').ilike(column, `%${environment.prefix}%`)
  if (error) {
    console.log(`- ${type}: UNKNOWN`)
    continue
  }
  const orphans = (data || []).filter((row) => !registeredIds.has(row.id))
  orphanCount += orphans.length
  console.log(`- ${type}: registered=${registeredIds.size} unregistered=${orphans.length}`)
}

console.log(`Unregistered E2E resources: ${orphanCount}`)
process.exit(orphanCount ? 1 : 0)
