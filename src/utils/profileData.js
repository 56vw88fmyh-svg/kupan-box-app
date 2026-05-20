import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

export const profileEditableLevels = ['Iniciado', 'Rookie', 'Scaled', 'RX']

function getProfileError(message = 'No pudimos cargar tu perfil KUPAN. Intenta nuevamente.') {
  return { ok: false, message }
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
    supabase
      .from('memberships')
      .select('id, start_date, end_date, status, notes, plan:plans(id, name, price, classes_per_week, is_unlimited)')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('reservations')
      .select('id, reservation_date, status, created_at, class_schedule:class_schedule(id, day_of_week, time, class_name, coach, max_spots)')
      .eq('profile_id', profileId)
      .eq('status', 'reserved')
      .gte('reservation_date', new Date().toISOString().slice(0, 10))
      .order('reservation_date', { ascending: true }),
    supabase
      .from('personal_records')
      .select('id, movement, value, unit, record_date, notes')
      .eq('profile_id', profileId)
      .order('record_date', { ascending: false })
      .limit(5),
  ])

  if (profileResult.error) return getProfileError('No pudimos cargar tus datos personales desde Supabase.')
  if (membershipResult.error) return getProfileError('No pudimos cargar tu plan activo desde Supabase.')
  if (reservationsResult.error) return getProfileError('No pudimos cargar tus reservas desde Supabase.')
  if (recordsResult.error) return getProfileError('No pudimos cargar tus ultimos PR desde Supabase.')

  return {
    ok: true,
    data: {
      profile: profileResult.data,
      membership: membershipResult.data,
      reservations: reservationsResult.data ?? [],
      records: recordsResult.data ?? [],
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
    return getProfileError('No pudimos guardar tus cambios. Revisa los datos e intenta nuevamente.')
  }

  return { ok: true, profile: data, message: 'Perfil actualizado. A seguir entrenando fuerte.' }
}
