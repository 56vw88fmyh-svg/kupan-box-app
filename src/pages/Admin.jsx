import { useEffect, useMemo, useState } from 'react'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { buildBirthdayGreeting, formatBirthdayDayMonth, loadUpcomingBirthdays } from '../utils/birthdays.js'
import { defaultAppText } from '../utils/adminContent.js'
import { saveAppSetting } from '../utils/sharedContent.js'

const adminTabs = [
  { id: 'overview', label: 'Resumen' },
  { id: 'create-student', label: 'Crear alumno' },
  { id: 'students', label: 'Alumnos' },
  { id: 'plans', label: 'Planes' },
  { id: 'memberships', label: 'Membresias' },
  { id: 'reservations', label: 'Reservas' },
  { id: 'wod', label: 'WOD' },
  { id: 'schedule', label: 'Horarios' },
  { id: 'community', label: 'Comunidad' },
  { id: 'texts', label: 'Textos' },
  { id: 'birthdays', label: 'Cumpleanos' },
  { id: 'prs', label: 'PR destacados' },
]

const emptyPlan = { id: '', name: '', price: '', classes_per_week: '', is_unlimited: false, active: true }
const emptyMembership = {
  profile_id: '',
  plan_id: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  status: 'active',
  classes_total: '',
  payment_status: 'paid',
  payment_provider: 'manual_admin',
  payment_reference: '',
  notes: '',
}
const emptyMembershipEdit = { id: '', profile_id: '', plan_id: '', start_date: '', end_date: '', status: 'active', classes_total: '', classes_used: 0, payment_status: 'paid', notes: '' }
const emptyWod = { date: new Date().toISOString().slice(0, 10), title: '', warmup: '', strength: '', workout: '', time_cap: '', notes: '' }
const emptySchedule = { id: '', day_of_week: 1, time: '18:00', class_name: 'CrossFit', coach: 'Coach KUPAN', max_spots: 12, active: true }
const emptyPost = { id: '', type: 'noticia', title: '', content: '', event_date: '', active: true }
const settingKeys = {
  homeEyebrow: 'home_eyebrow',
  homeTitle: 'home_title',
  homeBody: 'home_body',
  reservationsTitle: 'reservations_title',
  reservationsBody: 'reservations_body',
  communityPhrase: 'community_phrase',
}
const emptyStudent = {
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

function buildWhatsAppUrl(phone, credentials) {
  const cleanedPhone = phone.replace(/\D/g, '')
  const chilePhone = cleanedPhone.startsWith('56') ? cleanedPhone : `56${cleanedPhone}`
  const text = [
    'Hola, bienvenido/a a KUPAN.',
    '',
    'Tus credenciales temporales para entrar a la app son:',
    `Correo: ${credentials.email}`,
    `Clave temporal: ${credentials.password}`,
    '',
    'Al entrar puedes cambiar tu contraseña desde tu cuenta.',
  ].join('\n')

  return `https://wa.me/${chilePhone}?text=${encodeURIComponent(text)}`
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-white/60">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
        type={type}
        value={value ?? ''}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function TextArea({ label, value, onChange, rows = 4 }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-white/60">{label}</span>
      <textarea
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold leading-6 text-white outline-none transition focus:border-kupan-ember"
        rows={rows}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-white/60">{label}</span>
      <select
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2">
      <span className="text-xs font-black uppercase text-white/60">{label}</span>
      <input
        className="h-5 w-5 accent-kupan-ember"
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

function AdminSection({ title, eyebrow, children }) {
  return (
    <section className="k-card p-5">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function SmallRow({ title, meta, detail, action }) {
  return (
    <article className="k-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">{meta}</p>
          <h3 className="mt-2 break-words text-lg font-black uppercase text-white">{title}</h3>
          {detail ? <p className="mt-1 text-sm leading-6 text-white/60">{detail}</p> : null}
        </div>
        {action}
      </div>
    </article>
  )
}

function formatDate(date) {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0))
}

function toTime(value) {
  return value ? value.slice(0, 5) : ''
}

function addDays(dateText, days) {
  const date = dateText ? new Date(`${dateText}T00:00:00`) : new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getPlanTokenTotal(plan) {
  if (!plan || plan.is_unlimited) return ''
  const match = String(plan.name ?? '').match(/\d+/)
  if (match) return Number(match[0])
  return plan.classes_per_week ? Number(plan.classes_per_week) * 4 : ''
}

function getMembershipTokens(membership) {
  const isUnlimited = Boolean(membership.plan?.is_unlimited)
  const total = membership.classes_total
  const used = Number(membership.classes_used ?? 0)
  return {
    total: isUnlimited ? 'Ilimitado' : total ?? 0,
    used: isUnlimited ? 'No descuenta' : used,
    remaining: isUnlimited ? 'Ilimitado' : Math.max(Number(total ?? 0) - used, 0),
  }
}

async function loadAdminData() {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Supabase aun no esta configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.' }
  }

  const today = new Date().toISOString().slice(0, 10)
  const [
    profiles,
    plans,
    memberships,
    reservations,
    wod,
    schedule,
    posts,
    settings,
    birthdays,
    prs,
    tokenMovements,
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, phone, birth_date, level, role, status, created_at').order('created_at', { ascending: false }),
    supabase.from('plans').select('id, name, price, classes_per_week, is_unlimited, active, created_at').order('price', { ascending: true }),
    supabase.from('memberships').select('id, profile_id, plan_id, start_date, end_date, status, notes, classes_total, classes_used, expires_at, payment_status, payment_provider, payment_reference, activated_at, auto_activated, profile:profiles(full_name, email), plan:plans(name, price, classes_per_week, is_unlimited)').order('end_date', { ascending: false }),
    supabase.from('reservations').select('id, profile_id, class_schedule_id, membership_id, reservation_date, status, token_charged, cancelled_at, created_at, profile:profiles(full_name, email), class_schedule:class_schedule(day_of_week, time, class_name, coach)').gte('reservation_date', today).order('reservation_date', { ascending: true }),
    supabase.from('wod').select('id, date, title, warmup, strength, workout, time_cap, notes').order('date', { ascending: false }).limit(14),
    supabase.from('class_schedule').select('id, day_of_week, time, class_name, coach, max_spots, active').order('day_of_week', { ascending: true }).order('time', { ascending: true }),
    supabase.from('community_posts').select('id, type, title, content, event_date, active, created_at').order('created_at', { ascending: false }),
    supabase.from('app_settings').select('key, value'),
    supabase.rpc('birthdays_this_month'),
    supabase.from('personal_records').select('id, movement, value, unit, record_date, notes, profile:profiles(full_name, email)').order('value', { ascending: false }).limit(20),
    supabase.from('membership_token_movements').select('id, membership_id, profile_id, reservation_id, movement_type, quantity, reason, created_at, created_by, profile:profiles(full_name, email)').order('created_at', { ascending: false }).limit(80),
  ])

  const firstError = [profiles, plans, memberships, reservations, wod, schedule, posts, birthdays, prs, tokenMovements].find((result) => result.error)
  if (firstError?.error) {
    return { ok: false, message: 'No pudimos cargar datos admin desde Supabase. Revisa RLS, role admin y tablas.' }
  }

  return {
    ok: true,
    data: {
      profiles: profiles.data ?? [],
      plans: plans.data ?? [],
      memberships: memberships.data ?? [],
      reservations: reservations.data ?? [],
      wod: wod.data ?? [],
      schedule: schedule.data ?? [],
      posts: posts.data ?? [],
      settings: settings.error ? [] : settings.data ?? [],
      birthdays: birthdays.data ?? [],
      upcomingBirthdays: [],
      prs: prs.data ?? [],
      tokenMovements: tokenMovements.data ?? [],
    },
  }
}

export function Admin({ currentUser, setActivePage, onContentChange }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [adminData, setAdminData] = useState({
    profiles: [],
    plans: [],
    memberships: [],
    reservations: [],
    wod: [],
    schedule: [],
    posts: [],
    settings: [],
    birthdays: [],
    upcomingBirthdays: [],
    prs: [],
    tokenMovements: [],
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isLoading, setIsLoading] = useState(false)
  const [planDraft, setPlanDraft] = useState(emptyPlan)
  const [membershipDraft, setMembershipDraft] = useState(emptyMembership)
  const [membershipEditDraft, setMembershipEditDraft] = useState(emptyMembershipEdit)
  const [wodDraft, setWodDraft] = useState(emptyWod)
  const [scheduleDraft, setScheduleDraft] = useState(emptySchedule)
  const [postDraft, setPostDraft] = useState(emptyPost)
  const [studentDraft, setStudentDraft] = useState(emptyStudent)
  const [textDraft, setTextDraft] = useState(defaultAppText)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [isCreatingStudent, setIsCreatingStudent] = useState(false)

  const isAdmin = currentUser?.role === 'admin'

  const totals = useMemo(() => ({
    students: adminData.profiles.filter((profile) => profile.role === 'student').length,
    activeMemberships: adminData.memberships.filter((membership) => membership.status === 'active').length,
    reservations: adminData.reservations.filter((reservation) => reservation.status === 'reserved').length,
    plans: adminData.plans.filter((plan) => plan.active).length,
  }), [adminData])

  const activeMembershipByProfile = useMemo(() => {
    const membershipsByProfile = new Map()

    adminData.memberships
      .filter((membership) => membership.status === 'active')
      .forEach((membership) => {
        if (!membershipsByProfile.has(membership.profile_id)) {
          membershipsByProfile.set(membership.profile_id, membership)
        }
      })

    return membershipsByProfile
  }, [adminData.memberships])

  async function refreshData() {
    setIsLoading(true)
    setMessage('')
    const result = await loadAdminData()
    setIsLoading(false)

    if (!result.ok) {
      setMessageType('error')
      setMessage(result.message)
      return
    }

    setAdminData(result.data)
    setTextDraft({
      homeEyebrow: result.data.settings.find((item) => item.key === 'home_eyebrow')?.value ?? defaultAppText.homeEyebrow,
      homeTitle: result.data.settings.find((item) => item.key === 'home_title')?.value ?? defaultAppText.homeTitle,
      homeBody: result.data.settings.find((item) => item.key === 'home_body')?.value ?? defaultAppText.homeBody,
      reservationsTitle: result.data.settings.find((item) => item.key === 'reservations_title')?.value ?? defaultAppText.reservationsTitle,
      reservationsBody: result.data.settings.find((item) => item.key === 'reservations_body')?.value ?? defaultAppText.reservationsBody,
      communityPhrase: result.data.settings.find((item) => item.key === 'community_phrase')?.value ?? defaultAppText.communityPhrase,
    })

    const upcomingBirthdays = await loadUpcomingBirthdays(30)
    if (upcomingBirthdays.ok) {
      setAdminData((current) => ({ ...current, upcomingBirthdays: upcomingBirthdays.birthdays }))
    }
  }

  useEffect(() => {
    if (isAdmin) refreshData()
  }, [isAdmin])

  async function savePlan(event) {
    event.preventDefault()
    const payload = {
      name: planDraft.name.trim(),
      price: Number(planDraft.price),
      classes_per_week: planDraft.classes_per_week === '' ? null : Number(planDraft.classes_per_week),
      is_unlimited: planDraft.is_unlimited,
      active: planDraft.active,
    }
    const { error } = planDraft.id
      ? await supabase.from('plans').update(payload).eq('id', planDraft.id)
      : await supabase.from('plans').insert(payload)
    if (error) return setMessage('No pudimos guardar el plan.')
    setPlanDraft(emptyPlan)
    setMessageType('success')
    setMessage('Plan guardado en Supabase.')
    refreshData()
    onContentChange?.()
  }

  async function togglePlan(plan) {
    const { error } = await supabase.from('plans').update({ active: !plan.active }).eq('id', plan.id)
    if (error) return setMessage('No pudimos actualizar el plan.')
    refreshData()
    onContentChange?.()
  }

  function editPlan(plan) {
    setPlanDraft({
      id: plan.id,
      name: plan.name,
      price: String(plan.price),
      classes_per_week: plan.classes_per_week ?? '',
      is_unlimited: plan.is_unlimited,
      active: plan.active,
    })
  }

  async function saveMembership(event) {
    event.preventDefault()
    const selectedPlan = adminData.plans.find((plan) => plan.id === membershipDraft.plan_id)
    const startDate = membershipDraft.start_date || new Date().toISOString().slice(0, 10)
    const endDate = membershipDraft.end_date || addDays(startDate, 30)
    const payload = {
      profile_id: membershipDraft.profile_id,
      plan_id: membershipDraft.plan_id,
      start_date: startDate,
      end_date: endDate,
      expires_at: endDate,
      status: membershipDraft.status,
      classes_total: selectedPlan?.is_unlimited ? null : Number(membershipDraft.classes_total || getPlanTokenTotal(selectedPlan) || 0),
      classes_used: 0,
      payment_status: membershipDraft.payment_status,
      payment_provider: membershipDraft.payment_provider || 'manual_admin',
      payment_reference: membershipDraft.payment_reference || `manual-${membershipDraft.profile_id}-${Date.now()}`,
      activated_at: membershipDraft.status === 'active' ? new Date().toISOString() : null,
      auto_activated: false,
      notes: membershipDraft.notes || null,
    }

    if (!payload.profile_id || !payload.plan_id || !payload.start_date || !payload.end_date) {
      setMessageType('error')
      setMessage('Selecciona alumno, plan, inicio y vencimiento.')
      return
    }

    if (payload.status === 'active') {
      await supabase
        .from('memberships')
        .update({ status: 'expired' })
        .eq('profile_id', payload.profile_id)
        .eq('status', 'active')
    }

    const { error } = await supabase.from('memberships').insert(payload)
    if (error) return setMessage('No pudimos crear la membresia.')
    setMembershipDraft(emptyMembership)
    setMessageType('success')
    setMessage('Membresia creada en Supabase.')
    refreshData()
  }

  function startEditMembership(membership) {
    setMembershipEditDraft({
      id: membership.id,
      profile_id: membership.profile_id,
      plan_id: membership.plan_id,
      start_date: membership.start_date,
      end_date: membership.end_date,
      status: membership.status,
      classes_total: membership.classes_total ?? '',
      classes_used: membership.classes_used ?? 0,
      payment_status: membership.payment_status ?? 'paid',
      notes: membership.notes ?? '',
    })
    setMessage('')
  }

  async function saveMembershipEdit(event) {
    event.preventDefault()

    if (!membershipEditDraft.id) {
      setMessageType('error')
      setMessage('Selecciona una membresia para editar.')
      return
    }

    const payload = {
      plan_id: membershipEditDraft.plan_id,
      start_date: membershipEditDraft.start_date,
      end_date: membershipEditDraft.end_date,
      expires_at: membershipEditDraft.end_date,
      status: membershipEditDraft.status,
      classes_total: membershipEditDraft.classes_total === '' ? null : Number(membershipEditDraft.classes_total),
      classes_used: Number(membershipEditDraft.classes_used ?? 0),
      payment_status: membershipEditDraft.payment_status,
      activated_at: membershipEditDraft.status === 'active' ? new Date().toISOString() : null,
      notes: membershipEditDraft.notes || null,
    }

    if (payload.status === 'active') {
      await supabase
        .from('memberships')
        .update({ status: 'expired' })
        .eq('profile_id', membershipEditDraft.profile_id)
        .eq('status', 'active')
        .neq('id', membershipEditDraft.id)
    }

    const { error } = await supabase.from('memberships').update(payload).eq('id', membershipEditDraft.id)
    if (error) {
      setMessageType('error')
      setMessage('No pudimos guardar los cambios de membresia.')
      return
    }

    setMembershipEditDraft(emptyMembershipEdit)
    setMessageType('success')
    setMessage('Membresia actualizada.')
    refreshData()
  }

  async function updateMembershipStatus(membership, status) {
    const payload = { status }
    if (status === 'active') {
      await supabase
        .from('memberships')
        .update({ status: 'expired' })
        .eq('profile_id', membership.profile_id)
        .eq('status', 'active')
        .neq('id', membership.id)
      payload.payment_status = membership.payment_status === 'paid' ? membership.payment_status : 'paid'
      payload.activated_at = membership.activated_at ?? new Date().toISOString()
    }

    const { error } = await supabase.from('memberships').update(payload).eq('id', membership.id)
    if (error) return setMessage('No pudimos actualizar la membresia.')
    refreshData()
  }

  async function saveWod(event) {
    event.preventDefault()
    const { error } = await supabase.from('wod').upsert(wodDraft, { onConflict: 'date' })
    if (error) return setMessage('No pudimos guardar el WOD.')
    setWodDraft(emptyWod)
    setMessageType('success')
    setMessage('WOD guardado en Supabase.')
    refreshData()
    onContentChange?.()
  }

  async function saveSchedule(event) {
    event.preventDefault()
    const payload = {
      day_of_week: Number(scheduleDraft.day_of_week),
      time: scheduleDraft.time,
      class_name: scheduleDraft.class_name,
      coach: scheduleDraft.coach,
      max_spots: Number(scheduleDraft.max_spots),
      active: scheduleDraft.active,
    }
    const { error } = scheduleDraft.id
      ? await supabase.from('class_schedule').update(payload).eq('id', scheduleDraft.id)
      : await supabase.from('class_schedule').insert(payload)
    if (error) return setMessage('No pudimos guardar el horario.')
    setScheduleDraft(emptySchedule)
    setMessageType('success')
    setMessage('Horario guardado en Supabase.')
    refreshData()
    onContentChange?.()
  }

  async function toggleSchedule(classItem) {
    const { error } = await supabase.from('class_schedule').update({ active: !classItem.active }).eq('id', classItem.id)
    if (error) return setMessage('No pudimos actualizar el horario.')
    refreshData()
    onContentChange?.()
  }

  function editSchedule(classItem) {
    setScheduleDraft({
      id: classItem.id,
      day_of_week: classItem.day_of_week,
      time: classItem.time.slice(0, 5),
      class_name: classItem.class_name,
      coach: classItem.coach ?? '',
      max_spots: classItem.max_spots,
      active: classItem.active,
    })
  }

  async function savePost(event) {
    event.preventDefault()
    const payload = {
      type: postDraft.type,
      title: postDraft.title,
      content: postDraft.content,
      event_date: postDraft.event_date || null,
      active: postDraft.active,
    }
    const { error } = postDraft.id
      ? await supabase.from('community_posts').update(payload).eq('id', postDraft.id)
      : await supabase.from('community_posts').insert(payload)
    if (error) return setMessage('No pudimos guardar la publicacion.')
    setPostDraft(emptyPost)
    setMessageType('success')
    setMessage('Publicacion guardada en Supabase.')
    refreshData()
    onContentChange?.()
  }

  async function togglePost(post) {
    const { error } = await supabase.from('community_posts').update({ active: !post.active }).eq('id', post.id)
    if (error) return setMessage('No pudimos actualizar la publicacion.')
    refreshData()
    onContentChange?.()
  }

  function editPost(post) {
    setPostDraft({
      id: post.id,
      type: post.type ?? 'noticia',
      title: post.title,
      content: post.content ?? '',
      event_date: post.event_date ?? '',
      active: post.active,
    })
  }

  async function saveTexts(event) {
    event.preventDefault()
    const results = await Promise.all(
      Object.entries(settingKeys).map(([field, key]) => saveAppSetting(key, textDraft[field])),
    )
    const failed = results.find((result) => !result.ok)

    if (failed) {
      setMessageType('error')
      setMessage(failed.message)
      return
    }

    setMessageType('success')
    setMessage('Textos principales guardados en Supabase.')
    refreshData()
    onContentChange?.()
  }

  async function updateReservationStatus(reservationId, status) {
    const result = status === 'cancelled'
      ? await supabase.rpc('cancel_reservation', { target_reservation_id: reservationId })
      : await supabase.from('reservations').update({ status }).eq('id', reservationId)
    const { error } = result

    if (error) {
      setMessageType('error')
      setMessage(error.message || 'No pudimos actualizar la reserva.')
      return
    }

    setMessageType('success')
    setMessage(status === 'cancelled' ? 'Reserva cancelada. Si correspondia, el token fue devuelto.' : 'Reserva actualizada. El token queda consumido.')
    refreshData()
  }

  async function simulateApprovedPayment() {
    setMessage('')
    setMessageType('error')

    if (!membershipDraft.profile_id || !membershipDraft.plan_id) {
      setMessage('Selecciona alumno y plan para simular un pago aprobado.')
      return
    }

    const { data, error } = await supabase.functions.invoke('payment-webhook', {
      body: {
        provider: 'manual_test',
        payment_reference: `test-${membershipDraft.profile_id}-${membershipDraft.plan_id}-${Date.now()}`,
        profile_id: membershipDraft.profile_id,
        plan_id: membershipDraft.plan_id,
        status: 'paid',
        simulated: true,
      },
    })

    if (error || !data?.ok) {
      setMessage(data?.message || 'No pudimos simular el pago. Revisa la Edge Function payment-webhook.')
      return
    }

    setMessageType('success')
    setMessage('Pago simulado aprobado. Membresia activada por 30 dias.')
    setMembershipDraft(emptyMembership)
    refreshData()
  }

  async function createStudent(event) {
    event.preventDefault()
    setMessage('')
    setMessageType('error')
    setCreatedCredentials(null)

    if (!studentDraft.full_name.trim() || !studentDraft.email.trim() || !studentDraft.birth_date || !studentDraft.level || !studentDraft.status) {
      setMessage('Completa nombre, email, fecha de nacimiento, nivel y estado.')
      return
    }

    if (studentDraft.plan_id && (!studentDraft.membership_start_date || !studentDraft.membership_end_date)) {
      setMessage('Si asignas plan inicial, agrega fecha de inicio y vencimiento.')
      return
    }

    setIsCreatingStudent(true)

    const { data, error } = await supabase.functions.invoke('create-student', {
      body: {
        full_name: studentDraft.full_name,
        email: studentDraft.email,
        phone: studentDraft.phone || null,
        birth_date: studentDraft.birth_date,
        level: studentDraft.level,
        status: studentDraft.status,
        temporary_password: studentDraft.temporary_password || null,
        internal_notes: studentDraft.internal_notes || null,
        plan_id: studentDraft.plan_id || null,
        membership_start_date: studentDraft.membership_start_date || null,
        membership_end_date: studentDraft.membership_end_date || null,
      },
    })

    setIsCreatingStudent(false)

    if (error || !data?.ok) {
      setMessage(data?.message || 'No pudimos crear el alumno. Revisa la Edge Function y tu sesion admin.')
      return
    }

    setMessageType('success')
    setMessage('Alumno creado en Supabase Auth y profiles.')
    setCreatedCredentials({
      email: data.email,
      password: data.temporary_password,
      phone: data.phone,
    })
    setStudentDraft(emptyStudent)
    refreshData()
  }

  async function copyCredentials() {
    if (!createdCredentials) return

    const text = [
      'Credenciales KUPAN',
      `Correo: ${createdCredentials.email}`,
      `Clave temporal: ${createdCredentials.password}`,
    ].join('\n')

    await window.navigator.clipboard.writeText(text)
    setMessageType('success')
    setMessage('Credenciales copiadas. Recuerda: la clave temporal se muestra solo ahora.')
  }

  async function copyBirthdayGreeting(birthday) {
    await window.navigator.clipboard.writeText(buildBirthdayGreeting(birthday))
    setMessageType('success')
    setMessage(`Saludo de cumpleaños copiado para ${birthday.full_name}.`)
  }

  if (!currentUser) {
    return (
      <section className="k-card p-5">
        <p className="k-pill inline-flex text-kupan-flame">Admin KUPAN</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Inicia sesion para entrar al panel.</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">El acceso admin ahora depende del rol del perfil en Supabase.</p>
        <button type="button" className="k-button mt-5 w-full" onClick={() => setActivePage('login')}>
          Iniciar sesion
        </button>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="k-card p-5">
        <p className="k-pill inline-flex text-kupan-flame">Acceso denegado</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Este panel es solo para admins KUPAN.</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Tu perfil esta activo como alumno. Para entrar, tu usuario debe tener role = admin en Supabase.
        </p>
        <button type="button" className="k-button-secondary mt-5 w-full" onClick={() => setActivePage('profile')}>
          Volver a perfil
        </button>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className="k-card p-5">
        <p className="k-pill inline-flex text-kupan-flame">Admin Supabase</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Control real del box</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Panel conectado a Supabase. Los cambios quedan guardados en la base de datos y protegidos por RLS.
        </p>
        <div className="mt-5 grid grid-cols-4 gap-2">
          <div className="k-stat"><p className="text-2xl font-black text-white">{totals.students}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Alumnos</p></div>
          <div className="k-stat"><p className="text-2xl font-black text-white">{totals.activeMemberships}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Membresias</p></div>
          <div className="k-stat"><p className="text-2xl font-black text-white">{totals.reservations}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Reservas</p></div>
          <div className="k-stat"><p className="text-2xl font-black text-white">{totals.plans}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Planes</p></div>
        </div>
        <button type="button" className="k-button mt-5 w-full" onClick={refreshData} disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Actualizar datos'}
        </button>
        {message ? (
          <p className={`mt-3 rounded-lg border p-3 text-sm font-bold text-white ${
            messageType === 'success' ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-kupan-flame/30 bg-kupan-flame/10'
          }`}
          >
            {message}
          </p>
        ) : null}
      </section>

      <nav className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-10 -mx-4 overflow-x-auto border-y border-white/10 bg-kupan-black/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex gap-2">
          {adminTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-black uppercase transition ${
                activeSection === tab.id ? 'bg-kupan-ember text-white shadow-glow' : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
              }`}
              onClick={() => setActiveSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {activeSection === 'overview' ? (
        <section className="grid gap-3 md:grid-cols-4">
          <SmallRow title={`${totals.students} alumnos`} meta="Comunidad" detail="Perfiles registrados en Supabase." />
          <SmallRow title={`${totals.activeMemberships} activas`} meta="Membresias" detail="Planes vigentes del box." />
          <SmallRow title={`${totals.reservations} reservas`} meta="Agenda" detail="Reservas futuras confirmadas." />
          <SmallRow title={`${adminData.prs.length} PR`} meta="Progreso" detail="Marcas recientes destacadas." />
        </section>
      ) : null}

      {activeSection === 'create-student' ? (
        <AdminSection eyebrow="Crear alumno" title="Nuevo atleta KUPAN">
          <form className="k-panel space-y-4 p-4" onSubmit={createStudent}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre completo" value={studentDraft.full_name} required onChange={(value) => setStudentDraft((current) => ({ ...current, full_name: value }))} />
              <Field label="Email" type="email" value={studentDraft.email} required onChange={(value) => setStudentDraft((current) => ({ ...current, email: value }))} />
              <Field label="Fecha de nacimiento" type="date" value={studentDraft.birth_date} required onChange={(value) => setStudentDraft((current) => ({ ...current, birth_date: value }))} />
              <Field label="Telefono opcional" type="tel" value={studentDraft.phone} onChange={(value) => setStudentDraft((current) => ({ ...current, phone: value }))} />
              <SelectField label="Nivel" value={studentDraft.level} onChange={(value) => setStudentDraft((current) => ({ ...current, level: value }))}>
                {['Iniciado', 'Rookie', 'Scaled', 'RX'].map((level) => <option key={level} className="bg-kupan-black" value={level}>{level}</option>)}
              </SelectField>
              <SelectField label="Estado" value={studentDraft.status} onChange={(value) => setStudentDraft((current) => ({ ...current, status: value }))}>
                {['active', 'inactive'].map((status) => <option key={status} className="bg-kupan-black" value={status}>{status}</option>)}
              </SelectField>
              <Field label="Contraseña temporal opcional" type="text" value={studentDraft.temporary_password} onChange={(value) => setStudentDraft((current) => ({ ...current, temporary_password: value }))} />
              <SelectField label="Plan inicial opcional" value={studentDraft.plan_id} onChange={(value) => setStudentDraft((current) => ({ ...current, plan_id: value }))}>
                <option className="bg-kupan-black" value="">Sin plan inicial</option>
                {adminData.plans.filter((plan) => plan.active).map((plan) => <option key={plan.id} className="bg-kupan-black" value={plan.id}>{plan.name}</option>)}
              </SelectField>
              <Field label="Inicio plan" type="date" value={studentDraft.membership_start_date} onChange={(value) => setStudentDraft((current) => ({ ...current, membership_start_date: value }))} />
              <Field label="Vencimiento plan" type="date" value={studentDraft.membership_end_date} onChange={(value) => setStudentDraft((current) => ({ ...current, membership_end_date: value }))} />
            </div>
            <TextArea label="Observaciones internas" value={studentDraft.internal_notes} onChange={(value) => setStudentDraft((current) => ({ ...current, internal_notes: value }))} />
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/60">
              Esta accion llama una Edge Function segura. La service_role key vive solo en Supabase, nunca en el frontend.
            </div>
            <button type="submit" className="k-button w-full" disabled={isCreatingStudent}>
              {isCreatingStudent ? 'Creando alumno...' : 'Crear alumno'}
            </button>
          </form>

          {createdCredentials ? (
            <div className="k-panel space-y-4 border-kupan-ember/40 bg-kupan-ember/10 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Credenciales temporales</p>
                <h3 className="mt-2 text-2xl font-black uppercase text-white">Mostrar una sola vez</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">Guarda o envia estos datos ahora. La contraseña no queda visible en la app.</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <p className="text-sm font-black text-white">Correo: {createdCredentials.email}</p>
                <p className="mt-2 text-sm font-black text-white">Clave temporal: {createdCredentials.password}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" className="k-button-secondary" onClick={copyCredentials}>Copiar credenciales</button>
                {createdCredentials.phone ? (
                  <a className="k-button text-center" href={buildWhatsAppUrl(createdCredentials.phone, createdCredentials)} target="_blank" rel="noreferrer">
                    Enviar por WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </AdminSection>
      ) : null}

      {activeSection === 'students' ? (
        <AdminSection eyebrow="Alumnos" title="Perfiles registrados">
          {adminData.profiles.map((student) => (
            <SmallRow key={student.id} title={student.full_name} meta={`${student.level} · ${student.status}`} detail={`${student.email}${student.phone ? ` · ${student.phone}` : ''}`} />
          ))}
        </AdminSection>
      ) : null}

      {activeSection === 'plans' ? (
        <AdminSection eyebrow="Planes" title="Planes y precios">
          <form className="k-panel grid gap-3 p-4 sm:grid-cols-2" onSubmit={savePlan}>
            <Field label="Nombre" value={planDraft.name} required onChange={(value) => setPlanDraft((current) => ({ ...current, name: value }))} />
            <Field label="Precio CLP" type="number" value={planDraft.price} required onChange={(value) => setPlanDraft((current) => ({ ...current, price: value }))} />
            <Field label="Clases por semana" type="number" value={planDraft.classes_per_week} onChange={(value) => setPlanDraft((current) => ({ ...current, classes_per_week: value }))} />
            <ToggleField label="Ilimitado" checked={planDraft.is_unlimited} onChange={(value) => setPlanDraft((current) => ({ ...current, is_unlimited: value }))} />
            <ToggleField label="Activo" checked={planDraft.active} onChange={(value) => setPlanDraft((current) => ({ ...current, active: value }))} />
            <button type="submit" className="k-button sm:col-span-2">{planDraft.id ? 'Guardar plan' : 'Crear plan'}</button>
          </form>
          {adminData.plans.map((plan) => (
            <SmallRow
              key={plan.id}
              title={`${plan.name} · ${formatMoney(plan.price)}`}
              meta={plan.active ? 'Activo' : 'Inactivo'}
              detail={plan.is_unlimited ? 'Clases ilimitadas' : `${plan.classes_per_week ?? 'Sin'} clases por semana`}
              action={(
                <div className="grid shrink-0 gap-2">
                  <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => editPlan(plan)}>Editar</button>
                  <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => togglePlan(plan)}>{plan.active ? 'Desactivar' : 'Activar'}</button>
                </div>
              )}
            />
          ))}
        </AdminSection>
      ) : null}

      {activeSection === 'memberships' ? (
        <AdminSection eyebrow="Membresias" title="Gestion real de planes">
          <div className="grid gap-3 md:grid-cols-2">
            {adminData.profiles.map((profile) => {
              const activeMembership = activeMembershipByProfile.get(profile.id)
              const tokens = activeMembership ? getMembershipTokens(activeMembership) : null
              return (
                <SmallRow
                  key={profile.id}
                  title={profile.full_name}
                  meta={activeMembership ? `Plan actual: ${activeMembership.plan?.name ?? 'Plan'}` : 'Sin plan activo'}
                  detail={activeMembership ? `Vence ${formatDate(activeMembership.end_date)} · ${activeMembership.status} · tokens ${tokens.remaining}/${tokens.total}` : profile.email}
                  action={activeMembership ? (
                    <button type="button" className="k-button-secondary shrink-0 px-3 py-2 text-xs" onClick={() => startEditMembership(activeMembership)}>
                      Editar
                    </button>
                  ) : null}
                />
              )
            })}
          </div>

          <form className="k-panel grid gap-3 p-4 sm:grid-cols-2" onSubmit={saveMembership}>
            <div className="sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Activar plan</p>
              <p className="mt-1 text-sm leading-6 text-white/60">Los planes duran 30 dias. Al activar una membresia, cualquier plan activo anterior del alumno pasa a historial como expired.</p>
            </div>
            <SelectField label="Alumno" value={membershipDraft.profile_id} onChange={(value) => setMembershipDraft((current) => ({ ...current, profile_id: value }))}>
              <option className="bg-kupan-black" value="">Seleccionar alumno</option>
              {adminData.profiles.map((profile) => <option key={profile.id} className="bg-kupan-black" value={profile.id}>{profile.full_name}</option>)}
            </SelectField>
            <SelectField label="Plan" value={membershipDraft.plan_id} onChange={(value) => {
              const selectedPlan = adminData.plans.find((plan) => plan.id === value)
              setMembershipDraft((current) => ({ ...current, plan_id: value, classes_total: getPlanTokenTotal(selectedPlan) }))
            }}>
              <option className="bg-kupan-black" value="">Seleccionar plan</option>
              {adminData.plans.map((plan) => <option key={plan.id} className="bg-kupan-black" value={plan.id}>{plan.name}</option>)}
            </SelectField>
            <Field label="Inicio" type="date" value={membershipDraft.start_date} required onChange={(value) => setMembershipDraft((current) => ({ ...current, start_date: value, end_date: current.end_date || addDays(value, 30) }))} />
            <Field label="Vencimiento" type="date" value={membershipDraft.end_date || addDays(membershipDraft.start_date, 30)} required onChange={(value) => setMembershipDraft((current) => ({ ...current, end_date: value }))} />
            <Field label="Tokens del plan" type="number" value={membershipDraft.classes_total} onChange={(value) => setMembershipDraft((current) => ({ ...current, classes_total: value }))} />
            <SelectField label="Pago" value={membershipDraft.payment_status} onChange={(value) => setMembershipDraft((current) => ({ ...current, payment_status: value }))}>
              {['pending', 'paid', 'failed', 'refunded'].map((status) => <option key={status} className="bg-kupan-black" value={status}>{status}</option>)}
            </SelectField>
            <SelectField label="Estado" value={membershipDraft.status} onChange={(value) => setMembershipDraft((current) => ({ ...current, status: value }))}>
              {['active', 'expired', 'paused', 'cancelled'].map((status) => <option key={status} className="bg-kupan-black" value={status}>{status}</option>)}
            </SelectField>
            <Field label="Proveedor pago" value={membershipDraft.payment_provider} onChange={(value) => setMembershipDraft((current) => ({ ...current, payment_provider: value }))} />
            <Field label="Referencia pago" value={membershipDraft.payment_reference} onChange={(value) => setMembershipDraft((current) => ({ ...current, payment_reference: value }))} />
            <Field label="Notas" value={membershipDraft.notes} onChange={(value) => setMembershipDraft((current) => ({ ...current, notes: value }))} />
            <button type="submit" className="k-button sm:col-span-2">Activar plan</button>
            <button type="button" className="k-button-secondary sm:col-span-2" onClick={simulateApprovedPayment}>
              Simular pago aprobado
            </button>
          </form>

          {membershipEditDraft.id ? (
            <form className="k-panel grid gap-3 border-kupan-ember/40 bg-kupan-ember/10 p-4 sm:grid-cols-2" onSubmit={saveMembershipEdit}>
              <div className="sm:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Editar membresia</p>
                <p className="mt-1 text-sm leading-6 text-white/60">Cambia plan, pausa, cancela, reactiva, extiende vencimiento o actualiza observaciones.</p>
              </div>
              <SelectField label="Plan" value={membershipEditDraft.plan_id} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, plan_id: value }))}>
                {adminData.plans.map((plan) => <option key={plan.id} className="bg-kupan-black" value={plan.id}>{plan.name}</option>)}
              </SelectField>
              <SelectField label="Estado" value={membershipEditDraft.status} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, status: value }))}>
                {['active', 'expired', 'paused', 'cancelled'].map((status) => <option key={status} className="bg-kupan-black" value={status}>{status}</option>)}
              </SelectField>
              <Field label="Inicio" type="date" value={membershipEditDraft.start_date} required onChange={(value) => setMembershipEditDraft((current) => ({ ...current, start_date: value }))} />
              <Field label="Vencimiento" type="date" value={membershipEditDraft.end_date} required onChange={(value) => setMembershipEditDraft((current) => ({ ...current, end_date: value }))} />
              <Field label="Tokens totales" type="number" value={membershipEditDraft.classes_total} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, classes_total: value }))} />
              <Field label="Tokens usados" type="number" value={membershipEditDraft.classes_used} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, classes_used: value }))} />
              <SelectField label="Pago" value={membershipEditDraft.payment_status} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, payment_status: value }))}>
                {['pending', 'paid', 'failed', 'refunded'].map((status) => <option key={status} className="bg-kupan-black" value={status}>{status}</option>)}
              </SelectField>
              <div className="sm:col-span-2">
                <Field label="Observaciones" value={membershipEditDraft.notes} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, notes: value }))} />
              </div>
              <button type="submit" className="k-button">Guardar cambios</button>
              <button type="button" className="k-button-secondary" onClick={() => setMembershipEditDraft(emptyMembershipEdit)}>Cerrar edicion</button>
            </form>
          ) : null}

          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Historial de membresias</p>
            <div className="space-y-3">
          {adminData.memberships.map((membership) => {
            const tokens = getMembershipTokens(membership)
            return (
              <SmallRow
                key={membership.id}
                title={`${membership.profile?.full_name ?? 'Alumno'} · ${membership.plan?.name ?? 'Plan'}`}
                meta={`${membership.status} · pago ${membership.payment_status ?? 'sin estado'} · vence ${formatDate(membership.end_date)}`}
                detail={`Inicio ${formatDate(membership.start_date)} · tokens ${tokens.used}/${tokens.total} · disponibles ${tokens.remaining}${membership.notes ? ` · ${membership.notes}` : ''}`}
                action={(
                  <div className="grid shrink-0 gap-2">
                    <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => startEditMembership(membership)}>Editar</button>
                    {membership.status === 'active' ? (
                      <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => updateMembershipStatus(membership, 'paused')}>Pausar</button>
                    ) : (
                      <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => updateMembershipStatus(membership, 'active')}>Activar</button>
                    )}
                    {membership.status !== 'cancelled' ? (
                      <button type="button" className="rounded-lg border border-kupan-red/40 bg-kupan-red/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white" onClick={() => updateMembershipStatus(membership, 'cancelled')}>Cancelar</button>
                    ) : null}
                  </div>
                )}
              />
            )
          })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Movimientos de tokens</p>
            <div className="space-y-3">
              {adminData.tokenMovements.map((movement) => (
                <SmallRow
                  key={movement.id}
                  title={`${movement.profile?.full_name ?? 'Alumno'} · ${movement.movement_type}`}
                  meta={`${movement.quantity > 0 ? '+' : ''}${movement.quantity} token · ${new Date(movement.created_at).toLocaleString('es-CL')}`}
                  detail={movement.reason ?? 'Movimiento registrado'}
                />
              ))}
            </div>
          </div>
        </AdminSection>
      ) : null}

      {activeSection === 'reservations' ? (
        <AdminSection eyebrow="Reservas" title="Reservas activas">
          {adminData.reservations.map((reservation) => (
            <SmallRow
              key={reservation.id}
              title={`${reservation.class_schedule?.class_name ?? 'Clase'} · ${toTime(reservation.class_schedule?.time)}`}
              meta={`${formatDate(reservation.reservation_date)} · ${reservation.status}`}
              detail={`${reservation.profile?.full_name ?? 'Alumno'} · Coach ${reservation.class_schedule?.coach ?? 'KUPAN'} · token ${reservation.token_charged ? 'cobrado' : 'no descuenta'}`}
              action={(
                <div className="grid shrink-0 gap-2">
                  <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => updateReservationStatus(reservation.id, 'attended')}>Asistio</button>
                  <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => updateReservationStatus(reservation.id, 'no_show')}>No show</button>
                  <button type="button" className="rounded-lg border border-kupan-red/40 bg-kupan-red/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white" onClick={() => updateReservationStatus(reservation.id, 'cancelled')}>Cancelar</button>
                </div>
              )}
            />
          ))}
        </AdminSection>
      ) : null}

      {activeSection === 'wod' ? (
        <AdminSection eyebrow="WOD" title="Programacion diaria">
          <form className="k-panel space-y-3 p-4" onSubmit={saveWod}>
            <Field label="Fecha" type="date" value={wodDraft.date} required onChange={(value) => setWodDraft((current) => ({ ...current, date: value }))} />
            <Field label="Titulo" value={wodDraft.title} onChange={(value) => setWodDraft((current) => ({ ...current, title: value }))} />
            <TextArea label="Warm up" value={wodDraft.warmup} onChange={(value) => setWodDraft((current) => ({ ...current, warmup: value }))} />
            <TextArea label="Skill / Strength" value={wodDraft.strength} onChange={(value) => setWodDraft((current) => ({ ...current, strength: value }))} />
            <TextArea label="WOD" value={wodDraft.workout} onChange={(value) => setWodDraft((current) => ({ ...current, workout: value }))} />
            <Field label="Time cap" value={wodDraft.time_cap} onChange={(value) => setWodDraft((current) => ({ ...current, time_cap: value }))} />
            <TextArea label="Notas" value={wodDraft.notes} onChange={(value) => setWodDraft((current) => ({ ...current, notes: value }))} />
            <button type="submit" className="k-button w-full">Guardar WOD</button>
          </form>
          {adminData.wod.map((item) => (
            <SmallRow key={item.id} title={item.title || 'WOD KUPAN'} meta={formatDate(item.date)} detail={item.time_cap || item.workout} />
          ))}
        </AdminSection>
      ) : null}

      {activeSection === 'schedule' ? (
        <AdminSection eyebrow="Horarios" title="Clases del box">
          <form className="k-panel grid gap-3 p-4 sm:grid-cols-2" onSubmit={saveSchedule}>
            <Field label="Dia 1-7" type="number" value={scheduleDraft.day_of_week} required onChange={(value) => setScheduleDraft((current) => ({ ...current, day_of_week: value }))} />
            <Field label="Hora" type="time" value={scheduleDraft.time} required onChange={(value) => setScheduleDraft((current) => ({ ...current, time: value }))} />
            <Field label="Clase" value={scheduleDraft.class_name} required onChange={(value) => setScheduleDraft((current) => ({ ...current, class_name: value }))} />
            <Field label="Coach" value={scheduleDraft.coach} onChange={(value) => setScheduleDraft((current) => ({ ...current, coach: value }))} />
            <Field label="Cupos maximos" type="number" value={scheduleDraft.max_spots} onChange={(value) => setScheduleDraft((current) => ({ ...current, max_spots: value }))} />
            <ToggleField label="Activo" checked={scheduleDraft.active} onChange={(value) => setScheduleDraft((current) => ({ ...current, active: value }))} />
            <button type="submit" className="k-button sm:col-span-2">{scheduleDraft.id ? 'Guardar horario' : 'Crear horario'}</button>
          </form>
          {adminData.schedule.map((item) => (
            <SmallRow
              key={item.id}
              title={`${item.class_name} · ${toTime(item.time)}`}
              meta={`Dia ${item.day_of_week} · ${item.active ? 'Activo' : 'Inactivo'}`}
              detail={`Coach ${item.coach ?? 'KUPAN'} · ${item.max_spots} cupos`}
              action={(
                <div className="grid shrink-0 gap-2">
                  <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => editSchedule(item)}>Editar</button>
                  <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => toggleSchedule(item)}>{item.active ? 'Pausar' : 'Activar'}</button>
                </div>
              )}
            />
          ))}
        </AdminSection>
      ) : null}

      {activeSection === 'community' ? (
        <AdminSection eyebrow="Comunidad" title="Eventos y noticias">
          <form className="k-panel grid gap-3 p-4 sm:grid-cols-2" onSubmit={savePost}>
            <SelectField label="Tipo" value={postDraft.type} onChange={(value) => setPostDraft((current) => ({ ...current, type: value }))}>
              {['noticia', 'evento', 'ranking', 'comunidad'].map((type) => <option key={type} className="bg-kupan-black" value={type}>{type}</option>)}
            </SelectField>
            <Field label="Fecha evento" type="date" value={postDraft.event_date} onChange={(value) => setPostDraft((current) => ({ ...current, event_date: value }))} />
            <Field label="Titulo" value={postDraft.title} required onChange={(value) => setPostDraft((current) => ({ ...current, title: value }))} />
            <ToggleField label="Activo" checked={postDraft.active} onChange={(value) => setPostDraft((current) => ({ ...current, active: value }))} />
            <div className="sm:col-span-2">
              <TextArea label="Contenido" value={postDraft.content} onChange={(value) => setPostDraft((current) => ({ ...current, content: value }))} />
            </div>
            <button type="submit" className="k-button sm:col-span-2">{postDraft.id ? 'Guardar publicacion' : 'Crear publicacion'}</button>
          </form>
          {adminData.posts.map((post) => (
            <SmallRow
              key={post.id}
              title={post.title}
              meta={`${post.type ?? 'post'} · ${post.active ? 'Activo' : 'Inactivo'}`}
              detail={post.content}
              action={(
                <div className="grid shrink-0 gap-2">
                  <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => editPost(post)}>Editar</button>
                  <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => togglePost(post)}>{post.active ? 'Ocultar' : 'Activar'}</button>
                </div>
              )}
            />
          ))}
        </AdminSection>
      ) : null}

      {activeSection === 'texts' ? (
        <AdminSection eyebrow="Textos principales" title="Copy compartido">
          <form className="k-panel space-y-4 p-4" onSubmit={saveTexts}>
            <Field label="Inicio · etiqueta" value={textDraft.homeEyebrow} onChange={(value) => setTextDraft((current) => ({ ...current, homeEyebrow: value }))} />
            <Field label="Inicio · titulo" value={textDraft.homeTitle} onChange={(value) => setTextDraft((current) => ({ ...current, homeTitle: value }))} />
            <TextArea label="Inicio · bajada" value={textDraft.homeBody} onChange={(value) => setTextDraft((current) => ({ ...current, homeBody: value }))} />
            <Field label="Reservas · titulo" value={textDraft.reservationsTitle} onChange={(value) => setTextDraft((current) => ({ ...current, reservationsTitle: value }))} />
            <TextArea label="Reservas · bajada" value={textDraft.reservationsBody} onChange={(value) => setTextDraft((current) => ({ ...current, reservationsBody: value }))} />
            <Field label="Comunidad · frase" value={textDraft.communityPhrase} onChange={(value) => setTextDraft((current) => ({ ...current, communityPhrase: value }))} />
            <button type="submit" className="k-button w-full">Guardar textos en Supabase</button>
          </form>
        </AdminSection>
      ) : null}

      {activeSection === 'birthdays' ? (
        <AdminSection eyebrow="Cumpleanos" title="Celebraciones KUPAN">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Cumpleanos del mes</p>
            <div className="space-y-3">
              {adminData.birthdays.map((birthday) => (
                <SmallRow
                  key={birthday.profile_id}
                  title={birthday.full_name}
                  meta={formatBirthdayDayMonth(birthday.birth_day, birthday.birth_month ?? new Date().getMonth() + 1)}
                  detail={`${birthday.turning_age ? `Cumple ${birthday.turning_age} · ` : ''}Nivel ${birthday.level}`}
                  action={<button type="button" className="k-button-secondary shrink-0 px-3 py-2 text-xs" onClick={() => copyBirthdayGreeting(birthday)}>Copiar saludo</button>}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Proximos 30 dias</p>
            <div className="space-y-3">
              {adminData.upcomingBirthdays.map((birthday) => (
                <SmallRow
                  key={birthday.profile_id}
                  title={birthday.full_name}
                  meta={`${formatBirthdayDayMonth(birthday.birth_day, birthday.birth_month)} · faltan ${birthday.days_until} dias`}
                  detail={`${birthday.turning_age ? `Cumple ${birthday.turning_age} · ` : ''}${birthday.phone ? `Telefono ${birthday.phone}` : 'Sin telefono registrado'}`}
                  action={<button type="button" className="k-button-secondary shrink-0 px-3 py-2 text-xs" onClick={() => copyBirthdayGreeting(birthday)}>Copiar saludo</button>}
                />
              ))}
              {adminData.upcomingBirthdays.length === 0 ? (
                <p className="k-panel p-4 text-sm font-bold text-white/60">No hay cumpleanos en los proximos 30 dias.</p>
              ) : null}
            </div>
          </div>
        </AdminSection>
      ) : null}

      {activeSection === 'prs' ? (
        <AdminSection eyebrow="PR destacados" title="Marcas de la comunidad">
          {adminData.prs.map((record) => (
            <SmallRow
              key={record.id}
              title={`${record.movement} · ${record.value} ${record.unit}`}
              meta={formatDate(record.record_date)}
              detail={`${record.profile?.full_name ?? 'Atleta KUPAN'}${record.notes ? ` · ${record.notes}` : ''}`}
            />
          ))}
        </AdminSection>
      ) : null}
    </div>
  )
}
