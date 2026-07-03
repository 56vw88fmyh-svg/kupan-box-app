const uppercasePattern = /[A-Z]/
const lowercasePattern = /[a-z]/
const numberPattern = /\d/
const symbolPattern = /[!@#$%^&*._-]/

export const passwordRequirements = [
  'Al menos 8 caracteres.',
  'Una letra mayúscula.',
  'Una letra minúscula.',
  'Un número.',
  'Sin espacios al inicio ni al final.',
  'No puede ser igual al correo.',
]

export function validateSecurePassword(password, confirmation, email = '', options = {}) {
  const errors = {}
  const value = password ?? ''
  const trimmed = value.trim()
  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  const requireSymbol = options.requireSymbol === true

  if (!value) {
    errors.password = 'Ingresa una contraseña.'
  } else if (value.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.'
  } else if (!uppercasePattern.test(value)) {
    errors.password = 'Agrega al menos una letra mayúscula.'
  } else if (!lowercasePattern.test(value)) {
    errors.password = 'Agrega al menos una letra minúscula.'
  } else if (!numberPattern.test(value)) {
    errors.password = 'Agrega al menos un número.'
  } else if (requireSymbol && !symbolPattern.test(value)) {
    errors.password = 'Agrega al menos un símbolo.'
  } else if (value !== trimmed) {
    errors.password = 'La contraseña no puede tener espacios al inicio o al final.'
  } else if (normalizedEmail && value.toLowerCase() === normalizedEmail) {
    errors.password = 'La contraseña no puede ser igual al correo.'
  }

  if (!confirmation) {
    errors.confirmation = 'Confirma la contraseña.'
  } else if (value !== confirmation) {
    errors.confirmation = 'Las contraseñas no coinciden.'
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  }
}

function pickRandom(items) {
  const index = globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % items.length
  return items[index]
}

export function generateTemporaryPassword(length = 14) {
  const safeUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const safeLower = 'abcdefghijkmnopqrstuvwxyz'
  const safeNumbers = '23456789'
  const safeSymbols = '!@#$%*-_'
  const all = `${safeUpper}${safeLower}${safeNumbers}${safeSymbols}`
  const size = Math.max(12, Math.min(16, Number(length) || 14))
  const chars = [
    pickRandom(safeUpper),
    pickRandom(safeLower),
    pickRandom(safeNumbers),
    pickRandom(safeSymbols),
  ]

  while (chars.length < size) chars.push(pickRandom(all))

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1)
    const current = chars[index]
    chars[index] = chars[swapIndex]
    chars[swapIndex] = current
  }

  return chars.join('')
}

export function getPasswordErrorMessage(error) {
  const message = String(error?.message ?? '').toLowerCase()

  if (message.includes('expired') || message.includes('invalid')) {
    return 'El enlace venció o no es válido. Solicita un nuevo correo de recuperación.'
  }

  if (message.includes('rate') || message.includes('limit') || message.includes('too many')) {
    return 'Se alcanzó el límite de envíos. Espera unos minutos e intenta nuevamente.'
  }

  if (message.includes('email')) {
    return 'El correo no es válido o no puede recibir recuperación.'
  }

  if (message.includes('password')) {
    return 'La contraseña no cumple los requisitos de seguridad.'
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to send')) {
    return 'No pudimos conectar. Revisa internet e intenta nuevamente.'
  }

  if (message.includes('function') || message.includes('edge')) {
    return 'El servicio de seguridad no está disponible. Intenta nuevamente en unos minutos.'
  }

  return 'No pudimos completar la acción. Intenta nuevamente.'
}
