import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { gymConfig } from '../config/gymConfig.js'
import { getHumanErrorMessage, logAppError } from './appState.js'
import { ENHANCED_SCHEDULE_FIELDS, isMissingOptionalScheduleColumn, LEGACY_SCHEDULE_FIELDS } from './scheduleCompatibility.js'

export async function loadTrialSchedules() {
  if (!isSupabaseConfigured || !supabase) return { ok: false, message: 'El servicio no está disponible en este momento.', schedules: [] }
  let { data, error } = await supabase
    .from('class_schedule')
    .select(ENHANCED_SCHEDULE_FIELDS)
    .eq('active', true)
    .order('day_of_week')
    .order('time')
  if (isMissingOptionalScheduleColumn(error)) {
    const legacyResult = await supabase
      .from('class_schedule')
      .select(LEGACY_SCHEDULE_FIELDS)
      .eq('active', true)
      .order('day_of_week')
      .order('time')
    data = legacyResult.data
    error = legacyResult.error
  }
  if (error) {
    logAppError('trial.load_schedules', error)
    return { ok: false, message: getHumanErrorMessage(error, 'No pudimos cargar los horarios disponibles.'), schedules: [] }
  }
  return { ok: true, schedules: data ?? [] }
}

export async function submitTrialRequest(values) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, message: 'El servicio no está disponible en este momento.' }
  const { data, error } = await supabase.rpc('request_trial_class', {
    full_name: values.fullName.trim(),
    phone: values.phone.trim(),
    primary_goal: values.primaryGoal.trim(),
    email: values.email.trim() || null,
    previous_experience: values.previousExperience.trim() || null,
    desired_class_schedule_id: values.scheduleId || null,
    desired_date: values.desiredDate || null,
    physical_limitations: values.physicalLimitations.trim() || null,
    privacy_accepted: values.privacyAccepted,
  })
  if (error) {
    logAppError('trial.submit', error)
    return { ok: false, message: getHumanErrorMessage(error, error.message || 'No pudimos enviar tu solicitud.') }
  }
  return { ok: true, id: data, message: `Recibimos tu solicitud. El equipo ${gymConfig.identity.name} te contactará para confirmar tu primera clase.` }
}
