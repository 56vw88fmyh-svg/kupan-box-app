/* global btoa */
import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

async function openAdmin(page) {
  const id = '00000000-0000-4000-8000-000000000001'
  const user = { id, aud: 'authenticated', email: 'admin@example.invalid', user_metadata: {}, app_metadata: { provider: 'email' }, created_at: new Date().toISOString() }
  const profile = { id, full_name: 'Admin de prueba', email: user.email, role: 'admin', status: 'active', level: 'RX' }
  const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const unexpected = []
  await page.route('**/*.supabase.co/**', route => {
    const url = route.request().url()
    if (url.includes('/auth/v1/token')) return route.fulfill({ json: { access_token: token, refresh_token: 'fake-refresh', expires_in: 3600, token_type: 'bearer', user } })
    if (url.includes('/auth/v1/user')) return route.fulfill({ json: user })
    if (url.includes('/get_my_profile')) return route.fulfill({ json: profile })
    if (url.includes('/admin_get_profiles')) return route.fulfill({ json: [profile, { ...profile, id: 'student-test', role: 'student', full_name: 'Alumno de prueba' }] })
    if (url.includes('/admin_get_operational_metrics')) return route.fulfill({ json: {} })
    if (/\/(admin_get_|get_|birthdays_|upcoming_birthdays|refresh_my_membership_notifications|registration_delivery_summary)/.test(url) || route.request().method() === 'GET') return route.fulfill({ json: [] })
    unexpected.push(url)
    return route.fulfill({ status: 403, json: { message: 'Mutation blocked in navigation test' } })
  })
  await page.goto('/login?returnTo=%2Fadmin')
  await page.getByLabel(/correo electrónico/i).fill(user.email)
  await page.getByLabel(/^contraseña/i).fill('Fake-Test-Password-123')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.locator('#admin-quick-access')).toBeVisible()
  return () => { expect(errors).toEqual([]); expect(unexpected).toEqual([]) }
}

async function choose(page, module, item) {
  const menu = page.locator('#admin-quick-access')
  if (!await menu.isVisible()) await page.getByRole('button', { name: 'Menú', exact: true }).click()
  const group = menu.getByRole('button', { name: module, exact: true })
  if (await group.getAttribute('aria-expanded') === 'false') await group.click()
  await menu.getByRole('button', { name: item, exact: true }).click()
  await expect(menu).toBeHidden()
  await expect(page.locator('#admin-workspace')).toBeVisible()
}

async function assertWorkspace(page) {
  await expect.poll(() => page.evaluate(() => {
    const toolbar = document.querySelector('[aria-label="Sección de Gestión"]').getBoundingClientRect()
    const header = document.querySelector('.k-app-header')
    const headerBottom = window.getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().bottom : 0
    return Math.abs(toolbar.top - headerBottom)
  })).toBeLessThan(14)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(2)
  const metrics = await page.locator('#admin-workspace').evaluate(el => ({
    width: el.getBoundingClientRect().width,
    position: window.getComputedStyle(document.body).position,
    overflow: window.getComputedStyle(document.body).overflowY,
  }))
  expect(metrics.width).toBeGreaterThan((page.viewportSize().width - 40))
  expect(metrics.position).not.toBe('fixed')
  expect(metrics.overflow).not.toBe('hidden')
}

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`Gestión uses the whole mobile workspace at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const assertClean = await openAdmin(page)
    for (const [module, item] of [
      ['Alumnos', 'Alumnos Listado completo'],
      ['Alumnos', 'Nuevo alumno Crear acceso'],
      ['Alumnos', 'Plan actual Planes activos'],
      ['Alumnos', 'Historial Ciclos y tokens'],
      ['Clases', 'Reservas y asistencia Alumnos por clase'],
      ['Clases', 'Horarios y cupos Crear y editar clases'],
      ['Entrenamientos', 'WOD de hoy Crear o editar WOD'],
      ['Planes y pagos', 'Configuracion de planes Precios y cupos'],
      ['Comunicaciones', 'Noticias y eventos Publicaciones activas'],
      ['Configuracion', 'Textos generales Copy principal'],
    ]) {
      await choose(page, module, item)
      await assertWorkspace(page)
    }
    await page.screenshot({ path: `test-results/admin-workspace-${test.info().project.name}-${viewport.width}.png` })
    assertClean()
  })
}

test('mobile menu preserves edits and lets the last form control scroll above navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const assertClean = await openAdmin(page)
  await choose(page, 'Alumnos', 'Nuevo alumno Crear acceso')
  await page.getByLabel('Nombre completo', { exact: true }).fill('Borrador conservado')
  await page.getByRole('button', { name: 'Volver a accesos rápidos', exact: true }).click()
  await expect(page.locator('#admin-workspace')).toBeHidden()
  await expect(page.locator('#admin-quick-access')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue('Borrador conservado')
  const submit = page.getByRole('button', { name: 'Crear alumno', exact: true })
  await submit.scrollIntoViewIfNeeded()
  await expect(submit).toBeInViewport()
  const box = await submit.boundingBox()
  const nav = await page.getByRole('navigation', { name: 'Navegación del panel administrativo' }).boundingBox()
  expect(box.y + box.height).toBeLessThanOrEqual(nav.y)
  await page.screenshot({ path: `test-results/admin-form-end-${test.info().project.name}.png` })
  // Selecting the current item again must close the menu and move focus again.
  await choose(page, 'Alumnos', 'Nuevo alumno Crear acceso')
  await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveValue('Borrador conservado')
  await page.getByRole('navigation', { name: 'Navegación del panel administrativo' }).getByRole('button', { name: 'Clases', exact: true }).click()
  await expect(page.locator('#admin-quick-access')).toBeHidden()
  await page.getByText('Más', { exact: true }).click()
  await page.getByLabel('Abrir Configuracion', { exact: true }).click()
  await page.getByRole('button', { name: 'Textos generales. Copy principal', exact: true }).click()
  await expect(page.locator('[data-admin-more-menu]')).not.toHaveAttribute('open')
  await expect(page.getByRole('heading', { name: 'Copy compartido', exact: true })).toBeVisible()
  assertClean()
})

test('desktop keeps its sidebar and can collapse it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const assertClean = await openAdmin(page)
  await page.locator('#admin-quick-access').getByRole('button', { name: 'Alumnos', exact: true }).click()
  await page.locator('#admin-quick-access').getByRole('button', { name: 'Alumnos Listado completo', exact: true }).click()
  await expect(page.locator('#admin-workspace')).toBeVisible()
  await expect(page.locator('#admin-quick-access')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Menú', exact: true })).toBeHidden()
  const expanded = await page.locator('#admin-quick-access').boundingBox()
  await page.getByRole('button', { name: 'Colapsar menu admin', exact: true }).click()
  const collapsed = await page.locator('#admin-quick-access').boundingBox()
  expect(collapsed.width).toBeLessThan(expanded.width)
  assertClean()
})
