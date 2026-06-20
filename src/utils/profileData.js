import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { mapReservationRow } from './supabaseReservations.js'
import { getPersonalRecordHistory } from '../services/personalRecordsService.ts'
import { getHumanErrorMessage, logAppError } from './appState.js'

export const profileEditableLevels = ['Iniciado', 'Rookie', 'Scaled', 'RX']

function getProfileError(message = 'No pudimos cargar tu perfil KUPAN. Intenta nuevamente.') {
  return { ok: false, message }
}

function getSafeProfileError(scope, error, fallback) {
  logAppError(scope, error)
  return getProfileError(getHumanErrorMessage(error, fallback))
}

export function calculateAge(birthDate) {
  if (!birthDate) return null

  const birthday = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(birthday.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthday.getFullYear()
  const monthDiff = today.getMonth() - birthday.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
    age -= 1
  }

  return age
}

export function calculateDaysRemaining(endDate) {
  if (!endDate) return null

  const today = new Date()
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const membershipEnd = new Date(`${endDate}T00:00:00`)

  if (Number.isNaN(membershipEnd.getTime())) return null

  const diff = membershipEnd.getTime() - todayDate.getTime()
  return Math.max(Math.ceil(diff / 86400000), 0)
}

export async function loadSupabaseProfileData(profileId) {
  if (!isSupabaseConfigured || !supabase) {
    return getProfileError('Supabase aun no esta configurado. Agrega tus variables en .env.local.')
  }

  if (!profileId) {
    return getProfileError('Inicia sesion para ver tu perfil KUPAN.')
  }

  const [profileResult, membershipResult, reservationsResult, recordsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, birth_date, level, role, status')
      .eq('id', profileId)
      .maybeSingle(),
    supabase.rpc('get_active_membership', { target_profile_id: profileId }),
    supabase
      .rpc('get_my_reservations'),
    getPersonalRecordHistory(),
  ])

  if (profileResult.error) return getSafeProfileError('profile.load_profile', profileResult.error, 'No fue posible cargar tus datos personales. Intenta nuevamente.')
  if (membershipResult.error) return getSafeProfileError('profile.load_membership', membershipResult.error, 'No fue posible cargar tu plan activo. Intenta nuevamente.')
  if (reservationsResult.error) return getSafeProfileError('profile.load_reservations', reservationsResult.error, 'No fue posible cargar tus reservas. Intenta nuevamente.')
  const recordsIssue = recordsResult.ok ? '' : 'No pudimos cargar tus últimos PR desde Supabase.'

  return {
    ok: true,
    data: {
      profile: profileResult.data,
      membership: Array.isArray(membershipResult.data) ? membershipResult.data[0] : membershipResult.data,
      reservations: (reservationsResult.data ?? []).map(mapReservationRow),
      records: recordsResult.ok ? (recordsResult.data ?? []).slice(0, 5) : [],
      recordsIssue,
    },
  }
}

export async function updateSupabaseProfile(profileId, values) {
  if (!isSupabaseConfigured || !supabase) {
    return getProfileError('Supabase aun no esta configurado. Agrega tus variables en .env.local.')
  }

  const fullName = (values.fullName ?? '').trim()
  const phone = (values.phone ?? '').trim()
  const birthDate = (values.birthDate ?? '').trim()
  const level = profileEditableLevels.includes(values.level) ? values.level : 'Iniciado'

  if (!fullName || !birthDate) {
    return getProfileError('Nombre y fecha de nacimiento son obligatorios.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone: phone || null,
      birth_date: birthDate,
      level,
    })
    .eq('id', profileId)
    .select('id, full_name, email, phone, birth_date, level, role, status')
    .single()

  if (error) {
    return getSafeProfileError('profile.update', error, 'No pudimos guardar tus cambios. Revisa los datos e intenta nuevamente.')
  }

  return { ok: true, profile: data, message: 'Perfil actualizado. A seguir entrenando fuerte.' }
}
