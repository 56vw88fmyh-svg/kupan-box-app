import { expect, test } from '@playwright/test'
import { attachConsoleGuard } from './fixtures/consoleGuard.js'
import { loginAs, skipWithoutRole } from './fixtures/auth.js'
import { adminSections } from './fixtures/testData.js'

test('admin navega por secciones principales sin error de render', async ({ page }, testInfo) => {
  skipWithoutRole('admin')
  const assertCleanConsole = attachConsoleGuard(page, testInfo)
  await loginAs(page, 'admin')
  await page.goto('/admin')

  for (const section of adminSections) {
    const button = page.getByRole('button', { name: section.label }).first()
    await expect(button).toBeVisible()
    await button.click()
    await expect(page.getByText(section.title).first()).toBeVisible()
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflowX, `No debe haber overflow horizontal en ${section.label}`).toBeLessThanOrEqual(2)
  }

  await assertCleanConsole()
})
