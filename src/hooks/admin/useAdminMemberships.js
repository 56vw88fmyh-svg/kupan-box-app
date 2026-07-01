import { supabase } from '../../lib/supabase.js'
import { logAppError } from '../../utils/appState.js'
import {
  buildMembershipActivationPayload,
  buildMembershipStatusPayload,
  buildMembershipUpdatePayload,
  buildPaymentSimulationBody,
} from '../../utils/adminMutationBuilders.js'
import { createMutationResult, useAdminMutationState } from './useAdminMutationState.js'

export function useAdminMemberships({ supabaseClient = supabase, logError = logAppError } = {}) {
  const { operationState, runOperation, isPending } = useAdminMutationState({
    saveMembership: false,
    saveMembershipEdit: false,
    simulateApprovedPayment: false,
  })

  async function saveMembership(membershipDraft, selectedPlan) {
    return runOperation('saveMembership', async () => {
      const payload = buildMembershipActivationPayload(membershipDraft, selectedPlan)
      const { data, error } = await supabaseClient.rpc('admin_activate_membership', {
        target_profile_id: payload.profile_id,
        target_plan_id: payload.plan_id,
        membership_start_date: payload.start_date,
        classes_total_override: payload.classes_total,
        initial_classes_used: payload.classes_used,
        payment_provider_input: payload.payment_provider,
        payment_reference_input: payload.payment_reference,
        notes_input: payload.notes,
      })

      if (error) {
        logError('admin.memberships.activate', error, { profileId: payload.profile_id, planId: payload.plan_id })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({
        success: true,
        data,
        affectedSections: ['memberships', 'profiles', 'tokenMovements'],
        extra: { initialClassesUsed: payload.classes_used },
      })
    })
  }

  async function saveMembershipEdit(membershipEditDraft, selectedPlan) {
    return runOperation('saveMembershipEdit', async () => {
      const updatePayload = buildMembershipUpdatePayload(membershipEditDraft, selectedPlan)
      const { data, error } = await supabaseClient.rpc('admin_update_membership', updatePayload)

      if (error) {
        logError('admin.memberships.update', error, { membershipId: membershipEditDraft.id })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['memberships', 'profiles', 'tokenMovements'] })
    })
  }

  async function updateMembershipStatus(membership, status) {
    const operationKey = `membershipStatus:${membership.id}:${status}`
    return runOperation(operationKey, async () => {
      const { data, error } = await supabaseClient.rpc('admin_update_membership', buildMembershipStatusPayload(membership, status))

      if (error) {
        logError('admin.memberships.status', error, { membershipId: membership.id, status })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['memberships', 'profiles', 'tokenMovements'] })
    })
  }

  async function renewMembership(membership) {
    const operationKey = `renewMembership:${membership.id}`
    return runOperation(operationKey, async () => {
      const { data, error } = await supabaseClient.rpc('admin_renew_membership', {
        target_membership_id: membership.id,
      })

      if (error) {
        logError('admin.memberships.renew', error, { membershipId: membership.id })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['memberships', 'profiles', 'tokenMovements'] })
    })
  }

  async function extendMembershipSevenDays(membership) {
    const operationKey = `extendMembership:${membership.id}:7`
    return runOperation(operationKey, async () => {
      const { data, error } = await supabaseClient.rpc('admin_extend_membership', {
        target_membership_id: membership.id,
        days_input: 7,
      })

      if (error) {
        logError('admin.memberships.extend', error, { membershipId: membership.id, days: 7 })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['memberships', 'profiles', 'tokenMovements'] })
    })
  }

  async function adjustMembershipTokens(membership, parsedValue) {
    const operationKey = `adjustTokens:${membership.id}`
    return runOperation(operationKey, async () => {
      const { data, error } = await supabaseClient.rpc('admin_adjust_tokens', {
        target_membership_id: membership.id,
        classes_used_input: parsedValue,
        reason_input: 'Ajuste manual admin desde acciones rapidas',
      })

      if (error) {
        logError('admin.memberships.adjust_tokens', error, { membershipId: membership.id })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['memberships', 'profiles', 'tokenMovements'] })
    })
  }

  async function simulateApprovedPayment(membershipDraft) {
    return runOperation('simulateApprovedPayment', async () => {
      const { data, error } = await supabaseClient.functions.invoke('payment-webhook', {
        body: buildPaymentSimulationBody(membershipDraft),
      })

      if (error || !data?.ok) {
        const normalizedError = error ?? new Error(data?.message || 'No pudimos simular el pago. Revisa la Edge Function payment-webhook.')
        logError('admin.memberships.simulate_payment', normalizedError, { profileId: membershipDraft.profile_id, planId: membershipDraft.plan_id })
        return createMutationResult({ success: false, error: normalizedError, data, message: data?.message || '' })
      }

      return createMutationResult({ success: true, data, affectedSections: ['memberships', 'profiles', 'tokenMovements'] })
    })
  }

  return {
    saveMembership,
    saveMembershipEdit,
    updateMembershipStatus,
    renewMembership,
    extendMembershipSevenDays,
    adjustMembershipTokens,
    simulateApprovedPayment,
    isSavingMembership: Boolean(operationState.saveMembership),
    isSavingMembershipEdit: Boolean(operationState.saveMembershipEdit),
    isSimulatingPayment: Boolean(operationState.simulateApprovedPayment),
    isMembershipPending: isPending,
    membershipOperationState: operationState,
  }
}
