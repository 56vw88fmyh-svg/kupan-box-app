import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { mapReservationRow } from './supabaseReservations.js'
import { getPersonalRecordHistory } from '../services/personalRecordsService.ts'
import { getHumanErrorMessage, logAppError } from './appState.js'

export const profileEditableLevels = ['Iniciado', 'Rookie', 'Scaled', 'RX']

export function getMembershipTokenSummary(membership, remainingTokensOverride = undefined) {
  const isUnlimited = Boolean(membership?.plan?.is_unlimited ?? membership?.is_unlimited)

  if (isUnlimited) {
    return {
      isUnlimited: true,
      total: null,
      used: 0,
      remaining: null,
    }
  }

  const totalValue = Number(membership?.classes_total)
  const usedValue = Number(membership?.classes_used ?? 0)
  const total = Number.isFinite(totalValue) ? Math.max(totalValue, 0) : 0
  const used = Number.isFinite(usedValue) ? Math.min(Math.max(usedValue, 0), total) : 0
  const overrideValue = Number(remainingTokensOverride)
  const remaining = remainingTokensOverride !== undefined && remainingTokensOverride !== null && Number.isFinite(overrideValue)
    ? Math.min(Math.max(overrideValue, 0), total)
    : Math.max(total - used, 0)

  return {
    isUnlimited: false,
    total,
    used,
    remaining,
  }
}

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
  const membership = Array.isArray(membershipResult.data) ? membershipResult.data[0] : membershipResult.data
  let membershipWithPlan = membership ?? null
  let remainingTokens = null
  let membershipIssue = ''

  if (membership?.id) {
    const [remainingTokensResult, planResult] = await Promise.all([
      supabase.rpc('membership_remaining_tokens', { target_membership_id: membership.id }),
      membership.plan_id
        ? supabase
          .from('plans')
          .select('id, name, price, is_unlimited')
          .eq('id', membership.plan_id)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (remainingTokensResult.error) {
      logAppError('profile.load_remaining_tokens', remainingTokensResult.error)
      membershipIssue = 'No pudimos confirmar el saldo de tokens. Mostramos el cálculo disponible en tu membresía.'
    } else {
      remainingTokens = remainingTokensResult.data
    }

    if (planResult.error) {
      logAppError('profile.load_plan', planResult.error)
    }

    membershipWithPlan = {
      ...membership,
      plan: planResult.data ?? undefined,
    }
  }

  return {
    ok: true,
    data: {
      profile: profileResult.data,
      membership: membershipWithPlan,
      remainingTokens,
      membershipIssue,
      reservations: (reservationsResult.data ?? []).map(mapReservationRow),
      records: recordsResult.ok ? (recordsResult.data ?? []).slice(0, 5) : [],
      recordsIssue,
    },
  }
}

export function subscribeToProfileData(profileId, onChange) {
  if (!isSupabaseConfigured || !supabase || !profileId || typeof onChange !== 'function') {
    return () => {}
  }

  const profileFilter = `profile_id=eq.${profileId}`
  const channel = supabase
    .channel(`profile-sync:${profileId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships', filter: profileFilter }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_token_movements', filter: profileFilter }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: profileFilter }, onChange)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
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
