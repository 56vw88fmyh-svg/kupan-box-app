import { expect, test } from '@playwright/test'
import { attachConsoleGuard } from './fixtures/consoleGuard.js'

test('recuperación de contraseña es visible y funciona en móvil', async ({ page }, testInfo) => {
  const assertCleanConsole = attachConsoleGuard(page, testInfo)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/auth/v1/recover*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    })
  })

  await page.goto('/login')
  await page.getByRole('button', { name: /olvidé mi contraseña/i }).click()

  await expect(page.getByRole('heading', { name: /vuelve a entrenar/i })).toBeVisible()
  await expect(page.getByLabel(/contraseña/i)).toHaveCount(0)
  await page.getByLabel(/correo/i).fill('alumno@example.com')
  await page.getByRole('button', { name: /enviar enlace de recuperación/i }).click()

  await expect(page.getByText(/si el correo está registrado/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /volver al inicio de sesión/i })).toBeVisible()

  const overflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))
  expect(overflow).toBeLessThanOrEqual(2)
  await assertCleanConsole()
})

test('servicio de acceso temporalmente inactivo ofrece reintento', async ({ page }, testInfo) => {
  const assertCleanConsole = attachConsoleGuard(page, testInfo, {
    allowedConsoleFragments: ['server responded with a status of 503'],
  })
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Service unavailable' }),
    })
  })

  await page.goto('/login')
  await page.getByLabel(/correo/i).fill('alumno@example.com')
  await page.getByLabel(/contraseña/i).fill('ClaveTemporal1!')
  await page.getByRole('button', { name: /iniciar sesión/i }).click()

  await expect(page.getByText(/servicio de acceso está temporalmente inactivo/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /reintentar/i })).toBeVisible()
  await assertCleanConsole()
})
