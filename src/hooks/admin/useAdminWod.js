import { supabase } from '../../lib/supabase.js'
import { logAppError } from '../../utils/appState.js'
import { createMutationResult, useAdminMutationState } from './useAdminMutationState.js'

export function useAdminWod({ supabaseClient = supabase, logError = logAppError } = {}) {
  const { operationState, runOperation } = useAdminMutationState({ saveWod: false })

  async function saveWod(wodDraft) {
    return runOperation('saveWod', async () => {
      const { data, error } = await supabaseClient.from('wod').upsert(wodDraft, { onConflict: 'date' })

      if (error) {
        logError('admin.wod.save', error)
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['wod'] })
    })
  }

  return {
    saveWod,
    isSavingWod: Boolean(operationState.saveWod),
  }
}
