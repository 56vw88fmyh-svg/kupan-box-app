import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kupan-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

function getChileDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, message: 'Metodo no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, message: 'Faltan variables seguras de Supabase.' }, 500)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, message: 'El cuerpo de la solicitud no es JSON valido.' }, 400)
  }

  const provider = cleanText(body.provider) || 'manual_test'
  const paymentReference = cleanText(body.payment_reference)
  const profileId = cleanText(body.profile_id)
  const planId = cleanText(body.plan_id)
  const status = cleanText(body.status)
  const isSimulated = body.simulated === true

  if (!paymentReference || !profileId || !planId || !status) {
    return jsonResponse({ ok: false, message: 'Faltan datos del pago: alumno, plan, referencia o estado.' }, 400)
  }

  if (status !== 'paid') {
    return jsonResponse({ ok: false, message: 'El pago no esta aprobado.' }, 400)
  }

  if (isSimulated) {
    const authHeader = req.headers.get('Authorization') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!anonKey || !authHeader) return jsonResponse({ ok: false, message: 'Sesion admin requerida para simulacion.' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return jsonResponse({ ok: false, message: 'Sesion admin invalida.' }, 401)

    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('role, status')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (adminProfile?.role !== 'admin' || adminProfile?.status !== 'active') {
      return jsonResponse({ ok: false, message: 'Solo admin puede simular pagos.' }, 403)
    }
  } else {
    if (!webhookSecret) {
      return jsonResponse({ ok: false, message: 'PAYMENT_WEBHOOK_SECRET no esta configurado. No se aceptan pagos reales sin secreto.' }, 500)
    }

    if (req.headers.get('x-kupan-webhook-secret') !== webhookSecret) {
      return jsonResponse({ ok: false, message: 'Firma de webhook invalida.' }, 401)
    }
  }

  const { data: existingMembership } = await adminClient
    .from('memberships')
    .select('id')
    .eq('payment_provider', provider)
    .eq('payment_reference', paymentReference)
    .maybeSingle()

  if (existingMembership) {
    return jsonResponse({ ok: true, membership_id: existingMembership.id, message: 'Pago ya procesado previamente.' })
  }

  const { data: plan, error: planError } = await adminClient
    .from('plans')
    .select('id, name, classes_per_week, is_unlimited')
    .eq('id', planId)
    .maybeSingle()

  if (planError || !plan) return jsonResponse({ ok: false, message: 'Plan no encontrado.' }, 404)

  const startDate = getChileDate()
  const endDateText = addDays(startDate, 30)

  await adminClient
    .from('memberships')
    .update({ status: 'expired' })
    .eq('profile_id', profileId)
    .eq('status', 'active')

  const { data: membership, error: membershipError } = await adminClient
    .from('memberships')
    .insert({
      profile_id: profileId,
      plan_id: planId,
      start_date: startDate,
      end_date: endDateText,
      expires_at: endDateText,
      status: 'active',
      notes: isSimulated ? 'Pago simulado por admin' : 'Pago confirmado por webhook',
      classes_total: getPlanClasses(plan),
      classes_used: 0,
      payment_status: 'paid',
      payment_provider: provider,
      payment_reference: paymentReference,
      activated_at: new Date().toISOString(),
      auto_activated: true,
    })
    .select('id')
    .single()

  if (membershipError) {
    return jsonResponse({ ok: false, message: 'No pudimos activar la membresia.' }, 500)
  }

  return jsonResponse({ ok: true, membership_id: membership.id, message: 'Membresia activada por pago confirmado.' })
})
