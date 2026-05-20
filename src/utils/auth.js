import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

export const athleteLevels = ['Iniciado', 'Rookie', 'Scaled', 'RX']

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function getSupabaseConfigError() {
  return {
    ok: false,
    message: 'Supabase aun no esta configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.',
  }
}

export function getAuthErrorMessage(error) {
  const message = error?.message?.toLowerCase() ?? ''

  if (message.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos. Revisa tus datos e intenta de nuevo.'
  }

  if (message.includes('email not confirmed')) {
    return 'Tu correo aun no esta confirmado. Revisa tu bandeja de entrada antes de iniciar sesion.'
  }

  if (message.includes('user already registered') || message.includes('already registered')) {
    return 'Ese correo ya esta registrado. Inicia sesion para seguir entrenando.'
  }

  if (message.includes('password') && message.includes('6')) {
    return 'Usa una contraseña de al menos 6 caracteres.'
  }

  if (message.includes('birth_date')) {
    return 'La fecha de nacimiento es obligatoria para crear tu perfil KUPAN.'
  }

  if (message.includes('network')) {
    return 'No pudimos conectar con Supabase. Revisa tu conexion e intenta nuevamente.'
  }

  return 'No pudimos completar la accion. Intenta nuevamente en unos segundos.'
}

export async function getProfileByUser(user) {
  if (!isSupabaseConfigured || !supabase || !user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, birth_date, level, role, status')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return null

  return data
}

export function mapSupabaseUser(user, profile = null) {
  if (!user) return null

  const metadata = user.user_metadata ?? {}
  const fullName = profile?.full_name ?? metadata.full_name ?? metadata.name ?? user.email?.split('@')[0] ?? 'Atleta KUPAN'

  return {
    id: user.id,
    name: fullName,
    email: profile?.email ?? user.email,
    phone: profile?.phone ?? metadata.phone ?? '',
    birthDate: profile?.birth_date ?? metadata.birth_date ?? '',
    level: profile?.level ?? metadata.level ?? 'Iniciado',
    role: profile?.role ?? 'student',
    status: profile?.status ?? 'active',
  }
}

export async function getCurrentSupabaseUser() {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null

  const profile = await getProfileByUser(data.user)
  return mapSupabaseUser(data.user, profile)
}

export async function loginWithSupabase({ email, password }) {
  if (!isSupabaseConfigured || !supabase) return getSupabaseConfigError()

  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !password) {
    return { ok: false, message: 'Completa correo y contraseña para entrar a KUPAN.' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error) {
    return { ok: false, message: getAuthErrorMessage(error) }
  }

  const profile = await getProfileByUser(data.user)
  return { ok: true, user: mapSupabaseUser(data.user, profile) }
}

export async function registerWithSupabase({ name, email, password, birthDate, level, phone }) {
  if (!isSupabaseConfigured || !supabase) return getSupabaseConfigError()

  const normalizedName = (name ?? '').trim()
  const normalizedEmail = normalizeEmail(email ?? '')
  const normalizedBirthDate = (birthDate ?? '').trim()
  const normalizedLevel = athleteLevels.includes(level) ? level : 'Iniciado'
  const normalizedPhone = (phone ?? '').trim()

  if (!normalizedName || !normalizedEmail || !password || !normalizedBirthDate) {
    return { ok: false, message: 'Completa nombre, correo, contraseña y fecha de nacimiento para crear tu cuenta.' }
  }

  if (password.length < 6) {
    return { ok: false, message: 'Usa una contraseña de al menos 6 caracteres.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: normalizedName,
        phone: normalizedPhone || null,
        birth_date: normalizedBirthDate,
        level: normalizedLevel,
      },
    },
  })

  if (error) {
    return { ok: false, message: getAuthErrorMessage(error) }
  }

  if (!data.session) {
    return {
      ok: true,
      user: null,
      message: 'Cuenta creada. Revisa tu correo para confirmar el acceso y luego inicia sesion.',
    }
  }

  const profile = await getProfileByUser(data.user)
  return { ok: true, user: mapSupabaseUser(data.user, profile) }
}

export async function logoutFromSupabase() {
  if (!isSupabaseConfigured || !supabase) return
  await supabase.auth.signOut()
}

export async function updateCurrentUserPassword(password) {
  if (!isSupabaseConfigured || !supabase) return getSupabaseConfigError()

  if (!password || password.length < 6) {
    return { ok: false, message: 'Usa una nueva contraseña de al menos 6 caracteres.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { ok: false, message: getAuthErrorMessage(error) }
  }

  return { ok: true, message: 'Contraseña actualizada. Tu cuenta queda más segura.' }
}
