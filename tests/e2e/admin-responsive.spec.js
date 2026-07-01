import { expect, test } from '@playwright/test'
import { attachConsoleGuard } from './fixtures/consoleGuard.js'
import { loginAs, skipWithoutRole } from './fixtures/auth.js'
import { responsiveViewports } from './fixtures/testData.js'

/* global getComputedStyle */

const sections = [/inicio/i, /membres/i, /reservas/i, /wod/i, /horarios/i, /textos/i]

for (const viewport of responsiveViewports) {
  test(`admin responsive ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    skipWithoutRole('admin')
    const assertCleanConsole = attachConsoleGuard(page, testInfo)
    await page.setViewportSize(viewport)
    await loginAs(page, 'admin')
    await page.goto('/admin')

    for (const sectionName of sections) {
      const button = page.getByRole('button', { name: sectionName }).first()
      await expect(button).toBeVisible()
      await button.click()
      await expect(page.locator('main')).toBeVisible()

      const metrics = await page.evaluate(() => {
        const controls = [...document.querySelectorAll('input, select, textarea')]
        return {
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          smallControls: controls.filter((control) => parseFloat(getComputedStyle(control).fontSize) < 16).length,
        }
      })

      expect(metrics.overflowX, `Sin overflow en ${sectionName}`).toBeLessThanOrEqual(2)
      expect(metrics.smallControls, `Inputs/selects/textarea >=16px en ${sectionName}`).toBe(0)
    }

    await page.screenshot({ path: `test-results/e2e/admin-${viewport.width}x${viewport.height}.png`, fullPage: true })
    await assertCleanConsole()
  })
}
