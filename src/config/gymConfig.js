import { getGymConfig, resolveGymId } from './gyms.js'

const env = import.meta.env ?? {}
const browserHostname = typeof window === 'undefined' ? '' : window.location.hostname
export const activeGymId = resolveGymId({ explicitId: env.VITE_GYM_ID, hostname: browserHostname })
export const gymConfig = getGymConfig(activeGymId)

const requiredPaths = [
  ['id'],
  ['identity', 'name'],
  ['identity', 'slogan'],
  ['localization', 'locale'],
  ['localization', 'timezone'],
  ['localization', 'currency'],
  ['assets', 'logo'],
  ['assets', 'icon'],
  ['assets', 'pwaIcon'],
  ['theme', 'background'],
  ['theme', 'text'],
  ['theme', 'accent'],
  ['theme', 'border'],
  ['integrations', 'emailSenderName'],
  ['infrastructure', 'cacheNamespace'],
]

function readPath(value, path) {
  return path.reduce((current, key) => current?.[key], value)
}

export function validateGymConfig(config = gymConfig) {
  const errors = requiredPaths
    .filter((path) => !readPath(config, path))
    .map((path) => `Falta ${path.join('.')}`)

  if (!/^#[0-9a-f]{6}$/i.test(config?.theme?.accent ?? '')) errors.push('theme.accent debe ser un color HEX de 6 digitos')
  if (!Array.isArray(config?.operations?.classTypes)) errors.push('operations.classTypes debe ser una lista')
  if (!config?.features || typeof config.features !== 'object') errors.push('features debe existir')

  return { ok: errors.length === 0, errors }
}

export function assertValidGymConfig(config = gymConfig) {
  const result = validateGymConfig(config)
  if (!result.ok) throw new Error(`Configuracion publica invalida para ${config?.id ?? 'desconocido'}: ${result.errors.join('; ')}`)
  return config
}

function hexToRgbChannels(hex) {
  const normalized = hex.replace('#', '')
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16)).join(' ')
}

export function applyGymTheme(config = gymConfig, root = document.documentElement) {
  const theme = config.theme
  const variables = {
    '--bg-primary': theme.background,
    '--bg-secondary': theme.surface,
    '--bg-card': theme.card,
    '--bg-elevated': theme.elevated,
    '--text-primary': theme.text,
    '--text-secondary': theme.textSecondary,
    '--brand-red': theme.accent,
    '--brand-red-hover': theme.accentHover,
    '--brand-red-soft': theme.accentSoft,
    '--border-default': theme.border,
    '--border-strong': theme.borderStrong,
    '--color-bg-primary': hexToRgbChannels(theme.background),
    '--color-bg-secondary': hexToRgbChannels(theme.surface),
    '--color-bg-card': hexToRgbChannels(theme.card),
    '--color-bg-elevated': hexToRgbChannels(theme.elevated),
    '--color-text-primary': hexToRgbChannels(theme.text),
    '--color-text-secondary': hexToRgbChannels(theme.textSecondary),
    '--color-brand-red': hexToRgbChannels(theme.accent),
    '--color-brand-red-hover': hexToRgbChannels(theme.accentHover),
    '--color-brand-sand': hexToRgbChannels(theme.sand),
    '--color-brand-steel': hexToRgbChannels(theme.steel),
    '--color-border-default': hexToRgbChannels(theme.border),
    '--color-border-strong': hexToRgbChannels(theme.borderStrong),
  }

  Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value))
  root.dataset.gym = config.id
  root.lang = config.localization.locale.split('-')[0]
}

export function applyGymMetadata(config = gymConfig) {
  const description = `${config.identity.name}: app para reservas, planes y comunidad del centro de entrenamiento.`
  document.title = `${config.identity.name} · ${config.identity.descriptor}`

  const values = {
    'meta[name="description"]': description,
    'meta[name="application-name"]': config.identity.name,
    'meta[name="author"]': config.identity.name,
    'meta[property="og:site_name"]': config.identity.name,
    'meta[property="og:title"]': document.title,
    'meta[property="og:description"]': description,
    'meta[property="og:image"]': config.assets.socialImage,
    'meta[name="twitter:title"]': document.title,
    'meta[name="twitter:description"]': description,
    'meta[name="twitter:image"]': config.assets.socialImage,
    'meta[name="apple-mobile-web-app-title"]': config.identity.name,
    'meta[name="theme-color"]': config.theme.background,
  }

  Object.entries(values).forEach(([selector, content]) => {
    const element = document.querySelector(selector)
    if (element) element.setAttribute('content', content)
  })
}

export function isFeatureEnabled(feature, config = gymConfig) {
  return config.features[feature] === true
}

assertValidGymConfig()
