export function createEmptyPlanDraft() {
  return { id: '', name: '', price: '', classes_per_week: '', is_unlimited: false, active: true }
}

export function createEmptyMembershipDraft() {
  return {
    profile_id: '',
    plan_id: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    status: 'active',
    classes_total: '',
    classes_used: '',
    payment_status: 'paid',
    payment_provider: 'manual_admin',
    payment_reference: '',
    notes: '',
  }
}

export function createEmptyMembershipEditDraft() {
  return {
    id: '',
    profile_id: '',
    plan_id: '',
    start_date: '',
    end_date: '',
    status: 'active',
    classes_total: '',
    classes_used: 0,
    payment_status: 'paid',
    payment_provider: '',
    payment_reference: '',
    notes: '',
  }
}

export function createEmptyWodDraft() {
  return { date: new Date().toISOString().slice(0, 10), title: '', warmup: '', strength: '', workout: '', time_cap: '', notes: '' }
}

export function createEmptyScheduleDraft() {
  return { id: '', day_of_week: 1, time: '18:00', class_name: 'CrossFit', coach: 'Coach KUPAN', max_spots: 12, active: true }
}

export function createEmptyPostDraft() {
  return { id: '', type: 'noticia', title: '', content: '', event_date: '', active: true }
}

export function createEmptyStudentDraft() {
  return {
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    level: 'Iniciado',
    status: 'active',
    temporary_password: '',
    internal_notes: '',
    plan_id: '',
    membership_start_date: '',
    membership_end_date: '',
  }
}

export function createEmptyManualReservationDraft() {
  return {
    reservation_date: '',
    class_schedule_id: '',
    profile_id: '',
    student_query: '',
    note: '',
    allow_without_membership: false,
  }
}

export const settingKeys = {
  homeEyebrow: 'home_eyebrow',
  homeTitle: 'home_title',
  homeBody: 'home_body',
  reservationsTitle: 'reservations_title',
  reservationsBody: 'reservations_body',
  communityPhrase: 'community_phrase',
}

export const studentFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'inactive', label: 'Inactivos' },
  { id: 'plan-active', label: 'Plan activo' },
  { id: 'plan-expired', label: 'Plan vencido' },
  { id: 'no-tokens', label: 'Sin tokens' },
  { id: 'expiring', label: 'Por vencer' },
]

export const weekdayLabels = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miercoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sabado',
  7: 'Domingo',
}
