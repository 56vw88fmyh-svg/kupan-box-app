import { expect, test } from '@playwright/test'

/* global process */

export const roles = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
  },
  coach: {
    email: process.env.E2E_COACH_EMAIL,
    password: process.env.E2E_COACH_PASSWORD,
  },
  student: {
    email: process.env.E2E_STUDENT_EMAIL,
    password: process.env.E2E_STUDENT_PASSWORD,
  },
}

export function hasRoleCredentials(role) {
  return Boolean(roles[role]?.email && roles[role]?.password)
}

export function skipWithoutRole(role) {
  test.skip(!hasRoleCredentials(role), `Faltan credenciales E2E_${role.toUpperCase()}_EMAIL/PASSWORD`)
}

export async function loginAs(page, role) {
  const credentials = roles[role]
  if (!credentials?.email || !credentials?.password) {
    throw new Error(`Faltan credenciales para ${role}`)
  }

  await page.goto('/login')
  await page.getByLabel(/correo/i).fill(credentials.email)
  await page.getByLabel(/contraseña/i).fill(credentials.password)
  await page.getByRole('button', { name: /entrar|iniciar/i }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

export async function loginAsAdmin(page) {
  return loginAs(page, 'admin')
}

export async function loginAsCoach(page) {
  return loginAs(page, 'coach')
}

export async function loginAsStudent(page) {
  return loginAs(page, 'student')
}

export async function logout(page) {
  await page.goto('/perfil')
  const button = page.getByRole('button', { name: /cerrar sesión|salir/i }).first()
  if (await button.count()) await button.click()
  await expect(page).toHaveURL(/\/login|\/perfil/)
}

export async function clearSession(page) {
  await page.context().clearCookies()
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  }).catch(() => {})
}
