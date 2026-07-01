import { expect, test } from '@playwright/test'
import { attachConsoleGuard } from './fixtures/consoleGuard.js'
import { loginAs, skipWithoutRole } from './fixtures/auth.js'

const draftKey = 'kupan_admin_wod_draft_v1'

async function openWodAdmin(page) {
  await loginAs(page, 'admin')
  await page.goto('/admin')
  await page.getByRole('button', { name: /wod/i }).first().click()
  await expect(page.getByLabel(/wod/i)).toBeVisible()
}

test('WOD draft autoguarda, no recupera automático, recupera y descarta explícitamente', async ({ page }, testInfo) => {
  skipWithoutRole('admin')
  const assertCleanConsole = attachConsoleGuard(page, testInfo)

  await openWodAdmin(page)
  const text = `AMRAP 7 QA ${Date.now()}`
  await page.getByLabel(/^wod$/i).fill(text)
  await page.waitForTimeout(900)

  const stored = await page.evaluate((key) => window.localStorage.getItem(key), draftKey)
  expect(stored).toContain(text)

  await page.reload()
  await expect(page.getByText(/borrador local disponible/i)).toBeVisible()
  await expect(page.getByLabel(/^wod$/i)).not.toHaveValue(text)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /recuperar/i }).click()
  await expect(page.getByLabel(/^wod$/i)).toHaveValue(text)

  await page.reload()
  await expect(page.getByText(/borrador local disponible/i)).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /descartar/i }).click()
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), draftKey)).toBeNull()

  await assertCleanConsole()
})

test('WOD draft no se crea con fecha sola y storage error no rompe formulario', async ({ page }, testInfo) => {
  skipWithoutRole('admin')
  const assertCleanConsole = attachConsoleGuard(page, testInfo)

  await openWodAdmin(page)
  await page.waitForTimeout(900)
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), draftKey)).toBeNull()

  await page.addInitScript((key) => {
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = (nextKey, value) => {
      if (nextKey === key) throw new Error('QuotaExceededError')
      return originalSetItem(nextKey, value)
    }
  }, draftKey)
  await page.reload()
  await page.getByRole('button', { name: /wod/i }).first().click()
  await page.getByLabel(/^wod$/i).fill(`Storage QA ${Date.now()}`)
  await page.waitForTimeout(900)
  await expect(page.getByLabel(/^wod$/i)).toBeVisible()
  await assertCleanConsole()
})
