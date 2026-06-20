const CACHE_VERSION = 'v14'
const STATIC_CACHE = `kupan-static-${CACHE_VERSION}`
const HTML_CACHE = `kupan-html-${CACHE_VERSION}`
const APP_SHELL = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
]

const PRIVATE_PATTERNS = [
  'supabase.co',
  '/auth/v1/',
  '/rest/v1/',
  '/storage/v1/',
  '/functions/v1/',
  'apikey=',
  'authorization=',
  'personal_records',
  'profiles',
  'reservations',
  'memberships',
  'notifications',
  'admin_',
]

function isPrivateRequest(request) {
  const url = new URL(request.url)
  const target = `${url.hostname}${url.pathname}${url.search}`.toLowerCase()
  const hasAuthHeader = request.headers.has('authorization') || request.headers.has('apikey')
  return hasAuthHeader || PRIVATE_PATTERNS.some((pattern) => target.includes(pattern))
}

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin
}

function isStaticAsset(request) {
  if (!isSameOrigin(request) || isPrivateRequest(request)) return false
  const url = new URL(request.url)
  return request.destination === 'script'
    || request.destination === 'style'
    || request.destination === 'font'
    || request.destination === 'image'
    || url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/icons/')
    || url.pathname.startsWith('/brand/')
    || url.pathname === '/manifest.webmanifest'
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response && response.ok && response.type !== 'opaque') {
    const cache = await caches.open(STATIC_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' })
    if (response && response.ok && isSameOrigin(request)) {
      const cache = await caches.open(HTML_CACHE)
      await cache.put('/index.html', response.clone())
    }
    return response
  } catch {
    return await caches.match('/index.html') || Response.error()
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('kupan-') && ![STATIC_CACHE, HTML_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  if (isPrivateRequest(request)) {
    event.respondWith(fetch(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStatic(request))
  }
})
