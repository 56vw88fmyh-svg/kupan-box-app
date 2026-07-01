import { expect } from '@playwright/test'
import { getE2eEnvironment } from './environmentGuard.js'
import { resourceTypes, summarizeRegistry } from './resourceRegistry.js'

function hasE2ePrefix(resource, prefix) {
  const values = [resource?.id, resource?.label, resource?.name, resource?.title, resource?.email, resource?.prefix]
  return values.some((value) => String(value || '').toLowerCase().includes(prefix.toLowerCase()))
}

export function validateCleanupRegistry(registry, prefix = getE2eEnvironment().testPrefix) {
  const errors = []

  for (const type of resourceTypes) {
    const resources = registry?.[type] || []
    if (!Array.isArray(resources)) {
      errors.push(`${type}: formato inválido`)
      continue
    }

    for (const resource of resources) {
      if (!resource?.id && !resource?.label) errors.push(`${type}: recurso sin id ni label`)
      if (!hasE2ePrefix(resource, prefix)) errors.push(`${type}: recurso sin prefijo ${prefix}`)
    }
  }

  return { ok: errors.length === 0, errors }
}

export async function runRegisteredCleanup({ registry, cleanupHandlers = {}, dryRun = true } = {}) {
  const environment = getE2eEnvironment()
  const validation = validateCleanupRegistry(registry, environment.testPrefix)
  const report = {
    environment: {
      baseUrl: environment.baseUrl.replace(/\/\/([^@/]+@)?/, '//'),
      prefix: environment.testPrefix,
      dryRun,
      canRunMutations: environment.canRunMutations,
    },
    summary: summarizeRegistry(registry || {}),
    deleted: [],
    remaining: [],
    errors: [...validation.errors],
  }

  if (!validation.ok) return report
  if (!environment.canRunMutations) {
    report.errors.push('Cleanup bloqueado: entorno de mutaciones no confirmado.')
    return report
  }
  if (dryRun) return report

  for (const type of resourceTypes) {
    const handler = cleanupHandlers[type]
    const resources = registry?.[type] || []
    if (!resources.length) continue
    if (!handler) {
      report.remaining.push(...resources.map((resource) => ({ type, id: resource.id || resource.label })))
      report.errors.push(`${type}: no hay handler de cleanup autorizado`)
      continue
    }

    for (const resource of resources) {
      try {
        await handler(resource)
        report.deleted.push({ type, id: resource.id || resource.label })
      } catch (error) {
        report.remaining.push({ type, id: resource.id || resource.label })
        report.errors.push(`${type}: ${error.message}`)
      }
    }
  }

  return report
}

export async function attachCleanupReport(testInfo, report) {
  await testInfo.attach('e2e-cleanup-report.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  })
  expect(report.errors, 'Cleanup E2E no debe ocultar errores').toEqual([])
}
