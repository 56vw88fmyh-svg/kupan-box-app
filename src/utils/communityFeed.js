import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getHumanErrorMessage, logAppError } from './appState.js'

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

function getMonthRangeChile(date = new Date()) {
  const [year, month] = toChileDateString(date).split('-').map(Number)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)

  return { startDate, endDate }
}

function mapWodRow(row) {
  if (!row) return null

  return {
    id: row.id,
    date: row.date,
    title: row.title || 'WOD KUPAN',
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
  return shortDateFormatter.format(new Date(`${value}T00:00:00`))
}

export async function loadTodaysWod() {
  if (!isSupabaseConfigured || !supabase) {
    return getFeedError('Supabase aun no esta configurado.')
  }

  const today = toChileDateString()
  const rpcResult = await supabase.rpc('get_public_todays_wod', { target_date: today })

  if (!rpcResult.error) {
    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data
    return { ok: true, wod: mapWodRow(row), today }
  }

  const { data, error } = await supabase
    .from('wod')
    .select('id, date, title, warmup, strength, workout, time_cap, notes, created_at, updated_at')
    .eq('date', today)
    .maybeSingle()

  if (error) {
    logAppError('community.todays_wod', error)
    return getFeedError(getHumanErrorMessage(error, 'No fue posible cargar el WOD de hoy. Revisa tu conexión y vuelve a intentarlo.'))
  }

  return { ok: true, wod: mapWodRow(data), today }
}

async function loadRanking() {
  const { startDate, endDate } = getMonthRangeChile()
  const rpcResult = await supabase.rpc('get_public_good_vibes_ranking', {
    month_start: startDate,
    month_end: endDate,
  })

  if (!rpcResult.error) return rpcResult.data ?? []

  const { data, error } = await supabase
    .from('reservations')
    .select('profile_id, status, reservation_date')
    .gte('reservation_date', startDate)
    .lte('reservation_date', endDate)
    .in('status', ['reserved', 'attended'])

  if (error) throw error

  const counts = new Map()
  ;(data ?? []).forEach((reservation) => {
    counts.set(reservation.profile_id, (counts.get(reservation.profile_id) ?? 0) + 1)
  })

  const profileIds = [...counts.keys()]
  if (profileIds.length === 0) return []

  const profilesResult = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', profileIds)

  if (profilesResult.error) throw profilesResult.error

  const names = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]))
  return profileIds
    .map((profileId) => ({
      profile_id: profileId,
      full_name: names.get(profileId) ?? 'Atleta KUPAN',
      reservations_count: counts.get(profileId) ?? 0,
    }))
    .sort((a, b) => b.reservations_count - a.reservations_count)
    .slice(0, 10)
}

async function loadNews() {
  const rpcResult = await supabase.rpc('get_public_box_news', { limit_count: 5 })
  if (!rpcResult.error) return rpcResult.data ?? []

  const { data, error } = await supabase
    .from('community_posts')
    .select('id, type, title, content, event_date, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw error
  return data ?? []
}

async function loadRecentPrs() {
  const rpcResult = await supabase.rpc('get_public_recent_prs', { limit_count: 5 })
  if (!rpcResult.error) return rpcResult.data ?? []

  const { data, error } = await supabase
    .from('personal_records')
    .select('id, profile_id, movement, value, unit, record_date, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw error

  const profileIds = [...new Set((data ?? []).map((record) => record.profile_id).filter(Boolean))]
  if (profileIds.length === 0) return data ?? []

  const profilesResult = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', profileIds)

  if (profilesResult.error) throw profilesResult.error

  const names = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]))
  return (data ?? []).map((record) => ({
    ...record,
    full_name: names.get(record.profile_id) ?? 'Atleta KUPAN',
  }))
}

async function loadBirthdays() {
  const { data, error } = await supabase.rpc('birthdays_this_month')
  if (error) throw error

  return (data ?? []).map((birthday) => ({
    profile_id: birthday.profile_id,
    full_name: birthday.full_name,
    birth_day: birthday.birth_day,
    birth_month: birthday.birth_month,
  }))
}

export async function loadCommunityFeed() {
  if (!isSupabaseConfigured || !supabase) {
    return getFeedError('Supabase aun no esta configurado.')
  }

  const [birthdays, ranking, news, recentPrs] = await Promise.allSettled([
    loadBirthdays(),
    loadRanking(),
    loadNews(),
    loadRecentPrs(),
  ])

  const errors = [birthdays, ranking, news, recentPrs]
    .filter((result) => result.status === 'rejected')
    .map((result) => {
      logAppError('community.feed_block', result.reason)
      return getHumanErrorMessage(result.reason, 'Un bloque de comunidad no pudo actualizarse.')
    })
    .filter(Boolean)

  return {
    ok: errors.length === 0,
    message: errors.length > 0 ? 'Algunos bloques no pudieron actualizarse. Mostramos la información disponible.' : '',
    birthdays: birthdays.status === 'fulfilled' ? birthdays.value : [],
    ranking: ranking.status === 'fulfilled' ? ranking.value : [],
    news: news.status === 'fulfilled' ? news.value : [],
    recentPrs: recentPrs.status === 'fulfilled' ? recentPrs.value : [],
  }
}
