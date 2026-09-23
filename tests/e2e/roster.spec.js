import { test, expect } from '@playwright/test'

const token = 'a'.repeat(64)
const base = { membership_id: 'm', membership_status: 'active', payment_status: 'paid', start_date: '2026-09-01', end_date: '2026-10-01', effective_end_date: '2026-10-01', remaining_tokens: 8, total_tokens: 12, is_unlimited: false, plan_name: '12 clases' }
const students = [
  { ...base, student_id: '1', full_name: 'Ángela Soto' },
  { ...base, student_id: '2', full_name: 'Martín Rojas', remaining_tokens: 2 },
  { ...base, student_id: '3', full_name: 'Camila Torres', remaining_tokens: 0 },
  { ...base, student_id: '4', full_name: 'Diego Muñoz', membership_id: null, plan_name: null, start_date: null, end_date: null, effective_end_date: null },
  { ...base, student_id: '5', full_name: 'Valentina Pérez', is_unlimited: true, remaining_tokens: null, total_tokens: null, plan_name: 'Ilimitado' },
]
const response = { today: '2026-09-21', generated_at: '2026-09-21T18:30:00Z', students }

test('private roster needs a link and does not load the app session', async ({ page }) => {
  const calls = []
  page.on('request', (request) => { if (/supabase\.co/.test(request.url())) calls.push(request.url()) })
  await page.goto('/nomina.html')
  await expect(page.getByRole('heading', { name: 'Necesitas un enlace privado' })).toBeVisible()
  expect(calls).toEqual([])
})

test('read-only search, semaphores, automatic sync and revoked access', async ({ page }) => {
  await page.clock.install()
  let revoked = false
  const requests = []
  await page.route('**/rest/v1/rpc/read_student_roster', async (route) => {
    requests.push(route.request())
    await route.fulfill({ status: revoked ? 401 : 200, contentType: 'application/json', body: JSON.stringify(revoked ? { code: '42501' } : response) })
  })
  await page.goto(`/nomina.html#acceso=${token}`)
  await expect(page.getByText('Ángela Soto', { exact: true })).toBeVisible()
  await expect(page.getByText('Conectado a KUPAN', { exact: true })).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(5)
  await expect(page.locator('tbody tr').first()).toContainText('Camila Torres')
  await expect(page.getByRole('button', { name: /editar|guardar|renovar plan|eliminar/i })).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Buscar alumno' }).fill('angela')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.getByRole('searchbox').fill('')
  await page.getByRole('button', { name: /Próximos a renovar/ }).click()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr')).toContainText('Martín Rojas')
  await page.getByRole('button', { name: /Alumnos activos/ }).click()
  const initialCount = requests.length
  await page.clock.fastForward(30000)
  await expect.poll(() => requests.length).toBeGreaterThan(initialCount)
  expect(requests.at(-1).postDataJSON()).toEqual({ access_token: token })
  expect(requests.at(-1).headers().authorization).not.toContain(token)
  revoked = true
  await page.clock.fastForward(30000)
  await expect(page.getByRole('alert')).toContainText('fue revocado')
  await expect(page.getByText('Ángela Soto', { exact: true })).toHaveCount(0)
})

test('mobile layout fits the screen and handles connection failure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let fail = false
  await page.route('**/rest/v1/rpc/read_student_roster', async (route) => {
    if (fail) return route.abort('internetdisconnected')
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(response) })
  })
  await page.goto(`/nomina.html#acceso=${token}`)
  await expect(page.getByText('Ángela Soto', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/roster-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.screenshot({ path: 'test-results/roster-desktop.png', fullPage: true })
  fail = true
  await page.getByRole('button', { name: 'Actualizar ahora' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(0)
})
