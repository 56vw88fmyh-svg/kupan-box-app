export const AUTH_USERS_STORAGE_KEY = 'kupan-auth-users'
export const AUTH_SESSION_STORAGE_KEY = 'kupan-auth-session'

// Autenticación temporal para prototipo local.
// Las contraseñas se guardan en localStorage solo mientras no exista backend.
// Antes de producción real, reemplazar por autenticación segura y base de datos.
export function loadUsers() {
  try {
    const storedUsers = window.localStorage.getItem(AUTH_USERS_STORAGE_KEY)
    const users = storedUsers ? JSON.parse(storedUsers) : []
    return Array.isArray(users) ? users : []
  } catch {
    return []
  }
}

export function saveUsers(users) {
  window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(users))
}

export function loadSession() {
  try {
    const storedSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    return storedSession ? JSON.parse(storedSession) : null
  } catch {
    return null
  }
}

export function saveSession(user) {
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(user))
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}
