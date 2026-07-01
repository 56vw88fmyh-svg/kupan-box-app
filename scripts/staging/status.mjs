import { createAdminClient, getEnvironment, mask } from './lib/environment.mjs'
import { readManifest, summarizeManifest } from './resource-manifest.mjs'

async function countByPrefix(supabase, table, column, prefix) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).ilike(column, `%${prefix}%`)
  if (error) return { status: 'UNKNOWN', count: 0 }
  return { status: 'OK', count: count || 0 }
}

const environment = getEnvironment()
const manifest = readManifest(environment)

console.log('KUPAN STAGING STATUS')
console.log(`Environment: ${environment.isValid ? 'VALID' : 'INVALID'}`)
console.log(`Project: ${mask(environment.stagingRef)}`)
console.log(`Mutation Playwright: BLOCKED`)

if (!environment.isValid) {
  for (const error of environment.errors) console.log(`- ${error}`)
  process.exit(1)
}

const supabase = createAdminClient(environment)
const profiles = await countByPrefix(supabase, 'profiles', 'full_name', 'KUPAN E2E')
const plans = await countByPrefix(supabase, 'plans', 'name', 'KUPAN E2E')
const posts = await countByPrefix(supabase, 'community_posts', 'title', 'KUPAN E2E')

console.log(`E2E profiles: ${profiles.status} (${profiles.count})`)
console.log(`E2E plans: ${plans.status} (${plans.count})`)
console.log(`E2E posts: ${posts.status} (${posts.count})`)
console.log(`Manifest resources: ${summarizeManifest(manifest).reduce((total, item) => total + item.count, 0)}`)
console.log('Authenticated Playwright:', profiles.count >= 3 ? 'READY_CANDIDATE' : 'BLOCKED')
console.log('Reason:', profiles.count >= 3 ? 'E2E users detected by prefix' : 'missing E2E profiles')
