/* global URL, URLSearchParams */
import { getPathForPageId } from './routes.js'

const returnPaths = new Set(['/', '/reservas','/wod','/perfil','/mis-pr','/planes','/comunidad','/ranking','/prueba','/admin','/coach'])
export function safeReturnTo(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback
  try {
    const url = new URL(value, 'https://local.invalid')
    return url.origin === 'https://local.invalid' && returnPaths.has(url.pathname) ? url.pathname + url.search : fallback
  } catch { return fallback }
}
export function destinationFor(pageId, options = {}) {
  if (pageId === 'my-plan') return '/perfil?tab=membership'
  if (pageId === 'result') return '/wod?action=result'
  const path = getPathForPageId(pageId)
  const query = new URLSearchParams()
  if (pageId === 'profile' && ['membership','account','settings'].includes(options.tab)) query.set('tab', options.tab)
  if (pageId === 'reservations' && /^\d{4}-\d{2}-\d{2}$/.test(options.date ?? '')) query.set('date',options.date)
  return path + (query.size ? `?${query}` : '')
}
export function loginDestination(returnTo) {
  return `/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`
}
