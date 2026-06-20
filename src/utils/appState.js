const SESSION_PATTERNS = ['jwt', 'session', 'refresh token', 'auth session', 'expired']
const PERMISSION_PATTERNS = ['permission denied', 'not authorized', 'row-level', 'rls', 'policy', 'violates row-level']
const OFFLINE_PATTERNS = ['failed to fetch', 'network', 'offline', 'load failed', 'timeout', 'abort']
const DELETED_PATTERNS = ['not found', 'no rows', 'deleted', 'does not exist']

function normalizeErrorText(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  return String(error.message || error.error_description || error.details || '')
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern))
}

export function getAppStateKind(error) {
  const text = normalizeErrorText(error).toLowerCase()

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
  if (includesAny(text, SESSION_PATTERNS)) return 'session'
  if (includesAny(text, PERMISSION_PATTERNS)) return 'permission'
  if (includesAny(text, OFFLINE_PATTERNS)) return 'offline'
  if (includesAny(text, DELETED_PATTERNS)) return 'deleted'
  return 'error'
}

export function getHumanErrorMessage(error, fallback = 'No fue posible cargar esta información. Revisa tu conexión y vuelve a intentarlo.') {
  const kind = getAppStateKind(error)

  if (kind === 'offline') return 'No fue posible conectar. Revisa tu internet y vuelve a intentarlo.'
  if (kind === 'session') return 'Tu sesión venció. Inicia sesión nuevamente para continuar.'
  if (kind === 'permission') return 'No tienes permiso para ver o modificar esta información.'
  if (kind === 'deleted') return 'Este contenido ya no está disponible o fue eliminado.'

  return fallback
}

export function logAppError(scope, error, extra = {}) {
  const rawMessage = normalizeErrorText(error)
  const safeLog = {
    scope,
    kind: getAppStateKind(error),
    message: rawMessage.slice(0, 280),
    ...extra,
  }

  // Logging seguro para desarrollo: evita stack traces, secretos y errores rojos en consola de produccion.
  window.console.warn('[KUPAN]', safeLog)
}

export function withTimeout(promise, timeoutMs = 12000, label = 'operación') {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`timeout:${label}`)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId))
}
