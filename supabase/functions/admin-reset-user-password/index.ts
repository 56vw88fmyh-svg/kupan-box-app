import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0'

const allowedOrigins = new Set([
  'https://kupan-box-app.vercel.app',
  'http://localhost:5173',
])

function getOrigin(req: Request) {
  return req.headers.get('Origin') ?? ''
}

function isAllowedOrigin(req: Request) {
  const origin = getOrigin(req)
  return !origin || allowedOrigins.has(origin)
}

function getCorsHeaders(req: Request) {
  const origin = getOrigin(req)
  const allowOrigin = allowedOrigins.has(origin) ? origin : 'https://kupan-box-app.vercel.app'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function jsonResponse(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function validatePassword(password: string) {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir una letra mayúscula.'
  if (!/[a-z]/.test(password)) return 'La contraseña debe incluir una letra minúscula.'
  if (!/\d/.test(password)) return 'La contraseña debe incluir un número.'
  if (!/[!@#$%^&*._-]/.test(password)) return 'La contraseña temporal debe incluir un símbolo.'
  if (password !== password.trim()) return 'La contraseña no puede tener espacios al inicio o al final.'
  return ''
}

async function writeAudit(
  adminClient: ReturnType<typeof createClient>,
  adminUserId: string,
  targetUserId: string,
  status: string,
) {
  await adminClient.from('admin_security_audit').insert({
    admin_user_id: adminUserId,
    target_user_id: targetUserId,
    action: 'temporary_password',
    method: 'temporary_password',
    status,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: isAllowedOrigin(req) ? 204 : 403,
      headers: getCorsHeaders(req),
    })
  }

  if (!isAllowedOrigin(req)) {
    return jsonResponse(req, { ok: false, message: 'Origen no permitido.' }, 403)
  }

  if (req.method !== 'POST') return jsonResponse(req, { ok: false, message: 'Metodo no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(req, { ok: false, message: 'Faltan variables seguras de Supabase en la Edge Function.' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')

  if (!token) {
    return jsonResponse(req, { ok: false, message: 'Sesion admin requerida.' }, 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  if (userError || !userData.user) {
    return jsonResponse(req, { ok: false, message: 'Sesion invalida. Vuelve a iniciar sesion.' }, 401)
  }

  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from('profiles')
    .select('id, role, status')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (adminProfileError || adminProfile?.role !== 'admin' || adminProfile?.status !== 'active') {
    return jsonResponse(req, { ok: false, message: 'Acceso denegado. Solo admins KUPAN pueden reasignar contraseñas.' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse(req, { ok: false, message: 'El cuerpo de la solicitud no es JSON valido.' }, 400)
  }

  const targetUserId = cleanText(body.userId)
  const temporaryPassword = typeof body.temporaryPassword === 'string' ? body.temporaryPassword : ''

  if (!targetUserId || !temporaryPassword) {
    return jsonResponse(req, { ok: false, message: 'Debes enviar alumno y contraseña temporal.' }, 400)
  }

  if (!isUuid(targetUserId)) {
    return jsonResponse(req, { ok: false, message: 'Alumno invalido.' }, 400)
  }

  if (targetUserId === userData.user.id) {
    await writeAudit(adminClient, userData.user.id, targetUserId, 'rejected_self_reset').catch(() => {})
    return jsonResponse(req, { ok: false, message: 'No puedes reasignar tu propia contraseña desde este panel.' }, 403)
  }

  const passwordError = validatePassword(temporaryPassword)
  if (passwordError) {
    await writeAudit(adminClient, userData.user.id, targetUserId, 'rejected').catch(() => {})
    return jsonResponse(req, { ok: false, message: passwordError }, 400)
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from('profiles')
    .select('id, email, role, status')
    .eq('id', targetUserId)
    .maybeSingle()

  if (targetProfileError || !targetProfile) {
    await writeAudit(adminClient, userData.user.id, targetUserId, 'not_found').catch(() => {})
    return jsonResponse(req, { ok: false, message: 'Alumno no encontrado.' }, 404)
  }

  if (targetProfile.role !== 'student') {
    await writeAudit(adminClient, userData.user.id, targetUserId, 'rejected_role').catch(() => {})
    return jsonResponse(req, { ok: false, message: 'Esta acción solo está permitida para cuentas de alumnos.' }, 403)
  }

  if (targetProfile.email && temporaryPassword.toLowerCase() === String(targetProfile.email).toLowerCase()) {
    await writeAudit(adminClient, userData.user.id, targetUserId, 'rejected').catch(() => {})
    return jsonResponse(req, { ok: false, message: 'La contraseña no puede ser igual al correo del alumno.' }, 400)
  }

  const { data: targetAuthUser, error: getUserError } = await adminClient.auth.admin.getUserById(targetUserId)
  if (getUserError || !targetAuthUser.user) {
    await writeAudit(adminClient, userData.user.id, targetUserId, 'auth_user_not_found').catch(() => {})
    return jsonResponse(req, { ok: false, message: 'Usuario no encontrado en Supabase Auth.' }, 404)
  }

  const currentMetadata = targetAuthUser.user.user_metadata ?? {}
  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    password: temporaryPassword,
    user_metadata: {
      ...currentMetadata,
      force_password_change: true,
    },
  })

  if (updateError) {
    await writeAudit(adminClient, userData.user.id, targetUserId, 'error').catch(() => {})
    return jsonResponse(req, { ok: false, message: 'No pudimos actualizar la contraseña temporal.' }, 500)
  }

  await writeAudit(adminClient, userData.user.id, targetUserId, 'success').catch(() => {})

  return jsonResponse(req, {
    ok: true,
    message: 'Contraseña temporal asignada correctamente. El alumno deberá cambiarla al iniciar sesión.',
  })
})
