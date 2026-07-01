import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const dryRun = process.argv.includes('--dry-run')
const registryArg = process.argv.find((arg) => arg.startsWith('--registry='))
const registryPath = registryArg ? resolve(projectRoot, registryArg.split('=')[1]) : ''
const reportPath = resolve(projectRoot, 'docs/e2e-resource-cleanup-report.md')
const stagingConfirmationValue = 'I_CONFIRM_THIS_IS_NOT_PRODUCTION'
const productionIndicators = ['prod', 'production', 'kupan.cl', 'www.']

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

function maskUrl(url = '') {
  if (!url) return 'no configurada'
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname.replace(/^([^.]{3}).*/, '$1***')}${parsed.port ? `:${parsed.port}` : ''}`
  } catch {
    return 'url invalida'
  }
}

function readRegistry() {
  if (!registryPath) return {}
  if (!existsSync(registryPath)) throw new Error(`No existe registry: ${registryPath}`)
  return JSON.parse(readFileSync(registryPath, 'utf8'))
}

function validateResource(resource, prefix) {
  const values = [resource?.id, resource?.label, resource?.name, resource?.title, resource?.email, resource?.prefix]
  return values.some((value) => String(value || '').toLowerCase().includes(prefix.toLowerCase()))
}

function summarize(registry, prefix) {
  const entries = Object.entries(registry)
  return entries.map(([type, resources]) => {
    const safeResources = Array.isArray(resources) ? resources : []
    const invalid = safeResources.filter((resource) => !validateResource(resource, prefix))
    return {
      type,
      count: safeResources.length,
      ids: safeResources.map((resource) => String(resource.id || resource.label || '').slice(0, 12)).filter(Boolean),
      invalid: invalid.length,
    }
  })
}

loadLocalEnv()

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:5177'
const prefix = process.env.E2E_TEST_PREFIX || 'kupan-e2e'
const allowMutations = process.env.E2E_ALLOW_MUTATIONS === 'true'
const stagingConfirmed = process.env.E2E_STAGING_CONFIRMATION === stagingConfirmationValue
const looksProduction = productionIndicators.some((indicator) => baseUrl.toLowerCase().includes(indicator))
const registry = readRegistry()
const summary = summarize(registry, prefix)
const invalidCount = summary.reduce((total, item) => total + item.invalid, 0)
const totalResources = summary.reduce((total, item) => total + item.count, 0)
const canDelete = allowMutations && stagingConfirmed && !looksProduction && invalidCount === 0

if (!dryRun) {
  throw new Error('Cleanup destructivo deshabilitado: falta handler autorizado por UI/RPC/Edge Function de staging.')
}

const report = `# Reporte Cleanup E2E KUPAN

Fecha: ${new Date().toISOString()}

## Entorno

- Modo: dry-run
- URL app: ${maskUrl(baseUrl)}
- Prefijo: ${prefix}
- Mutaciones solicitadas: ${allowMutations ? 'si' : 'no'}
- Staging confirmado: ${stagingConfirmed ? 'si' : 'no'}
- Parece produccion: ${looksProduction ? 'si' : 'no'}
- Cleanup destructivo permitido: ${canDelete ? 'si, pero sin handler destructivo configurado' : 'no'}

## Recursos candidatos

${summary.length ? summary.map((item) => `- ${item.type}: ${item.count} recurso(s), invalidos: ${item.invalid}, ids parciales: ${item.ids.join(', ') || 'sin ids'}`).join('\n') : '- No se entrego registry de recursos E2E.'}

## Resultado

- Recursos creados: ${totalResources}
- Recursos eliminados: 0
- Recursos pendientes: ${totalResources}
- Errores de validacion: ${invalidCount}
- Accion manual requerida: ${totalResources ? 'revisar registry y ejecutar cleanup autorizado fuera del frontend' : 'ninguna'}
`

writeFileSync(reportPath, report)
console.log(`Cleanup dry-run KUPAN: ${totalResources} recurso(s), ${invalidCount} invalido(s), reporte docs/e2e-resource-cleanup-report.md`)
