import { supabase } from '../../lib/supabase.js'
import { logAppError } from '../../utils/appState.js'
import { buildPlanPayload } from '../../utils/adminMutationBuilders.js'
import { createMutationResult, useAdminMutationState } from './useAdminMutationState.js'

export function useAdminPlans({ supabaseClient = supabase, logError = logAppError } = {}) {
  const { operationState, runOperation, isPending } = useAdminMutationState({ savePlan: false })

  async function savePlan(planDraft) {
    return runOperation('savePlan', async () => {
      const payload = buildPlanPayload(planDraft)
      const mutation = planDraft.id
        ? supabaseClient.from('plans').update(payload).eq('id', planDraft.id)
        : supabaseClient.from('plans').insert(payload)
      const { data, error } = await mutation

      if (error) {
        logError('admin.plans.save', error, { planId: planDraft.id || null })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['plans'] })
    })
  }

  async function togglePlan(plan) {
    const operationKey = `togglePlan:${plan.id}`
    return runOperation(operationKey, async () => {
      const { data, error } = await supabaseClient.from('plans').update({ active: !plan.active }).eq('id', plan.id)

      if (error) {
        logError('admin.plans.toggle', error, { planId: plan.id })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['plans'] })
    })
  }

  return {
    savePlan,
    togglePlan,
    isSavingPlan: Boolean(operationState.savePlan),
    isPlanPending: isPending,
  }
}
