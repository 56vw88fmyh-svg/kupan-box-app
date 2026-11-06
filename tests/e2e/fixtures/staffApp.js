/* global btoa */
import { expect } from '@playwright/test'

export async function openStaffApp(page, { role = 'admin', path = '/admin', failOptionsOnce = false, reservationError = null } = {}) {
  const id = '00000000-0000-4000-8000-000000000001'
  const athlete = '00000000-0000-4000-8000-000000000002'
  const user = { id, aud: 'authenticated', email: 'staff@example.invalid', user_metadata: {}, app_metadata: { provider: 'email' }, created_at: new Date().toISOString() }
  const profile = { id, full_name: 'Equipo de prueba', email: user.email, role, status: 'active', level: 'RX' }
  const student = { id: athlete, full_name: 'Alumno con plan activo', email: 'student@example.invalid', role: 'student', status: 'active', level: 'RX' }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const day = new Date(today + 'T12:00:00Z').getUTCDay() || 7
  const schedule = { id: '10000000-0000-4000-8000-000000000001', day_of_week: day, time: '00:00:00', class_name: 'CrossFit', coach: 'Equipo de prueba', max_spots: 10, active: true }
  const membership = { id: '20000000-0000-4000-8000-000000000001', profile_id: athlete, status: 'active', payment_status: 'paid', start_date: today, end_date: '2099-01-01', classes_total: null, classes_used: 0, plan: { name: 'Full', is_unlimited: true } }
  const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`
  const state = { reservations: [], requests: [], optionRequests: 0, reservationError, unexpected: [], notificationReads: [] }
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*.supabase.co/**', route => {
    const request = route.request()
    const url = request.url()
    if (url.includes('/auth/v1/token')) return route.fulfill({ json: { access_token: token, refresh_token: 'fake-refresh', expires_in: 3600, token_type: 'bearer', user } })
    if (url.includes('/auth/v1/user')) return route.fulfill({ json: user })
    if (url.includes('/get_my_profile')) return route.fulfill({ json: profile })
    if (url.includes('/admin_get_profiles')) return route.fulfill({ json: [profile, student] })
    if (url.includes('/admin_get_memberships')) return route.fulfill({ json: [membership] })
    if (url.includes('/get_active_membership')) return route.fulfill({ json: null })
    if (url.includes('/admin_get_operational_metrics')) return route.fulfill({ json: {} })
    if (url.includes('/admin_get_schedule') || url.includes('/class_schedule')) return route.fulfill({ json: [schedule] })
    if (url.includes('/admin_get_reservations') || url.includes('/coach_get_day_reservations')) return route.fulfill({ json: state.reservations })
    if (url.includes('/coach_get_manual_reservation_profiles')) {
      state.optionRequests++
      if (failOptionsOnce && state.optionRequests === 1) return route.fulfill({ status: 503, json: { message: 'temporarily unavailable' } })
      return route.fulfill({ json: [student] })
    }
    if (url.includes('/coach_get_manual_reservation_memberships')) return route.fulfill({ json: [membership] })
    if (url.includes('/admin_reserve_for_student')) {
      state.requests.push(request.postDataJSON())
      if (state.reservationError) return route.fulfill({ status: 400, json: { code: 'P0001', message: state.reservationError } })
      const reservation = { id: '30000000-0000-4000-8000-000000000001', profile_id: athlete, class_schedule_id: schedule.id, membership_id: membership.id, reservation_date: today, status: 'reserved', token_charged: false, profile: student, class_schedule: schedule }
      state.reservations = [reservation]
      return route.fulfill({ json: reservation })
    }
    if (url.includes('/rest/v1/notifications')) {
      if (request.method() === 'PATCH') { state.notificationReads.push(request.postDataJSON()); return route.fulfill({ status: 204 }) }
      return route.fulfill({ json: Array.from({ length: 20 }, (_, index) => ({ id: `notification-${index}`, profile_id: id, title: `Aviso ${index + 1}`, message: 'Información de tu clase y plan. ' + 'Contenido legible en una pantalla pequeña. '.repeat(3), type: 'news', read: false, created_at: '2026-11-05T18:00:00Z' })) })
    }
    if (/\/(admin_get_|get_|birthdays_|upcoming_birthdays|refresh_my_membership_notifications|registration_delivery_summary)/.test(url) || request.method() === 'GET') return route.fulfill({ json: [] })
    state.unexpected.push(url)
    return route.fulfill({ status: 403, json: { message: 'Unexpected write blocked' } })
  })
  await page.goto('/login?returnTo=' + encodeURIComponent(path))
  await page.getByLabel(/correo electrónico/i).fill(user.email)
  await page.getByLabel(/^contraseña/i).fill('Fake-Test-Password-123')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page).toHaveURL(path)
  state.assertClean = () => { expect(errors).toEqual([]); expect(state.unexpected).toEqual([]) }
  state.student = student
  return state
}
