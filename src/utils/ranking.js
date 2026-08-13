import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getHumanErrorMessage, logAppError } from './appState.js'
import { gymConfig } from '../config/gymConfig.js'

function getRankingError(message = `No pudimos cargar el ranking ${gymConfig.identity.name}.`) {
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
    return getRankingError('El servicio de datos aún no está configurado.')
  }

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) {
    return { ok: true, records: [] }
  }

  const { data, error } = await supabase.rpc('get_public_pr_ranking', {
    movement_filter: movement || null,
    level_filter: level || null,
    limit_count: 20,
  })

  if (error) {
    logAppError('ranking.load_pr_ranking', error)
    return getRankingError(getHumanErrorMessage(error, 'No fue posible cargar el ranking. Revisa tu conexión y vuelve a intentarlo.'))
  }

  return { ok: true, records: data ?? [] }
}
