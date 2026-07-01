import { test } from '@playwright/test'
import { hasRoleCredentials } from './fixtures/auth.js'

test('sesión vencida durante mutación admin queda pendiente de entorno seguro', async () => {
  test.skip(!hasRoleCredentials('admin'), 'Pendiente: faltan credenciales admin')
  test.skip(true, 'Pendiente: requiere invalidar sesión Supabase de prueba sin afectar usuarios reales')
})
