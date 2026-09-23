/* global URLSearchParams */
// Deliberately independent of the app's Supabase client: never read an admin session.
export function readRosterToken(hash) {
  if (!hash.startsWith('#')) return ''
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('acceso') ?? ''
  return /^[a-f0-9]{64}$/.test(token) ? token : ''
}

export async function fetchRoster(token, { signal, request = window.fetch.bind(window) } = {}) {
  const env = import.meta.env ?? {}
  if ([env.VITE_GYM_ID, env.VITE_SUPABASE_GYM_ID].some((id) => id && id.trim().toLowerCase() !== 'kupan')) {
    throw new Error('Este panel requiere la conexión de KUPAN.')
  }
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('El panel todavía no tiene configurada la conexión con KUPAN.')
  }
  let response
  try {
    response = await request(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/read_student_roster`, {
    method: 'POST',
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: token }),
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('No se pudo conectar con KUPAN. Revisa tu conexión e intenta nuevamente.')
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error('Este enlace no es válido, venció o fue revocado. Solicita un nuevo enlace al administrador de KUPAN.')
  }
  if (!response.ok) throw new Error('No se pudo actualizar la nómina. Revisa la conexión e intenta nuevamente.')
  const result = await response.json()
  if (!Array.isArray(result?.students) || !result?.today || !result?.generated_at) {
    throw new Error('No se pudo verificar la respuesta de KUPAN. Intenta nuevamente.')
  }
  return result
}
