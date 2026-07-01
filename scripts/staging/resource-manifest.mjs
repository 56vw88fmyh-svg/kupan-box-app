import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { getEnvironment, mask } from './lib/environment.mjs'

const manifestPath = '.staging-e2e-resources.json'
const resourceTypes = [
  'authUsers',
  'profiles',
  'plans',
  'memberships',
  'reservations',
  'tokenMovements',
  'schedules',
  'posts',
  'wodDates',
  'paymentReferences',
]

function emptyResources() {
  return Object.fromEntries(resourceTypes.map((type) => [type, []]))
}

export function createEmptyManifest(environment = getEnvironment()) {
  return {
    version: 1,
    environment: {
      projectRef: mask(environment.stagingRef),
      prefix: environment.prefix || 'kupan-e2e',
    },
    resources: emptyResources(),
  }
}

export function readManifest(environment = getEnvironment()) {
  if (!existsSync(manifestPath)) return createEmptyManifest(environment)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  return {
    ...createEmptyManifest(environment),
    ...manifest,
    resources: { ...emptyResources(), ...(manifest.resources || {}) },
  }
}

export function writeManifest(manifest) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

function hasPrefix(resource, prefix) {
  const values = [resource.id, resource.name, resource.reference, resource.prefix, resource.email]
  return values.some((value) => String(value || '').toLowerCase().includes(prefix.toLowerCase()))
}

export function registerResource(type, resource, environment = getEnvironment()) {
  if (!resourceTypes.includes(type)) throw new Error(`Tipo de recurso no permitido: ${type}`)
  const prefix = environment.prefix || 'kupan-e2e'
  const normalized = {
    type,
    id: resource.id,
    name: resource.name || resource.reference || resource.email || resource.id,
    reference: resource.reference || null,
    prefix,
    createdAt: resource.createdAt || new Date().toISOString(),
    dependencies: resource.dependencies || [],
    cleanupStatus: resource.cleanupStatus || 'registered',
  }
  if (!normalized.id && !normalized.name) throw new Error(`Recurso ${type} sin id ni nombre`)
  if (!hasPrefix(normalized, prefix)) throw new Error(`Recurso ${type} rechazado: falta prefijo ${prefix}`)

  const manifest = readManifest(environment)
  const existing = manifest.resources[type].find((item) => item.id === normalized.id || item.name === normalized.name)
  if (!existing) manifest.resources[type].push(normalized)
  writeManifest(manifest)
  return normalized
}

export function summarizeManifest(manifest = readManifest()) {
  return resourceTypes.map((type) => ({
    type,
    count: manifest.resources[type]?.length || 0,
    ids: (manifest.resources[type] || []).map((resource) => String(resource.id || resource.name).slice(0, 12)),
  }))
}

export function validateManifest(manifest = readManifest(), environment = getEnvironment()) {
  const errors = []
  const prefix = environment.prefix || 'kupan-e2e'
  for (const type of resourceTypes) {
    for (const resource of manifest.resources[type] || []) {
      if (!hasPrefix(resource, prefix)) errors.push(`${type}: recurso sin prefijo ${prefix}`)
      if (!resource.id && !resource.name) errors.push(`${type}: recurso sin id ni nombre`)
    }
  }
  return { ok: errors.length === 0, errors }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const environment = getEnvironment()
  const manifest = readManifest(environment)
  console.log('KUPAN STAGING RESOURCE MANIFEST')
  console.log(`Project: ${mask(environment.stagingRef)}`)
  console.log(`Prefix: ${environment.prefix || 'missing'}`)
  for (const item of summarizeManifest(manifest)) {
    console.log(`- ${item.type}: ${item.count}`)
  }
}
