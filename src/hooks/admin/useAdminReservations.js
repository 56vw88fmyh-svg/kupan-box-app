import { supabase } from '../../lib/supabase.js'
import { logAppError } from '../../utils/appState.js'
import { adminReserveForStudent } from '../../utils/supabaseReservations.js'
import { buildManualReservationInput } from '../../utils/adminMutationBuilders.js'
import { createMutationResult, useAdminMutationState } from './useAdminMutationState.js'

export function useAdminReservations({ supabaseClient = supabase, reserveForStudent = adminReserveForStudent, logError = logAppError } = {}) {
  const { operationState, runOperation, isPending } = useAdminMutationState({ saveManualReservation: false })

  async function updateReservationStatus(reservationId, status) {
    const operationKey = `reservationStatus:${reservationId}:${status}`
    return runOperation(operationKey, async () => {
      const result = status === 'cancelled'
        ? await supabaseClient.rpc('cancel_reservation', { target_reservation_id: reservationId })
        : await supabaseClient.rpc('admin_mark_reservation', {
          target_reservation_id: reservationId,
          target_status: status,
        })
      const { data, error } = result

      if (error) {
        logError('admin.reservations.update_status', error, { reservationId, status })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['reservations', 'memberships', 'tokenMovements'] })
    })
  }

  async function saveManualReservation(manualReservationDraft) {
    return runOperation('saveManualReservation', async () => {
      const result = await reserveForStudent(buildManualReservationInput(manualReservationDraft))

      if (!result.ok) {
        const error = new Error(result.message)
        logError('admin.reservations.manual_reservation', error, {
          profileId: manualReservationDraft.profile_id,
          classScheduleId: manualReservationDraft.class_schedule_id,
        })
        return createMutationResult({ success: false, error, message: result.message })
      }

      return createMutationResult({
        success: true,
        data: result.reservation,
        message: result.message,
        affectedSections: ['reservations', 'memberships', 'tokenMovements'],
      })
    })
  }

  return {
    updateReservationStatus,
    saveManualReservation,
    isSavingManualReservation: Boolean(operationState.saveManualReservation),
    isReservationPending: isPending,
  }
}
