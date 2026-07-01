import { addDays, getPlanTokenTotal } from './adminMetrics.js'

export function buildPlanPayload(planDraft) {
  return {
    name: planDraft.name.trim(),
    price: Number(planDraft.price),
    classes_per_week: planDraft.classes_per_week === '' ? null : Number(planDraft.classes_per_week),
    is_unlimited: planDraft.is_unlimited,
    active: planDraft.active,
  }
}

export function buildSchedulePayload(scheduleDraft) {
  return {
    day_of_week: Number(scheduleDraft.day_of_week),
    time: scheduleDraft.time,
    class_name: scheduleDraft.class_name,
    coach: scheduleDraft.coach,
    max_spots: Number(scheduleDraft.max_spots),
    active: scheduleDraft.active,
  }
}

export function buildCommunityPostPayload(postDraft) {
  return {
    type: postDraft.type,
    title: postDraft.title,
    content: postDraft.content,
    event_date: postDraft.event_date || null,
    active: postDraft.active,
  }
}

export function buildMembershipActivationPayload(membershipDraft, selectedPlan, now = () => new Date()) {
  const startDate = membershipDraft.start_date || now().toISOString().slice(0, 10)
  const endDate = addDays(startDate, 30)
  const classesTotal = selectedPlan?.is_unlimited ? null : Number(membershipDraft.classes_total || getPlanTokenTotal(selectedPlan) || 0)
  const initialClassesUsed = selectedPlan?.is_unlimited ? 0 : Number(membershipDraft.classes_used || 0)

  return {
    profile_id: membershipDraft.profile_id,
    plan_id: membershipDraft.plan_id,
    start_date: startDate,
    end_date: endDate,
    expires_at: endDate,
    status: 'active',
    classes_total: classesTotal,
    classes_used: initialClassesUsed,
    payment_status: 'paid',
    payment_provider: membershipDraft.payment_provider || 'manual_admin',
    payment_reference: membershipDraft.payment_reference || `manual-${membershipDraft.profile_id}-${Date.now()}`,
    activated_at: now().toISOString(),
    auto_activated: false,
    notes: membershipDraft.notes || null,
  }
}

export function buildMembershipUpdatePayload(membershipEditDraft, selectedPlan) {
  const editedClassesTotal = selectedPlan?.is_unlimited ? null : Number(membershipEditDraft.classes_total || 0)
  const editedClassesUsed = selectedPlan?.is_unlimited ? 0 : Number(membershipEditDraft.classes_used ?? 0)

  return {
    target_membership_id: membershipEditDraft.id,
    target_plan_id: membershipEditDraft.plan_id,
    start_date_input: membershipEditDraft.start_date,
    status_input: membershipEditDraft.status,
    payment_status_input: membershipEditDraft.payment_status,
    payment_provider_input: membershipEditDraft.payment_provider || null,
    payment_reference_input: membershipEditDraft.payment_reference || null,
    notes_input: membershipEditDraft.notes || null,
    classes_total_input: editedClassesTotal,
    classes_used_input: editedClassesUsed,
  }
}

export function buildMembershipStatusPayload(membership, status) {
  return {
    target_membership_id: membership.id,
    target_plan_id: membership.plan_id,
    start_date_input: membership.start_date,
    status_input: status,
    payment_status_input: status === 'active' ? 'paid' : membership.payment_status ?? 'paid',
    payment_provider_input: membership.payment_provider ?? null,
    payment_reference_input: membership.payment_reference ?? null,
    notes_input: membership.notes ?? null,
    classes_total_input: membership.classes_total,
    classes_used_input: membership.classes_used ?? 0,
  }
}

export function buildCreateStudentBody(studentDraft) {
  return {
    full_name: studentDraft.full_name,
    email: studentDraft.email,
    phone: studentDraft.phone || null,
    birth_date: studentDraft.birth_date,
    level: studentDraft.level,
    status: studentDraft.status,
    temporary_password: studentDraft.temporary_password || null,
    internal_notes: studentDraft.internal_notes || null,
    plan_id: studentDraft.plan_id || null,
    membership_start_date: studentDraft.membership_start_date || null,
    membership_end_date: studentDraft.membership_start_date ? addDays(studentDraft.membership_start_date, 30) : null,
  }
}

export function buildManualReservationInput(manualReservationDraft) {
  return {
    profileId: manualReservationDraft.profile_id,
    classScheduleId: manualReservationDraft.class_schedule_id,
    reservationDate: manualReservationDraft.reservation_date,
    allowWithoutMembership: manualReservationDraft.allow_without_membership,
    note: manualReservationDraft.note,
  }
}

export function buildPaymentSimulationBody(membershipDraft) {
  return {
    provider: 'manual_test',
    payment_reference: `test-${membershipDraft.profile_id}-${membershipDraft.plan_id}-${Date.now()}`,
    profile_id: membershipDraft.profile_id,
    plan_id: membershipDraft.plan_id,
    status: 'paid',
    simulated: true,
  }
}
