import { expect, test } from '@playwright/test'
import { attachConsoleGuard } from './fixtures/consoleGuard.js'
import { hasRoleCredentials, loginAs, skipWithoutRole } from './fixtures/auth.js'

test('sin sesión /admin redirige a login sin exponer panel', async ({ page }, testInfo) => {
  const assertCleanConsole = attachConsoleGuard(page, testInfo)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login\?access=required/)
  await expect(page.getByText(/control real del box/i)).toHaveCount(0)
  await assertCleanConsole()
})

test('sin sesión /coach redirige a login sin exponer asistencia', async ({ page }, testInfo) => {
  const assertCleanConsole = attachConsoleGuard(page, testInfo)
  await page.goto('/coach')
  await expect(page).toHaveURL(/\/login\?access=required/)
  await expect(page.getByText(/modo coach/i)).toHaveCount(0)
  await assertCleanConsole()
})

test('alumno no accede a /admin', async ({ page }, testInfo) => {
  skipWithoutRole('student')
  const assertCleanConsole = attachConsoleGuard(page, testInfo)
  await loginAs(page, 'student')
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/perfil\?access=restricted/)
  await expect(page.getByText(/control real del box/i)).toHaveCount(0)
  await assertCleanConsole()
})

test('admin accede a /admin y ve módulos esperados', async ({ page }, testInfo) => {
  skipWithoutRole('admin')
  const assertCleanConsole = attachConsoleGuard(page, testInfo)
  await loginAs(page, 'admin')
  await page.goto('/admin')
  await expect(page.getByText(/datos en vivo/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /actualizar datos/i })).toBeVisible()
  await assertCleanConsole()
})

test('coach accede a /coach si hay credenciales de coach', async ({ page }, testInfo) => {
  test.skip(!hasRoleCredentials('coach'), 'Faltan credenciales E2E_COACH_EMAIL/PASSWORD')
  const assertCleanConsole = attachConsoleGuard(page, testInfo)
  await loginAs(page, 'coach')
  await page.goto('/coach')
  await expect(page.getByText(/modo coach|asistencia/i).first()).toBeVisible()
  await assertCleanConsole()
})
