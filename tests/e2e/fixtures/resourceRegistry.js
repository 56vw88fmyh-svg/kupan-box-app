import { getE2eEnvironment } from './environmentGuard.js'

const resourceTypes = [
  'profiles',
  'plans',
  'memberships',
  'reservations',
  'posts',
  'schedules',
  'wodDates',
  'paymentReferences',
]

function createEmptyRegistry() {
  return Object.fromEntries(resourceTypes.map((type) => [type, []]))
}

function valueHasPrefix(value, prefix) {
  if (!value) return false
  return String(value).toLowerCase().includes(String(prefix).toLowerCase())
}

function normalizeResource(resource, fallbackPrefix) {
  if (typeof resource === 'string') {
    return { id: resource, label: resource, prefix: fallbackPrefix }
  }
  return {
    id: resource.id,
    label: resource.label || resource.name || resource.title || resource.email || resource.id,
    prefix: resource.prefix || fallbackPrefix,
    metadata: resource.metadata || {},
  }
}

export function createResourceRegistry(prefix = getE2eEnvironment().testPrefix) {
  const registry = createEmptyRegistry()

  return {
    registry,
    types: resourceTypes,
    add(type, resource) {
      if (!resourceTypes.includes(type)) throw new Error(`Tipo de recurso E2E no permitido: ${type}`)
      const normalized = normalizeResource(resource, prefix)
      if (!normalized.id && !normalized.label) throw new Error(`Recurso E2E ${type} sin id ni label`)
      if (!valueHasPrefix(normalized.id, prefix) && !valueHasPrefix(normalized.label, prefix)) {
        throw new Error(`Recurso E2E ${type} rechazado: falta prefijo ${prefix}`)
      }
      registry[type].push(normalized)
      return normalized
    },
    snapshot() {
      return JSON.parse(JSON.stringify(registry))
    },
  }
}

export function summarizeRegistry(registry) {
  return resourceTypes.map((type) => ({
    type,
    count: Array.isArray(registry?.[type]) ? registry[type].length : 0,
    ids: (registry?.[type] || []).map((resource) => String(resource.id || resource.label).slice(0, 12)),
  }))
}

export { resourceTypes }
