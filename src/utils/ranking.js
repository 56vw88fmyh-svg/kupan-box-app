import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

function getRankingError(message = 'No pudimos cargar el ranking KUPAN.') {
  return { ok: false, message }
}

export function formatRankingDate(date) {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export async function loadPrRanking({ movement = '', level = '' } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return getRankingError('Supabase aun no esta configurado.')
  }

  const { data, error } = await supabase.rpc('get_public_pr_ranking', {
    movement_filter: movement || null,
    level_filter: level || null,
    limit_count: 20,
  })

  if (error) return getRankingError(`No pudimos cargar ranking: ${error.message}`)

  return { ok: true, records: data ?? [] }
}
