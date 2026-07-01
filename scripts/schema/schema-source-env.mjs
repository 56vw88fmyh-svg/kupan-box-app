import { existsSync, readFileSync } from 'node:fs'

export const sourceConfirmation = 'I_CONFIRM_SCHEMA_ONLY_EXPORT'
export const productionConfirmation = 'I_AUTHORIZE_READ_ONLY_SCHEMA_EXPORT'
export const allowedSourceTypes = ['development', 'staging', 'backup', 'production']

export function loadSchemaEnv(file = '.env.schema.local') {
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
  if (!text) return 'missing'
  if (text.length <= 8) return `${text.slice(0, 2)}…`
  return `${text.slice(0, 4)}…${text.slice(-4)}`
}

export function getSchemaSourceEnvironment() {
  loadSchemaEnv()
  const errors = []
  const sourceRef = process.env.SCHEMA_SOURCE_PROJECT_REF || ''
  const sourceType = process.env.SCHEMA_SOURCE_TYPE || ''
  const sourceAuthorized = process.env.SCHEMA_SOURCE_AUTHORIZED === 'true'
  const exportConfirmation = process.env.SCHEMA_EXPORT_CONFIRMATION || ''
  const productionRef = process.env.PRODUCTION_PROJECT_REF || ''
  const databaseUrl = process.env.SCHEMA_SOURCE_DATABASE_URL || ''
  const isProduction = sourceType === 'production' || (sourceRef && productionRef && sourceRef === productionRef)

  if (!sourceRef) errors.push('Missing: SCHEMA_SOURCE_PROJECT_REF')
  if (!sourceType) errors.push('Missing: SCHEMA_SOURCE_TYPE')
  if (sourceType && !allowedSourceTypes.includes(sourceType)) errors.push(`SCHEMA_SOURCE_TYPE debe ser uno de: ${allowedSourceTypes.join(', ')}`)
  if (!sourceAuthorized) errors.push('SCHEMA_SOURCE_AUTHORIZED debe ser true')
  if (exportConfirmation !== sourceConfirmation) errors.push(`SCHEMA_EXPORT_CONFIRMATION debe ser ${sourceConfirmation}`)
  if (!productionRef) errors.push('Missing: PRODUCTION_PROJECT_REF')
  if (!databaseUrl) errors.push('Missing: SCHEMA_SOURCE_DATABASE_URL')
  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl)
      if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) errors.push('SCHEMA_SOURCE_DATABASE_URL debe ser postgres/postgresql')
    } catch {
      errors.push('SCHEMA_SOURCE_DATABASE_URL no es una URL valida')
    }
  }
  if (isProduction) {
    if (process.env.PRODUCTION_SCHEMA_EXPORT_AUTHORIZED !== 'true') errors.push('PRODUCTION_SCHEMA_EXPORT_AUTHORIZED debe ser true para fuente produccion')
    if (process.env.PRODUCTION_SCHEMA_EXPORT_CONFIRMATION !== productionConfirmation) {
      errors.push(`PRODUCTION_SCHEMA_EXPORT_CONFIRMATION debe ser ${productionConfirmation}`)
    }
  }

  return {
    databaseUrl,
    errors,
    exportConfirmation,
    isProduction,
    isValid: errors.length === 0,
    productionRef,
    sourceAuthorized,
    sourceRef,
    sourceType,
  }
}

export function printSourceGuard(environment) {
  if (!environment.isValid) {
    console.log('Schema source validation: FAILED')
    console.log('Missing or invalid:')
    for (const error of environment.errors) console.log(`- ${error}`)
    console.log('Schema export: BLOCKED')
    return false
  }
  console.log('Schema source validation: PASSED')
  console.log(`Source type: ${environment.sourceType}`)
  console.log(`Project ref: ${mask(environment.sourceRef)}`)
  console.log(`Production source: ${environment.isProduction ? 'YES, read-only authorized' : 'NO'}`)
  console.log('Operation: SCHEMA ONLY')
  return true
}
