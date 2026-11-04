import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getHumanErrorMessage, logAppError } from './appState.js'
import { gymConfig } from '../config/gymConfig.js'

const chileDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const chileDisplayFormatter = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const shortDateFormatter = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: '2-digit',
  month: 'short',
})

function splitLines(value) {
  return String(value ?? '').split('\n').map((item) => item.trim()).filter(Boolean)
}

function toChileDateString(date = new Date()) {
  return chileDateFormatter.format(date)
}

function mapWodRow(row) {
  if (!row) return null

  return {
    ...row.training_details,
    scaling: row.training_details?.scaling?.filter(plan => plan.items?.length) ?? [],
    id: row.id,
    date: row.date,
    title: row.title || `WOD ${gymConfig.identity.name}`,
    warmup: splitLines(row.warmup),
    strength: splitLines(row.strength),
    workout: splitLines(row.workout),
    timeCap: row.time_cap || 'Por definir',
    notes: splitLines(row.notes),
  }
}

function getFeedError(message) {
  return { ok: false, message }
}

export function formatChileDisplayDate(date = new Date()) {
  return chileDisplayFormatter.format(date)
}

export function formatShortChileDate(value) {
  if (!value) return 'Sin fecha'
  const date = new Date(String(value).includes('T') ? value : `${String(value).slice(0,10)}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : shortDateFormatter.format(date)
}

export async function loadTodaysWod() {
  if (!isSupabaseConfigured || !supabase) {
    return getFeedError('El servicio de datos aún no está disponible.')
  }

  const today = toChileDateString()
  const rpcResult = await supabase.rpc('get_public_todays_wod_v2', { target_date: today })

  if (!rpcResult.error) {
    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data
    return { ok: true, wod: mapWodRow(row), today }
  }

  const { data, error } = await supabase
    .from('wod')
    .select('id, date, title, warmup, strength, workout, time_cap, notes, training_details, created_at, updated_at')
    .eq('date', today)
    .maybeSingle()

  if (error) {
    logAppError('community.todays_wod', error)
    return getFeedError(getHumanErrorMessage(error, 'No fue posible cargar el WOD de hoy. Revisa tu conexión y vuelve a intentarlo.'))
  }

  return { ok: true, wod: mapWodRow(data), today }
}

export async function loadCommunityFeed() {
  if (!isSupabaseConfigured || !supabase) return getFeedError('El servicio de datos aún no está disponible.')
  const { data: session } = await supabase.auth.getSession()
  if (!session?.session) return { ok: false, message: 'Inicia sesión para ver Comunidad.', birthdays: [], ranking: [], news: [], recentPrs: [] }
  const { data, error } = await supabase.rpc('get_member_community_feed')
  if (error) return getFeedError('No pudimos actualizar Comunidad. Intenta nuevamente.')
  return { ok: true, message: '', birthdays: data?.birthdays ?? [], ranking: data?.ranking ?? [], news: data?.news ?? [], recentPrs: data?.records ?? [] }
}
