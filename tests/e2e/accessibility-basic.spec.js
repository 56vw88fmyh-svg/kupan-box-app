import { expect, test } from '@playwright/test'
import { attachConsoleGuard } from './fixtures/consoleGuard.js'

test('login tiene labels, botones con nombre y foco visible básico', async ({ page }, testInfo) => {
  const assertCleanConsole = attachConsoleGuard(page, testInfo)
  await page.goto('/login')

  await expect(page.getByLabel(/correo/i)).toBeVisible()
  await expect(page.getByLabel(/contraseña/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /registrarme/i })).toBeVisible()

  await page.keyboard.press('Tab')
  const activeTag = await page.evaluate(() => document.activeElement?.tagName)
  expect(activeTag).toBeTruthy()

  const unnamedButtons = await page.evaluate(() => (
    [...document.querySelectorAll('button')]
      .filter((button) => !button.textContent.trim() && !button.getAttribute('aria-label'))
      .length
  ))
  expect(unnamedButtons).toBe(0)
  await assertCleanConsole()
})
