import { expect, test } from '@playwright/test'
import { attachConsoleGuard } from './fixtures/consoleGuard.js'
import { loginAs, skipWithoutRole } from './fixtures/auth.js'

const screens = [
  { name: 'escritorio', viewport: { width: 1280, height: 800 } },
  { name: 'móvil', viewport: { width: 390, height: 844 } },
]

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))
  expect(overflow).toBeLessThanOrEqual(2)
}

for (const screen of screens) {
  test(`alumno mantiene permisos correctos en ${screen.name}`, async ({ page }, testInfo) => {
    skipWithoutRole('student')
    const assertCleanConsole = attachConsoleGuard(page, testInfo)
    await page.setViewportSize(screen.viewport)
    await loginAs(page, 'student')
    await page.goto('/perfil')
    await expect(page.getByText(/perfil|atleta/i).first()).toBeVisible()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/perfil\?access=restricted/)
    await expectNoHorizontalOverflow(page)
    await assertCleanConsole()
  })

  test(`coach mantiene permisos correctos en ${screen.name}`, async ({ page }, testInfo) => {
    skipWithoutRole('coach')
    const assertCleanConsole = attachConsoleGuard(page, testInfo)
    await page.setViewportSize(screen.viewport)
    await loginAs(page, 'coach')
    await page.goto('/coach')
    await expect(page.getByText(/modo coach|asistencia/i).first()).toBeVisible()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/perfil\?access=restricted/)
    await expectNoHorizontalOverflow(page)
    await assertCleanConsole()
  })

  test(`admin mantiene permisos correctos en ${screen.name}`, async ({ page }, testInfo) => {
    skipWithoutRole('admin')
    const assertCleanConsole = attachConsoleGuard(page, testInfo)
    await page.setViewportSize(screen.viewport)
    await loginAs(page, 'admin')
    await page.goto('/admin')
    await expect(page.getByRole('button', { name: /actualizar datos/i })).toBeVisible()
    await page.goto('/coach')
    await expect(page.getByText(/modo coach|asistencia/i).first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await assertCleanConsole()
  })
}
