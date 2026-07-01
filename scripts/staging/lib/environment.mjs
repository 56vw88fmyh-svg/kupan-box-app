import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

export const stagingConfirmationValue = 'I_CONFIRM_THIS_IS_A_DISPOSABLE_STAGING_ENVIRONMENT'
export const defaultPrefix = 'kupan-e2e'
export const productionIndicators = ['prod', 'production', 'kupan.cl', 'www.']

export const requiredAdminVariables = [
  'STAGING_SUPABASE_URL',
  'STAGING_SUPABASE_SERVICE_ROLE_KEY',
  'STAGING_PROJECT_REF',
  'PRODUCTION_PROJECT_REF',
  'STAGING_CONFIRMATION',
  'E2E_TEST_PREFIX',
]

export const userVariables = [
  'STAGING_ADMIN_EMAIL',
  'STAGING_ADMIN_PASSWORD',
  'STAGING_COACH_EMAIL',
  'STAGING_COACH_PASSWORD',
  'STAGING_STUDENT_EMAIL',
  'STAGING_STUDENT_PASSWORD',
]

export function loadEnvFile(file = '.env.staging.local') {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

export function mask(value = '') {
  const text = String(value)
  if (text.length <= 8) return text ? `${text.slice(0, 2)}…` : 'missing'
  return `${text.slice(0, 4)}…${text.slice(-4)}`
}

export function maskUrl(rawUrl = '') {
  try {
    const url = new URL(rawUrl)
    return `${url.protocol}//${mask(url.hostname)}${url.port ? `:${url.port}` : ''}`
  } catch {
    return rawUrl ? 'invalid-url' : 'missing'
  }
}

export function getEnvironment({ requireUsers = false } = {}) {
  loadEnvFile()
  const missing = [...requiredAdminVariables, ...(requireUsers ? userVariables : [])].filter((key) => !process.env[key])
  const errors = []
  const stagingUrl = process.env.STAGING_SUPABASE_URL || ''
  const appUrl = process.env.STAGING_APP_URL || ''
  const stagingRef = process.env.STAGING_PROJECT_REF || ''
  const productionRef = process.env.PRODUCTION_PROJECT_REF || ''
  const prefix = process.env.E2E_TEST_PREFIX || ''

  for (const key of missing) errors.push(`Missing: ${key}`)
  if (process.env.STAGING_CONFIRMATION && process.env.STAGING_CONFIRMATION !== stagingConfirmationValue) {
    errors.push(`STAGING_CONFIRMATION debe ser ${stagingConfirmationValue}`)
  }
  if (stagingRef && productionRef && stagingRef === productionRef) {
    errors.push('STAGING_PROJECT_REF debe ser diferente de PRODUCTION_PROJECT_REF')
  }
  if (prefix && prefix !== defaultPrefix) errors.push(`E2E_TEST_PREFIX debe ser ${defaultPrefix}`)

  let parsedStagingUrl = null
  if (stagingUrl) {
    try {
      parsedStagingUrl = new URL(stagingUrl)
    } catch {
      errors.push('STAGING_SUPABASE_URL no es una URL valida')
    }
  }

  const looksProduction = [stagingUrl, appUrl, stagingRef]
    .filter(Boolean)
    .some((value) => productionIndicators.some((indicator) => String(value).toLowerCase().includes(indicator)))
  if (looksProduction) errors.push('El entorno parece produccion')

  return {
    appUrl,
    errors,
    isValid: errors.length === 0,
    missing,
    prefix,
    productionRef,
    parsedStagingUrl,
    serviceRoleKey: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || '',
    stagingRef,
    stagingUrl,
    destructiveAllowed:
      errors.length === 0 &&
      process.env.STAGING_CONFIRMATION === stagingConfirmationValue &&
      stagingRef &&
      productionRef &&
      stagingRef !== productionRef &&
      prefix === defaultPrefix &&
      !looksProduction,
  }
}

export function createAdminClient(environment = getEnvironment()) {
  if (!environment.stagingUrl || !environment.serviceRoleKey) return null
  return createClient(environment.stagingUrl, environment.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function listFiles(path) {
  if (!existsSync(path)) return []
  if (statSync(path).isFile()) return [path]
  return readdirSync(path).flatMap((entry) => listFiles(resolve(path, entry)))
}

export function frontendHasServiceRole(projectRoot = process.cwd()) {
  return ['src', 'public', 'index.html', 'vite.config.js']
    .flatMap((entry) => listFiles(resolve(projectRoot, entry)))
    .filter((file) => !/\.test\.[jt]sx?$/.test(file))
    .some((file) => /service_role|SERVICE_ROLE|SUPABASE_SERVICE/i.test(readFileSync(file, 'utf8')))
}

export async function checkHttp(url) {
  if (!url) return { ok: false, status: 'missing' }
  try {
    const response = await fetch(url, { redirect: 'manual' })
    return { ok: response.status < 500, status: response.status }
  } catch {
    return { ok: false, status: 'unreachable' }
  }
}

export function printEnvironmentResult({ title, environment, extraErrors = [] }) {
  const errors = [...environment.errors, ...extraErrors]
  if (errors.length) {
    console.log(`${title}: INVALID`)
    console.log('Missing or invalid variables:')
    for (const error of errors) console.log(`- ${error}`)
    console.log('Destructive commands: BLOCKED')
    return false
  }
  console.log(`${title}: VALID`)
  console.log(`Project ref: ${mask(environment.stagingRef)}`)
  console.log('Production ref differs: YES')
  console.log('Administrative connection: AVAILABLE')
  console.log('Destructive commands: BLOCKED until --dry-run is reviewed')
  return true
}
