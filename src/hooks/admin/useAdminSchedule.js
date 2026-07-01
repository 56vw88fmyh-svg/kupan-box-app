import { supabase } from '../../lib/supabase.js'
import { logAppError } from '../../utils/appState.js'
import { buildSchedulePayload } from '../../utils/adminMutationBuilders.js'
import { createMutationResult, useAdminMutationState } from './useAdminMutationState.js'

export function useAdminSchedule({ supabaseClient = supabase, logError = logAppError } = {}) {
  const { operationState, runOperation, isPending } = useAdminMutationState({ saveSchedule: false })

  async function saveSchedule(scheduleDraft) {
    return runOperation('saveSchedule', async () => {
      const payload = buildSchedulePayload(scheduleDraft)
      const mutation = scheduleDraft.id
        ? supabaseClient.from('class_schedule').update(payload).eq('id', scheduleDraft.id)
        : supabaseClient.from('class_schedule').insert(payload)
      const { data, error } = await mutation

      if (error) {
        logError('admin.schedule.save', error, { scheduleId: scheduleDraft.id || null })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['schedule'] })
    })
  }

  async function toggleSchedule(classItem) {
    const operationKey = `toggleSchedule:${classItem.id}`
    return runOperation(operationKey, async () => {
      const { data, error } = await supabaseClient.from('class_schedule').update({ active: !classItem.active }).eq('id', classItem.id)

      if (error) {
        logError('admin.schedule.toggle', error, { scheduleId: classItem.id })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['schedule'] })
    })
  }

  return {
    saveSchedule,
    toggleSchedule,
    isSavingSchedule: Boolean(operationState.saveSchedule),
    isSchedulePending: isPending,
  }
}
