import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = process.cwd()
const stagingConfirmationValue = 'I_CONFIRM_THIS_IS_NOT_PRODUCTION'
const productionIndicators = ['prod', 'production', 'kupan.cl', 'www.']
const requiredKeys = [
  'E2E_BASE_URL',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_COACH_EMAIL',
  'E2E_COACH_PASSWORD',
  'E2E_STUDENT_EMAIL',
  'E2E_STUDENT_PASSWORD',
  'E2E_ALLOW_MUTATIONS',
  'E2E_TEST_PREFIX',
]

function loadLocalEnv() {
  const envPath = resolve(projectRoot, '.env.e2e')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function listFiles(path) {
  if (!existsSync(path)) return []
  if (statSync(path).isFile()) return [path]
  return readdirSync(path).flatMap((entry) => listFiles(resolve(path, entry)))
}

function isIgnored(pattern) {
  return readText(resolve(projectRoot, '.gitignore'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .includes(pattern)
}

function maskUrl(value) {
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.hostname.replace(/^([^.]{3}).*/, '$1***')}${url.port ? `:${url.port}` : ''}`
  } catch {
    return 'url invalida'
  }
}

function validateUrl(rawUrl, errors) {
  if (!rawUrl) return null
  try {
    return new URL(rawUrl)
  } catch {
    errors.push('E2E_BASE_URL no es una URL valida')
    return null
  }
}

function frontendHasServiceRole() {
  const files = ['src', 'public', 'index.html', 'vite.config.js']
  return files
    .flatMap((entry) => listFiles(resolve(projectRoot, entry)))
    .filter((file) => !/\.test\.[jt]sx?$/.test(file))
    .some((file) => /service_role|SERVICE_ROLE|SUPABASE_SERVICE/i.test(readText(file)))
}

async function checkRoute(baseUrl, route, errors) {
  try {
    const response = await fetch(new URL(route, baseUrl), { redirect: 'manual' })
    if (response.status >= 500) errors.push(`${route} responde con estado ${response.status}`)
  } catch {
    errors.push(`${route} no responde`)
  }
}

loadLocalEnv()

const errors = []
const warnings = []
const missing = requiredKeys.filter((key) => !process.env[key])
const allowMutations = process.env.E2E_ALLOW_MUTATIONS
const baseUrl = process.env.E2E_BASE_URL
const parsedUrl = validateUrl(baseUrl, errors)
const looksProduction = Boolean(baseUrl && productionIndicators.some((indicator) => baseUrl.toLowerCase().includes(indicator)))

for (const key of missing) errors.push(`Missing: ${key}`)
if (allowMutations && !['true', 'false'].includes(allowMutations)) errors.push('E2E_ALLOW_MUTATIONS debe ser true o false')
if (allowMutations === 'true') {
  errors.push('E2E_ALLOW_MUTATIONS debe mantenerse false durante la validacion autenticada de staging')
  if (process.env.E2E_STAGING_CONFIRMATION !== stagingConfirmationValue) {
    errors.push(`Mutation tests: BLOCKED, falta E2E_STAGING_CONFIRMATION=${stagingConfirmationValue}`)
  }
}
if (looksProduction) errors.push('E2E_BASE_URL parece produccion')
if (!isIgnored('.env.e2e')) errors.push('.env.e2e no esta en .gitignore')
if (!isIgnored('playwright/.auth/')) errors.push('playwright/.auth/ no esta en .gitignore')
if (frontendHasServiceRole()) errors.push('service_role o SERVICE_ROLE aparece en frontend')

if (parsedUrl && !looksProduction) {
  await checkRoute(baseUrl, '/', errors)
  await checkRoute(baseUrl, '/login', errors)
} else if (!parsedUrl) {
  warnings.push('No se pudo comprobar respuesta de la app porque falta URL valida')
}

const authenticatedEnabled = requiredKeys.every((key) => process.env[key]) && errors.every((error) => !error.startsWith('Missing:'))
const mutationsEnabled = false

if (errors.length) {
  console.log('E2E environment validation: FAILED')
  console.log(`App URL: ${baseUrl ? maskUrl(baseUrl) : 'missing'}`)
  console.log(`Authenticated tests: ${authenticatedEnabled ? 'ENABLED' : 'DISABLED'}`)
  console.log(`Mutation tests: ${mutationsEnabled ? 'ENABLED' : 'BLOCKED'}`)
  for (const error of errors) console.log(error)
  for (const warning of warnings) console.log(`Warning: ${warning}`)
  process.exit(1)
}

console.log('E2E environment validation: PASSED')
console.log(`App URL: ${maskUrl(baseUrl)}`)
console.log(`Authenticated tests: ${authenticatedEnabled ? 'ENABLED' : 'DISABLED'}`)
console.log(`Mutation tests: ${mutationsEnabled ? 'ENABLED' : 'DISABLED'}`)
