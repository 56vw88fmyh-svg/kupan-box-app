import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const allowedLevels = ['Iniciado', 'Rookie', 'Scaled', 'RX']
const allowedStatuses = ['active', 'inactive']

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function generatePassword() {
  const randomPart = crypto.randomUUID().replaceAll('-', '').slice(0, 10)
  return `Kupan-${randomPart}!`
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getPlanClasses(plan: { name: string; classes_per_week: number | null; is_unlimited: boolean }) {
  if (plan.is_unlimited) return null
  const match = plan.name.match(/\d+/)
  if (match) return Number(match[0])
  return plan.classes_per_week ? plan.classes_per_week * 4 : 0
}

function getCreateUserMessage(message = '') {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('already') || normalizedMessage.includes('registered')) {
    return 'Ese email ya existe en Supabase Auth. Usa otro correo o revisa el alumno existente.'
  }

  if (normalizedMessage.includes('password')) {
    return 'La contraseña temporal no cumple los requisitos mínimos.'
  }

  if (normalizedMessage.includes('email')) {
    return 'El email no es válido.'
  }

  return 'No pudimos crear el usuario en Supabase Auth.'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Metodo no permitido.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ ok: false, message: 'Faltan variables seguras de Supabase en la Edge Function.' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')

  if (!token) {
    return jsonResponse({ ok: false, message: 'Sesion admin requerida.' }, 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  if (userError || !userData.user) {
    return jsonResponse({ ok: false, message: 'Sesion invalida. Vuelve a iniciar sesion.' }, 401)
  }

  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from('profiles')
    .select('id, role, status')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (adminProfileError || adminProfile?.role !== 'admin' || adminProfile?.status !== 'active') {
    return jsonResponse({ ok: false, message: 'Acceso denegado. Solo admins KUPAN pueden crear alumnos.' }, 403)
  }

  let body: Record<string, unknown>

  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, message: 'El cuerpo de la solicitud no es JSON valido.' }, 400)
  }
  const fullName = cleanText(body.full_name)
  const email = cleanText(body.email).toLowerCase()
  const phone = cleanText(body.phone)
  const birthDate = cleanText(body.birth_date)
  const level = allowedLevels.includes(body.level) ? body.level : 'Iniciado'
  const status = allowedStatuses.includes(body.status) ? body.status : 'active'
  const internalNotes = cleanText(body.internal_notes)
  const planId = cleanText(body.plan_id)
  const membershipStartDate = cleanText(body.membership_start_date)
  const temporaryPassword = cleanText(body.temporary_password) || generatePassword()

  if (!fullName || !email || !birthDate || !level || !status) {
    return jsonResponse({ ok: false, message: 'Nombre, email, fecha de nacimiento, nivel y estado son obligatorios.' }, 400)
  }

  if (planId && !membershipStartDate) {
    return jsonResponse({ ok: false, message: 'Para asignar plan inicial debes enviar fecha de inicio.' }, 400)
  }

  const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone: phone || null,
      birth_date: birthDate,
      level,
    },
    app_metadata: {
      created_by_admin: true,
      internal_notes: internalNotes || null,
    },
  })

  if (createUserError || !createdUser.user) {
    return jsonResponse({ ok: false, message: getCreateUserMessage(createUserError?.message) }, 400)
  }

  const profilePayload = {
    id: createdUser.user.id,
    full_name: fullName,
    email,
    phone: phone || null,
    birth_date: birthDate,
    level,
    role: 'student',
    status,
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })

  if (profileError) {
    return jsonResponse({ ok: false, message: 'Usuario creado, pero no pudimos crear su profile.' }, 500)
  }

  if (planId) {
    const endDate = new Date(`${membershipStartDate}T00:00:00`)
    endDate.setDate(endDate.getDate() + 30)
    const membershipEndDate = endDate.toISOString().slice(0, 10)

    const { data: plan, error: planError } = await adminClient
      .from('plans')
      .select('id, name, classes_per_week, is_unlimited')
      .eq('id', planId)
      .maybeSingle()

    if (planError || !plan) {
      return jsonResponse({ ok: false, message: 'Alumno creado, pero el plan inicial no existe.' }, 404)
    }

    const { error: membershipError } = await adminClient.from('memberships').insert({
      profile_id: createdUser.user.id,
      plan_id: planId,
      start_date: membershipStartDate,
      end_date: membershipEndDate,
      expires_at: membershipEndDate,
      status: 'active',
      classes_total: getPlanClasses(plan),
      classes_used: 0,
      payment_status: 'paid',
      payment_provider: 'manual_admin',
      payment_reference: `initial-${createdUser.user.id}-${Date.now()}`,
      activated_at: new Date().toISOString(),
      auto_activated: false,
      notes: internalNotes || null,
    })

    if (membershipError) {
      return jsonResponse({ ok: false, message: 'Alumno creado, pero no pudimos crear su membresia inicial.' }, 500)
    }
  }

  return jsonResponse({
    ok: true,
    profile_id: createdUser.user.id,
    email,
    phone,
    temporary_password: temporaryPassword,
  })
})
