import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getPasswordErrorMessage } from './passwordSecurity.js'

function getConfigError() {
  return { ok: false, message: 'Supabase no está configurado para gestionar contraseñas.' }
}

function getRedirectUrl() {
  const publicUrl = import.meta.env?.VITE_PUBLIC_APP_URL || import.meta.env?.VITE_APP_URL
  const browserOrigin = window.location.origin
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const origin = publicUrl || (isLocal ? browserOrigin : 'https://kupan-box-app.vercel.app')
  return `${origin.replace(/\/$/, '')}/actualizar-password`
}

async function auditSecurityAction({ targetUserId, action, status }) {
  if (!isSupabaseConfigured || !supabase) return

  try {
    const { data } = await supabase.auth.getUser()
    if (!data?.user?.id) return
    await supabase.from('admin_security_audit').insert({
      admin_user_id: data.user.id,
      target_user_id: targetUserId,
      action,
      method: action === 'password_recovery_email' ? 'recovery_email' : 'temporary_password',
      status,
    })
  } catch {
    // La auditoría no debe exponer detalles ni bloquear el flujo principal.
  }
}

export async function sendStudentRecoveryEmail(student) {
  if (!isSupabaseConfigured || !supabase) return getConfigError()

  const email = String(student?.email ?? '').trim().toLowerCase()
  if (!email) return { ok: false, message: 'El alumno no tiene correo registrado.' }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRedirectUrl(),
  })

  await auditSecurityAction({
    targetUserId: student.id,
    action: 'password_recovery_email',
    status: error ? 'error' : 'success',
  })

  if (error) {
    return { ok: false, message: getPasswordErrorMessage(error) }
  }

  return { ok: true, message: `Correo de recuperación enviado a ${email}.` }
}

export async function assignTemporaryPassword(student, temporaryPassword) {
  if (!isSupabaseConfigured || !supabase) return getConfigError()

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) {
    return { ok: false, message: 'Tu sesión admin venció. Vuelve a iniciar sesión.' }
  }

  const { data, error } = await supabase.functions.invoke('admin-reset-user-password', {
    body: {
      userId: student.id,
      temporaryPassword,
    },
  })

  if (error) {
    return { ok: false, message: getPasswordErrorMessage(error) }
  }

  if (!data?.ok) {
    return { ok: false, message: data?.message ?? 'No pudimos asignar la contraseña temporal.' }
  }

  return {
    ok: true,
    message: 'Contraseña temporal asignada correctamente. El alumno deberá cambiarla al iniciar sesión.',
  }
}
