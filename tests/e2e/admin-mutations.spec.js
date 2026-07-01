import { test } from '@playwright/test'
import { requireSafeMutationEnvironment } from './fixtures/environmentGuard.js'

test.describe('mutaciones críticas admin', () => {
  test.beforeEach(() => {
    requireSafeMutationEnvironment(test)
  })

  test('WOD, planes, alumnos, reservas y membresías requieren suite staging aislada', async () => {
    test.skip(true, 'Pendiente: falta fixture de cleanup staging seguro para ejecutar mutaciones reales')
  })
})
