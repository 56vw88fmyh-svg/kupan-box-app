import { existsSync, readFileSync } from 'node:fs'
import { createAdminClient, frontendHasServiceRole, getEnvironment, mask, maskUrl, printEnvironmentResult } from './lib/environment.mjs'

function isIgnored(pattern) {
  if (!existsSync('.gitignore')) return false
  return readFileSync('.gitignore', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .includes(pattern)
}

const environment = getEnvironment()
const errors = []

if (!isIgnored('.env.staging.local')) errors.push('.env.staging.local no esta en .gitignore')
if (!isIgnored('.staging-e2e-resources.json')) errors.push('.staging-e2e-resources.json no esta en .gitignore')
if (frontendHasServiceRole()) errors.push('service_role aparece en frontend empaquetable')

if (environment.stagingUrl && environment.stagingRef && !environment.stagingUrl.includes(environment.stagingRef)) {
  errors.push('STAGING_SUPABASE_URL no parece contener STAGING_PROJECT_REF')
}

let adminAvailable = false
if (!environment.errors.length) {
  const supabase = createAdminClient(environment)
  const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  adminAvailable = !error
  if (error) errors.push('Conexion administrativa Supabase no disponible')
}

const ok = printEnvironmentResult({ title: 'Staging environment', environment, extraErrors: errors })
console.log(`Supabase URL: ${maskUrl(environment.stagingUrl)}`)
console.log(`Project ref: ${mask(environment.stagingRef)}`)
console.log(`Administrative connection: ${adminAvailable ? 'AVAILABLE' : 'BLOCKED'}`)

process.exit(ok ? 0 : 1)
