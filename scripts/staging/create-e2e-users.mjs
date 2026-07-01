import { createAdminClient, getEnvironment, userVariables } from './lib/environment.mjs'
import { registerResource } from './resource-manifest.mjs'

const dryRun = process.argv.includes('--dry-run')
const roles = [
  { key: 'ADMIN', fullName: 'KUPAN E2E ADMIN', role: 'admin' },
  { key: 'COACH', fullName: 'KUPAN E2E COACH', role: 'coach' },
  { key: 'STUDENT', fullName: 'KUPAN E2E STUDENT', role: 'student' },
]

const environment = getEnvironment({ requireUsers: true })
if (!environment.isValid) {
  console.log('Create E2E users: BLOCKED')
  for (const error of environment.errors) console.log(`- ${error}`)
  process.exit(1)
}
if (process.env.STAGING_SCHEMA_VALIDATED !== 'true') {
  console.log('Create E2E users: BLOCKED')
  console.log('- STAGING_SCHEMA_VALIDATED debe ser true')
  process.exit(1)
}

const missingUsers = userVariables.filter((key) => !process.env[key])
if (missingUsers.length) {
  console.log('Create E2E users: BLOCKED')
  for (const key of missingUsers) console.log(`- Missing: ${key}`)
  process.exit(1)
}

if (dryRun) {
  console.log('Create E2E users dry-run: OK')
  for (const role of roles) console.log(`- ${role.fullName}: WOULD_CREATE_OR_REUSE`)
  process.exit(0)
}

const supabase = createAdminClient(environment)

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < 100) return null
  }
  return null
}

for (const role of roles) {
  const email = process.env[`STAGING_${role.key}_EMAIL`]
  const password = process.env[`STAGING_${role.key}_PASSWORD`]
  const existing = await findUserByEmail(email)
  const user = existing || (await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: role.fullName,
      level: 'Iniciado',
      birth_date: '1990-01-01',
    },
  })).data.user

  const profilePayload = {
    id: user.id,
    full_name: role.fullName,
    email,
    role: role.role,
    status: 'active',
    level: 'Iniciado',
    birth_date: '1990-01-01',
  }
  const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })
  if (profileError) throw profileError

  registerResource('authUsers', { id: user.id, email, name: role.fullName }, environment)
  registerResource('profiles', { id: user.id, email, name: role.fullName }, environment)
  console.log(`${role.fullName}: ${existing ? 'REUSED' : 'CREATED'}`)
}
