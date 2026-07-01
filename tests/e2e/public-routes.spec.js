import { expect, test } from '@playwright/test'
import { attachConsoleGuard } from './fixtures/consoleGuard.js'

const routes = ['/', '/login', '/admin', '/coach', '/reservas', '/wod']

async function safeGoto(page, route) {
  try {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
  } catch (error) {
    const message = String(error?.message ?? '')
    const interruptedBySameNavigation = message.includes('is interrupted by another navigation')
    if (!message.includes('ERR_ABORTED') && !interruptedBySameNavigation) throw error
  }
}

for (const route of routes) {
  test(`ruta pública/protegida resuelve sin pantalla blanca: ${route}`, async ({ page }, testInfo) => {
    const assertCleanConsole = attachConsoleGuard(page, testInfo)
    await safeGoto(page, route)
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('h1, h2').first()).toBeVisible()

    if (['/admin', '/coach'].includes(route)) {
      await expect(page).toHaveURL(/\/login\?access=required/)
      await expect(page.getByText(/acceso kupan/i).first()).toBeVisible()
    }

    await safeGoto(page, route)
    await expect(page.locator('body')).toBeVisible()
    await assertCleanConsole()
  })
}
