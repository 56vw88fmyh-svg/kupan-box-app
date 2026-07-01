import { expect, test } from '@playwright/test'
import { attachConsoleGuard } from './fixtures/consoleGuard.js'
import { loginAs, skipWithoutRole } from './fixtures/auth.js'

test('formularios admin prioritarios renderizan inputs controlados sin warnings', async ({ page }, testInfo) => {
  skipWithoutRole('admin')
  const assertCleanConsole = attachConsoleGuard(page, testInfo)
  await loginAs(page, 'admin')
  await page.goto('/admin')

  const sections = [
    { button: /wod/i, labels: [/fecha/i, /^wod$/i] },
    { button: /horarios/i, labels: [/hora/i, /coach/i] },
    { button: /planes/i, labels: [/nombre/i, /precio/i] },
    { button: /textos/i, labels: [/inicio/i, /comunidad/i] },
  ]

  for (const section of sections) {
    await page.getByRole('button', { name: section.button }).first().click()
    for (const label of section.labels) {
      await expect(page.getByLabel(label).first()).toBeVisible()
    }
  }

  await assertCleanConsole()
})
