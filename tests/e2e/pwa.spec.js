import { expect, test } from '@playwright/test'
import { attachConsoleGuard } from './fixtures/consoleGuard.js'

/* global caches */

async function evaluateServiceWorkerState(page) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return { supported: false }
        const registration = await navigator.serviceWorker.ready
        const keys = 'caches' in window ? await caches.keys() : []
        return {
          supported: true,
          scope: registration.scope,
          cacheKeys: keys,
          hasPrivateCacheName: keys.some((key) => /profiles|reservations|memberships|admin/i.test(key)),
        }
      })
    } catch (error) {
      if (!String(error?.message || '').includes('Execution context was destroyed') || attempt === 1) throw error
      await page.waitForLoadState('domcontentloaded')
    }
  }
  return { supported: false }
}

test('PWA registra service worker y no cachea rutas privadas conocidas', async ({ page }, testInfo) => {
  const assertCleanConsole = attachConsoleGuard(page, testInfo)
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const swState = await evaluateServiceWorkerState(page)

  expect(swState.supported).toBe(true)
  expect(swState.scope).toContain('/')
  expect(swState.hasPrivateCacheName).toBe(false)
  await assertCleanConsole()
})
