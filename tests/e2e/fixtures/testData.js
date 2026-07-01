import { getE2eEnvironment } from './environmentGuard.js'
import { createResourceRegistry as createSafeResourceRegistry } from './resourceRegistry.js'

export const adminSections = [
  { label: /inicio/i, title: /inicio/i },
  { label: /nuevo alumno/i, title: /nuevo alumno/i },
  { label: /^alumnos$/i, title: /ver alumnos|alumnos/i },
  { label: /planes/i, title: /planes/i },
  { label: /membres/i, title: /membres/i },
  { label: /reservas/i, title: /reservas/i },
  { label: /wod/i, title: /wod/i },
  { label: /horarios/i, title: /horarios/i },
  { label: /noticias|comunicaciones/i, title: /comunicaciones/i },
  { label: /textos/i, title: /textos/i },
  { label: /cumple/i, title: /cumple/i },
  { label: /pr destacados/i, title: /pr/i },
]

export const responsiveViewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
]

export function mutationsAllowed() {
  return getE2eEnvironment().canRunMutations
}

export function createTestRunData() {
  const environment = getE2eEnvironment()
  const timestamp = Date.now()
  const prefix = `${environment.testPrefix}-${timestamp}`

  return {
    prefix,
    timestamp,
    planName: `KUPAN E2E Plan ${timestamp}`,
    postTitle: `KUPAN E2E Post ${timestamp}`,
    studentName: `KUPAN E2E Student ${timestamp}`,
    studentEmail: `${prefix}@example.com`,
    phone: '+56900000000',
    paymentReference: `kupan-e2e-payment-${timestamp}`,
    safeWodDate: '2099-12-31',
    notes: `KUPAN E2E ${timestamp}`,
  }
}

export function createResourceRegistry() {
  return createSafeResourceRegistry().registry
}
