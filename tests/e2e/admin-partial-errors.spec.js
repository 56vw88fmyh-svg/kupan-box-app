import { test } from '@playwright/test'
import { hasRoleCredentials } from './fixtures/auth.js'

test('errores parciales de loaders admin requieren admin de prueba y mocks de RPC controlados', async () => {
  test.skip(!hasRoleCredentials('admin'), 'Pendiente: faltan credenciales admin para validar errores parciales en UI')
  test.skip(true, 'Pendiente: requiere interceptar RPC Supabase por sección sin ocultar integración real')
})
