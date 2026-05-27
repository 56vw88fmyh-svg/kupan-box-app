import { useEffect, useMemo, useRef, useState } from 'react'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { buildBirthdayGreeting, formatBirthdayDayMonth, loadUpcomingBirthdays } from '../utils/birthdays.js'
import { defaultAppText } from '../utils/adminContent.js'
import { saveAppSetting } from '../utils/sharedContent.js'
import { getCurrentSupabaseUser } from '../utils/auth.js'

const adminSectionMeta = {
  overview: { label: 'Resumen', module: 'Panel', icon: 'IN' },
  'create-student': { label: 'Nuevo alumno', module: 'Alumnos', icon: 'NA' },
  students: { label: 'Ver alumnos', module: 'Alumnos', icon: 'AL' },
  plans: { label: 'Planes', module: 'Pagos', icon: 'PL' },
  memberships: { label: 'Membresias', module: 'Alumnos', icon: 'ME' },
  reservations: { label: 'Asistencia', module: 'Clases', icon: 'AS' },
  wod: { label: 'WOD', module: 'Clases', icon: 'WD' },
  schedule: { label: 'Horarios', module: 'Clases', icon: 'HO' },
  community: { label: 'Comunidad', module: 'Contenido', icon: 'CO' },
  texts: { label: 'Textos', module: 'Contenido', icon: 'TX' },
  birthdays: { label: 'Cumpleanos', module: 'Comunidad', icon: 'CU' },
  prs: { label: 'PR destacados', module: 'Comunidad', icon: 'PR' },
}

const adminNavigationModules = [
  {
    id: 'alumnos',
    label: 'Alumnos',
    icon: 'AL',
    items: [
      { id: 'students', label: 'Ver alumnos', hint: 'Listado completo' },
      { id: 'create-student', label: 'Nuevo alumno', hint: 'Crear acceso' },
      { id: 'memberships', label: 'Membresias', hint: 'Planes activos' },
      { id: 'memberships', label: 'Historial', target: 'membership-history', hint: 'Ciclos y tokens' },
    ],
  },
  {
    id: 'pagos',
    label: 'Pagos',
    icon: 'PG',
    items: [
      { id: 'memberships', label: 'Registrar pago', target: 'membership-activate', hint: 'Activar plan' },
      { id: 'memberships', label: 'Historial', target: 'membership-history', hint: 'Membresias' },
      { id: 'memberships', label: 'Tokens', target: 'token-movements', hint: 'Ajustes' },
      { id: 'plans', label: 'Planes', hint: 'Precios' },
    ],
  },
  {
    id: 'clases',
    label: 'Clases',
    icon: 'CL',
    items: [
      { id: 'schedule', label: 'Crear clase', hint: 'Horarios' },
      { id: 'schedule', label: 'Ver clases', hint: 'Agenda semanal' },
      { id: 'reservations', label: 'Asistencia', hint: 'Reservas activas' },
      { id: 'wod', label: 'WOD del dia', hint: 'Programacion' },
    ],
  },
  {
    id: 'contenido',
    label: 'Contenido',
    icon: 'CT',
    items: [
      { id: 'community', label: 'Noticias y eventos', hint: 'Comunidad' },
      { id: 'birthdays', label: 'Cumpleanos', hint: 'Saludo rapido' },
      { id: 'texts', label: 'Textos app', hint: 'Copy principal' },
      { id: 'prs', label: 'PR destacados', hint: 'Marcas' },
    ],
  },
]

const emptyPlan = { id: '', name: '', price: '', classes_per_week: '', is_unlimited: false, active: true }
const emptyMembership = {
  profile_id: '',
  plan_id: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  status: 'active',
  classes_total: '',
  classes_used: '',
  payment_status: 'paid',
  payment_provider: 'manual_admin',
  payment_reference: '',
  notes: '',
}
const emptyMembershipEdit = {
  id: '',
  profile_id: '',
  plan_id: '',
  start_date: '',
  end_date: '',
  status: 'active',
  classes_total: '',
  classes_used: 0,
  payment_status: 'paid',
  payment_provider: '',
  payment_reference: '',
  notes: '',
}
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

function AdminSidebar({ modules, openModules, onToggleModule, activeSection, onNavigate, isCollapsed, onToggleCollapse }) {
  return (
    <aside className={`k-card sticky top-[calc(4.75rem+env(safe-area-inset-top))] z-10 max-h-[calc(100vh-7rem)] overflow-hidden p-3 transition-all duration-300 lg:self-start ${
      isCollapsed ? 'lg:w-20' : 'lg:w-72'
    }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className={isCollapsed ? 'lg:sr-only' : ''}>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-kupan-flame">Menu admin</p>
          <p className="mt-1 text-sm font-black uppercase text-white">Accesos rapidos</p>
        </div>
        <button
          type="button"
          className="hidden h-10 w-10 shrink-0 rounded-lg border border-white/10 bg-white/10 text-xs font-black text-white transition hover:bg-white/15 lg:block"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expandir menu admin' : 'Colapsar menu admin'}
        >
          {isCollapsed ? '>>' : '<<'}
        </button>
      </div>

      <div className="max-h-[calc(100vh-12rem)] space-y-2 overflow-y-auto pr-1">
        {modules.map((module) => {
          const isOpen = openModules.includes(module.id)
          const moduleHasActive = module.items.some((item) => item.id === activeSection)

          return (
            <div key={module.id} className="rounded-lg border border-white/10 bg-white/[0.03]">
              <button
                type="button"
                className={`flex min-h-12 w-full items-center gap-3 px-3 text-left transition ${moduleHasActive ? 'text-white' : 'text-white/70 hover:text-white'}`}
                onClick={() => onToggleModule(module.id)}
                aria-expanded={isOpen}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[0.62rem] font-black ${moduleHasActive ? 'bg-kupan-ember text-white' : 'bg-white/10 text-white/70'}`}>
                  {module.icon}
                </span>
                <span className={`min-w-0 flex-1 text-sm font-black uppercase ${isCollapsed ? 'lg:hidden' : ''}`}>{module.label}</span>
                <span className={`text-xs font-black transition ${isOpen ? 'rotate-90' : ''} ${isCollapsed ? 'lg:hidden' : ''}`}>{'>'}</span>
              </button>

              {isOpen ? (
                <div className={`space-y-1 px-2 pb-2 ${isCollapsed ? 'lg:hidden' : ''}`}>
                  {module.items.map((item) => {
                    const isActive = item.id === activeSection
                    return (
                      <button
                        key={`${module.id}-${item.label}-${item.target ?? item.id}`}
                        type="button"
                        className={`w-full rounded-md px-3 py-2 text-left transition ${
                          isActive ? 'bg-kupan-ember/95 text-white shadow-glow' : 'text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                        onClick={() => onNavigate(item)}
                      >
                        <span className="block text-xs font-black uppercase">{item.label}</span>
                        <span className="mt-0.5 block text-[0.68rem] font-bold text-white/45">{item.hint}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

function QuickActionButton({ label, icon, onClick, primary = false }) {
  return (
    <button
      type="button"
      className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-black uppercase tracking-[0.08em] transition ${
        primary ? 'bg-kupan-ember text-white shadow-glow' : 'border border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
      }`}
      onClick={onClick}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[0.62rem]">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function formatDate(date) {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function getChileDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
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

function calculateDaysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 999
  return Math.ceil((end.getTime() - start.getTime()) / 86400000)
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

const emptyAdminData = {
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
}

const adminLoaders = [
  ['alumnos', 'profiles', 'admin_get_profiles'],
  ['planes', 'plans', 'admin_get_plans'],
  ['membresias', 'memberships', 'admin_get_memberships'],
  ['reservas', 'reservations', 'admin_get_reservations'],
  ['WOD', 'wod', 'admin_get_wod'],
  ['horarios', 'schedule', 'admin_get_schedule'],
  ['comunidad', 'posts', 'admin_get_community_posts'],
  ['textos', 'settings', 'admin_get_app_settings'],
  ['cumpleanos', 'birthdays', 'birthdays_this_month'],
  ['PR destacados', 'prs', 'admin_get_personal_records'],
  ['movimientos de tokens', 'tokenMovements', 'admin_get_token_movements'],
]

const studentFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'inactive', label: 'Inactivos' },
  { id: 'plan-active', label: 'Plan activo' },
  { id: 'plan-expired', label: 'Plan vencido' },
  { id: 'no-tokens', label: 'Sin tokens' },
  { id: 'expiring', label: 'Por vencer' },
]

async function runAdminLoader([label, key, rpcName]) {
  try {
    const { data, error } = await supabase.rpc(rpcName)
    if (error) {
      return { key, label, data: emptyAdminData[key], error: error.message }
    }
    return { key, label, data: data ?? emptyAdminData[key], error: null }
  } catch (error) {
    return { key, label, data: emptyAdminData[key], error: error.message }
  }
}

async function loadAdminData() {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Supabase aun no esta configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.' }
  }

  const settledResults = await Promise.allSettled(adminLoaders.map(runAdminLoader))
  const data = { ...emptyAdminData }
  const errors = []

  settledResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      const [label, key] = adminLoaders[index]
      errors.push({ key, label, message: `No pudimos cargar ${label}: ${result.reason?.message ?? 'Error desconocido'}` })
      data[key] = emptyAdminData[key]
      return
    }

    data[result.value.key] = result.value.data
    if (result.value.error) {
      errors.push({ key: result.value.key, label: result.value.label, message: `No pudimos cargar ${result.value.label}: ${result.value.error}` })
    }
  })

  return { ok: true, data, errors }
}

export function Admin({ currentUser, setActivePage, onContentChange }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [openModules, setOpenModules] = useState(['alumnos', 'pagos'])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [globalQuery, setGlobalQuery] = useState('')
  const [pendingFocusTarget, setPendingFocusTarget] = useState('')
  const [verifiedUser, setVerifiedUser] = useState(currentUser)
  const [isCheckingAccess, setIsCheckingAccess] = useState(Boolean(currentUser))
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
  const [lastUpdated, setLastUpdated] = useState(null)
  const [sectionErrors, setSectionErrors] = useState([])
  const [studentQuery, setStudentQuery] = useState('')
  const [studentFilter, setStudentFilter] = useState('all')
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
  const contentTopRef = useRef(null)
  const createStudentRef = useRef(null)
  const membershipsOverviewRef = useRef(null)
  const membershipActivateRef = useRef(null)
  const membershipEditRef = useRef(null)
  const membershipHistoryRef = useRef(null)
  const tokenMovementsRef = useRef(null)

  const activeUser = verifiedUser ?? currentUser
  const isAdmin = activeUser?.role === 'admin'
  const currentSectionMeta = adminSectionMeta[activeSection] ?? adminSectionMeta.overview

  useEffect(() => {
    let isMounted = true

    async function verifyAdminRole() {
      if (!currentUser?.id) {
        setVerifiedUser(null)
        setIsCheckingAccess(false)
        return
      }

      setIsCheckingAccess(true)
      const freshUser = await getCurrentSupabaseUser()

      if (!isMounted) return

      setVerifiedUser(freshUser ?? currentUser)
      setIsCheckingAccess(false)
    }

    verifyAdminRole()

    return () => {
      isMounted = false
    }
  }, [currentUser])

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

  const latestMembershipByProfile = useMemo(() => {
    const membershipsByProfile = new Map()

    adminData.memberships
      .slice()
      .sort((a, b) => String(b.created_at ?? b.start_date ?? '').localeCompare(String(a.created_at ?? a.start_date ?? '')))
      .forEach((membership) => {
        if (!membershipsByProfile.has(membership.profile_id)) {
          membershipsByProfile.set(membership.profile_id, membership)
        }
      })

    return membershipsByProfile
  }, [adminData.memberships])

  const todayDate = getChileDateString()

  const totals = useMemo(() => {
    const activeStudents = adminData.profiles.filter((profile) => profile.status === 'active').length
    const expiredMemberships = adminData.memberships.filter((membership) => membership.status === 'expired' || membership.end_date < todayDate).length
    const todayReservations = adminData.reservations.filter((reservation) => (
      reservation.reservation_date === todayDate && ['reserved', 'attended'].includes(reservation.status)
    )).length
    const lowTokenMemberships = adminData.memberships.filter((membership) => {
      if (membership.status !== 'active' || membership.plan?.is_unlimited || membership.classes_total === null) return false
      const remaining = Number(membership.classes_total ?? 0) - Number(membership.classes_used ?? 0)
      return remaining > 0 && remaining <= 2
    }).length

    return {
      students: adminData.profiles.length,
      activeStudents,
      expiredMemberships,
      todayReservations,
      lowTokenMemberships,
      activeMemberships: adminData.memberships.filter((membership) => membership.status === 'active').length,
      reservations: adminData.reservations.filter((reservation) => reservation.status === 'reserved').length,
      plans: adminData.plans.filter((plan) => plan.active).length,
    }
  }, [adminData, todayDate])

  const filteredProfiles = useMemo(() => {
    const query = studentQuery.trim().toLowerCase()

    return adminData.profiles.filter((profile) => {
      const activeMembership = activeMembershipByProfile.get(profile.id)
      const latestMembership = latestMembershipByProfile.get(profile.id)
      const tokens = activeMembership ? getMembershipTokens(activeMembership) : null
      const searchable = `${profile.full_name ?? ''} ${profile.email ?? ''} ${profile.phone ?? ''}`.toLowerCase()
      const matchesQuery = !query || searchable.includes(query)
      const hasActivePlan = Boolean(activeMembership?.status === 'active' && activeMembership.end_date >= todayDate)
      const hasExpiredPlan = Boolean(latestMembership && (latestMembership.status === 'expired' || latestMembership.end_date < todayDate))
      const hasNoTokens = Boolean(activeMembership && !activeMembership.plan?.is_unlimited && Number(tokens?.remaining ?? 0) <= 0)
      const isExpiring = Boolean(activeMembership && activeMembership.end_date >= todayDate && calculateDaysBetween(todayDate, activeMembership.end_date) <= 7)

      if (!matchesQuery) return false
      if (studentFilter === 'active') return profile.status === 'active'
      if (studentFilter === 'inactive') return profile.status === 'inactive'
      if (studentFilter === 'plan-active') return hasActivePlan
      if (studentFilter === 'plan-expired') return hasExpiredPlan
      if (studentFilter === 'no-tokens') return hasNoTokens
      if (studentFilter === 'expiring') return isExpiring
      return true
    })
  }, [activeMembershipByProfile, adminData.profiles, latestMembershipByProfile, studentFilter, studentQuery, todayDate])

  const selectedMembershipPlan = useMemo(
    () => adminData.plans.find((plan) => plan.id === membershipDraft.plan_id),
    [adminData.plans, membershipDraft.plan_id],
  )
  const migrationTotalTokens = selectedMembershipPlan?.is_unlimited
    ? null
    : Number(membershipDraft.classes_total || getPlanTokenTotal(selectedMembershipPlan) || 0)
  const migrationUsedTokens = selectedMembershipPlan?.is_unlimited ? 0 : Number(membershipDraft.classes_used || 0)
  const migrationAvailableTokens = selectedMembershipPlan?.is_unlimited
    ? 'Ilimitado'
    : Math.max(migrationTotalTokens - migrationUsedTokens, 0)

  const globalResults = useMemo(() => {
    const query = globalQuery.trim().toLowerCase()
    if (!query) return []

    return adminNavigationModules
      .flatMap((module) => module.items.map((item) => ({ ...item, module: module.label })))
      .filter((item) => `${item.module} ${item.label} ${item.hint}`.toLowerCase().includes(query))
      .slice(0, 6)
  }, [globalQuery])

  function scrollToTarget(target) {
    const targetMap = {
      top: contentTopRef,
      'create-student-form': createStudentRef,
      'memberships-overview': membershipsOverviewRef,
      'membership-activate': membershipActivateRef,
      'membership-edit': membershipEditRef,
      'membership-history': membershipHistoryRef,
      'token-movements': tokenMovementsRef,
    }
    const targetRef = targetMap[target] ?? contentTopRef

    window.setTimeout(() => {
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function navigateAdmin(item) {
    setActiveSection(item.id)
    setPendingFocusTarget(item.target ?? (item.id === 'create-student' ? 'create-student-form' : 'top'))
    setGlobalQuery('')
  }

  function toggleAdminModule(moduleId) {
    setOpenModules((current) => (
      current.includes(moduleId)
        ? current.filter((item) => item !== moduleId)
        : [...current, moduleId]
    ))
  }

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
    setSectionErrors(result.errors ?? [])
    setLastUpdated(new Date())
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

    if (result.errors?.length) {
      setMessageType('error')
      setMessage(`${result.errors.length} secciones tuvieron problemas. Revisa el detalle bajo los contadores.`)
    } else {
      setMessageType('success')
      setMessage('Datos actualizados desde Supabase.')
    }
  }

  useEffect(() => {
    if (isAdmin) refreshData()
  }, [isAdmin])

  useEffect(() => {
    if (!pendingFocusTarget) return
    scrollToTarget(pendingFocusTarget)
    setPendingFocusTarget('')
  }, [activeSection, pendingFocusTarget])

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
    setActiveSection('plans')
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
    const endDate = addDays(startDate, 30)
    const classesTotal = selectedPlan?.is_unlimited ? null : Number(membershipDraft.classes_total || getPlanTokenTotal(selectedPlan) || 0)
    const initialClassesUsed = selectedPlan?.is_unlimited ? 0 : Number(membershipDraft.classes_used || 0)
    const payload = {
      profile_id: membershipDraft.profile_id,
      plan_id: membershipDraft.plan_id,
      start_date: startDate,
      end_date: endDate,
      expires_at: endDate,
      status: 'active',
      classes_total: classesTotal,
      classes_used: initialClassesUsed,
      payment_status: 'paid',
      payment_provider: membershipDraft.payment_provider || 'manual_admin',
      payment_reference: membershipDraft.payment_reference || `manual-${membershipDraft.profile_id}-${Date.now()}`,
      activated_at: new Date().toISOString(),
      auto_activated: false,
      notes: membershipDraft.notes || null,
    }

    if (!payload.profile_id || !payload.plan_id || !payload.start_date || !payload.end_date) {
      setMessageType('error')
      setMessage('Selecciona alumno, plan, inicio y vencimiento.')
      return
    }

    if (!selectedPlan) {
      setMessageType('error')
      setMessage('Selecciona un plan valido para activar la membresia.')
      return
    }

    if (!selectedPlan.is_unlimited && (!Number.isFinite(classesTotal) || classesTotal <= 0)) {
      setMessageType('error')
      setMessage('Indica un total de tokens valido para el plan.')
      return
    }

    if (initialClassesUsed < 0) {
      setMessageType('error')
      setMessage('Los tokens ya usados no pueden ser menores que 0.')
      return
    }

    if (!selectedPlan.is_unlimited && initialClassesUsed > classesTotal) {
      setMessageType('error')
      setMessage('Los tokens ya usados no pueden ser mayores que los tokens del plan.')
      return
    }

    const { error } = await supabase.rpc('admin_activate_membership', {
      target_profile_id: payload.profile_id,
      target_plan_id: payload.plan_id,
      membership_start_date: payload.start_date,
      classes_total_override: payload.classes_total,
      initial_classes_used: payload.classes_used,
      payment_provider_input: payload.payment_provider,
      payment_reference_input: payload.payment_reference,
      notes_input: payload.notes,
    })

    if (error) {
      setMessageType('error')
      setMessage(`No pudimos crear la membresia: ${error.message}`)
      return
    }

    setMembershipDraft(emptyMembership)
    setMessageType('success')
    setMessage(initialClassesUsed > 0 ? 'Plan activado con tokens ya usados registrados.' : 'Membresia creada en Supabase.')
    refreshData()
  }

  function startEditMembership(membership) {
    setActiveSection('memberships')
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
      payment_provider: membership.payment_provider ?? '',
      payment_reference: membership.payment_reference ?? '',
      notes: membership.notes ?? '',
    })
    setMessage('')
    setPendingFocusTarget('membership-edit')
  }

  async function saveMembershipEdit(event) {
    event.preventDefault()

    if (!membershipEditDraft.id) {
      setMessageType('error')
      setMessage('Selecciona una membresia para editar.')
      return
    }

    const selectedPlan = adminData.plans.find((plan) => plan.id === membershipEditDraft.plan_id)
    if (!selectedPlan) {
      setMessageType('error')
      setMessage('Selecciona un plan valido para guardar la membresia.')
      return
    }

    if (!membershipEditDraft.start_date || Number.isNaN(new Date(`${membershipEditDraft.start_date}T00:00:00`).getTime())) {
      setMessageType('error')
      setMessage('La fecha de inicio no es valida.')
      return
    }

    const editedClassesTotal = selectedPlan?.is_unlimited ? null : Number(membershipEditDraft.classes_total || 0)
    const editedClassesUsed = selectedPlan?.is_unlimited ? 0 : Number(membershipEditDraft.classes_used ?? 0)

    if (!selectedPlan?.is_unlimited && editedClassesUsed < 0) {
      setMessageType('error')
      setMessage('Los tokens usados no pueden ser menores que 0.')
      return
    }

    if (!selectedPlan?.is_unlimited && editedClassesUsed > editedClassesTotal) {
      setMessageType('error')
      setMessage('Los tokens usados no pueden ser mayores que los tokens totales.')
      return
    }

    const updatePayload = {
      target_membership_id: membershipEditDraft.id,
      target_plan_id: membershipEditDraft.plan_id,
      start_date_input: membershipEditDraft.start_date,
      status_input: membershipEditDraft.status,
      payment_status_input: membershipEditDraft.payment_status,
      payment_provider_input: membershipEditDraft.payment_provider || null,
      payment_reference_input: membershipEditDraft.payment_reference || null,
      notes_input: membershipEditDraft.notes || null,
      classes_total_input: editedClassesTotal,
      classes_used_input: editedClassesUsed,
    }

    const { error } = await supabase.rpc('admin_update_membership', updatePayload)

    if (error) {
      setMessageType('error')
      setMessage(`No pudimos guardar los cambios de membresia: ${error.message}`)
      return
    }

    setMembershipEditDraft(emptyMembershipEdit)
    setMessageType('success')
    setMessage('Membresia actualizada.')
    refreshData()
  }

  async function updateMembershipStatus(membership, status) {
    const { error } = await supabase.rpc('admin_update_membership', {
      target_membership_id: membership.id,
      target_plan_id: membership.plan_id,
      start_date_input: membership.start_date,
      status_input: status,
      payment_status_input: status === 'active' ? 'paid' : membership.payment_status ?? 'paid',
      payment_provider_input: membership.payment_provider ?? null,
      payment_reference_input: membership.payment_reference ?? null,
      notes_input: membership.notes ?? null,
      classes_total_input: membership.classes_total,
      classes_used_input: membership.classes_used ?? 0,
    })

    if (error) {
      setMessageType('error')
      setMessage(`No pudimos cambiar estado de membresia: ${error.message}`)
      return
    }

    setMessageType('success')
    setMessage(`Membresia actualizada a ${status}.`)
    refreshData()
  }

  async function renewMembership(membership) {
    const { error } = await supabase.rpc('admin_renew_membership', {
      target_membership_id: membership.id,
    })

    if (error) {
      setMessageType('error')
      setMessage(`No pudimos renovar la membresia: ${error.message}`)
      return
    }

    setMessageType('success')
    setMessage('Plan renovado. Se creo un nuevo ciclo de 30 dias sin acumular tokens anteriores.')
    refreshData()
  }

  async function extendMembershipSevenDays(membership) {
    const { error } = await supabase.rpc('admin_extend_membership', {
      target_membership_id: membership.id,
      days_input: 7,
    })

    if (error) {
      setMessageType('error')
      setMessage(`No pudimos extender la membresia: ${error.message}`)
      return
    }

    setMessageType('success')
    setMessage('Membresia extendida 7 dias.')
    refreshData()
  }

  async function adjustMembershipTokens(membership) {
    const tokens = getMembershipTokens(membership)
    const nextValue = window.prompt(
      `Tokens usados actuales: ${tokens.used}. Ingresa el nuevo total de tokens usados:`,
      String(membership.classes_used ?? 0),
    )

    if (nextValue === null) return

    const parsedValue = Number(nextValue)
    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      setMessageType('error')
      setMessage('Ingresa un numero entero de tokens usados.')
      return
    }

    const { error } = await supabase.rpc('admin_adjust_tokens', {
      target_membership_id: membership.id,
      classes_used_input: parsedValue,
      reason_input: 'Ajuste manual admin desde acciones rapidas',
    })

    if (error) {
      setMessageType('error')
      setMessage(`No pudimos ajustar tokens: ${error.message}`)
      return
    }

    setMessageType('success')
    setMessage('Tokens usados actualizados y movimiento manual registrado.')
    refreshData()
  }

  function prepareMembershipActivation(profileId = '') {
    setMembershipDraft((current) => ({ ...current, profile_id: profileId, start_date: new Date().toISOString().slice(0, 10) }))
    scrollToTarget('membership-activate')
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
    setActiveSection('schedule')
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
    setActiveSection('community')
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
      : await supabase.rpc('admin_mark_reservation', {
        target_reservation_id: reservationId,
        target_status: status,
      })
    const { error } = result

    if (error) {
      setMessageType('error')
      setMessage(error.message || 'No pudimos actualizar la reserva.')
      return
    }

    setMessageType('success')
    setMessage(status === 'cancelled' ? 'Reserva cancelada. Si correspondia, el token fue devuelto.' : 'Asistencia confirmada. El token queda consumido.')
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

    if (studentDraft.plan_id && !studentDraft.membership_start_date) {
      setMessage('Si asignas plan inicial, agrega fecha de inicio. El vencimiento se calcula automaticamente a 30 dias.')
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
        membership_end_date: studentDraft.membership_start_date ? addDays(studentDraft.membership_start_date, 30) : null,
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

  if (!activeUser && !isCheckingAccess) {
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

  if (isCheckingAccess) {
    return (
      <section className="k-card p-5">
        <p className="k-pill inline-flex text-kupan-flame">Verificando acceso</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Conectando con Supabase.</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">Estamos revisando tu rol actualizado antes de abrir el panel admin.</p>
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
        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-5">
          <div className="k-stat"><p className="text-2xl font-black text-white">{totals.students}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Alumnos totales</p></div>
          <div className="k-stat"><p className="text-2xl font-black text-white">{totals.activeStudents}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Alumnos activos</p></div>
          <div className="k-stat"><p className="text-2xl font-black text-kupan-flame">{totals.expiredMemberships}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Planes vencidos</p></div>
          <div className="k-stat"><p className="text-2xl font-black text-white">{totals.todayReservations}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Reservas hoy</p></div>
          <div className="k-stat"><p className="text-2xl font-black text-kupan-flame">{totals.lowTokenMemberships}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Tokens bajos</p></div>
        </div>
        <button type="button" className="k-button mt-5 w-full" onClick={refreshData} disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Actualizar datos'}
        </button>
        {lastUpdated ? (
          <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-white/45">
            Ultima actualizacion: {new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(lastUpdated)}
          </p>
        ) : null}
        {message ? (
          <p className={`mt-3 rounded-lg border p-3 text-sm font-bold text-white ${
            messageType === 'success' ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-kupan-flame/30 bg-kupan-flame/10'
          }`}
          >
            {message}
          </p>
        ) : null}
        {sectionErrors.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {sectionErrors.map((error) => (
              <p key={`${error.key}-${error.label}`} className="rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-xs font-bold leading-5 text-white">
                {error.message}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="k-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Buscar alumno</span>
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/35 focus:border-kupan-ember"
              type="search"
              value={studentQuery}
              placeholder="Nombre, email o telefono..."
              onChange={(event) => setStudentQuery(event.target.value)}
            />
          </label>
          <p className="text-sm font-black uppercase text-white/60">{filteredProfiles.length} resultados</p>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {studentFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`min-w-max rounded-lg px-3 py-2 text-xs font-black uppercase transition ${
                studentFilter === filter.id ? 'bg-kupan-ember text-white shadow-glow' : 'border border-white/10 bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
              }`}
              onClick={() => setStudentFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
        <AdminSidebar
          modules={adminNavigationModules}
          openModules={openModules}
          onToggleModule={toggleAdminModule}
          activeSection={activeSection}
          onNavigate={navigateAdmin}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        />

        <div ref={contentTopRef} className="min-w-0 space-y-5 scroll-mt-28">
          <div className="k-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">
                  {currentSectionMeta.module} / {currentSectionMeta.label}
                </p>
                <h3 className="mt-1 text-2xl font-black uppercase text-white">{currentSectionMeta.label}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <QuickActionButton label="Nuevo alumno" icon="NA" primary onClick={() => navigateAdmin({ id: 'create-student', target: 'create-student-form' })} />
                <QuickActionButton label="Membresia" icon="ME" onClick={() => navigateAdmin({ id: 'memberships', target: 'membership-activate' })} />
                <QuickActionButton label="Asistencia" icon="AS" onClick={() => navigateAdmin({ id: 'reservations' })} />
              </div>
            </div>

            <div className="relative mt-4">
              <label className="block">
                <span className="sr-only">Busqueda rapida admin</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/35 focus:border-kupan-ember"
                  type="search"
                  value={globalQuery}
                  placeholder="Buscar accion: alumno, pago, asistencia, WOD..."
                  onChange={(event) => setGlobalQuery(event.target.value)}
                />
              </label>
              {globalResults.length > 0 ? (
                <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-white/10 bg-kupan-gray shadow-2xl">
                  {globalResults.map((result) => (
                    <button
                      key={`${result.module}-${result.label}-${result.target ?? result.id}`}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 hover:bg-white/10"
                      onClick={() => navigateAdmin(result)}
                    >
                      <span>
                        <span className="block text-sm font-black uppercase text-white">{result.label}</span>
                        <span className="text-xs font-bold text-white/45">{result.module} · {result.hint}</span>
                      </span>
                      <span className="text-xs font-black text-kupan-flame">{'>'}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

      {activeSection === 'overview' ? (
        <section className="grid gap-3 md:grid-cols-4">
          <SmallRow title={`${totals.students} alumnos`} meta="Comunidad" detail="Perfiles registrados en Supabase." />
          <SmallRow title={`${totals.activeMemberships} activas`} meta="Membresias" detail="Planes vigentes del box." />
          <SmallRow title={`${totals.reservations} reservas`} meta="Agenda" detail="Reservas futuras confirmadas." />
          <SmallRow title={`${adminData.prs.length} PR`} meta="Progreso" detail="Marcas recientes destacadas." />
        </section>
      ) : null}

      {activeSection === 'create-student' ? (
        <div ref={createStudentRef} className="scroll-mt-28">
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
              <Field label="Vencimiento plan" type="date" value={studentDraft.membership_start_date ? addDays(studentDraft.membership_start_date, 30) : ''} onChange={() => {}} />
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
        </div>
      ) : null}

      {activeSection === 'students' ? (
        <AdminSection eyebrow="Alumnos" title="Perfiles registrados">
          {filteredProfiles.length === 0 ? (
            <SmallRow title="Sin resultados" meta="Filtro activo" detail="No encontramos alumnos con esa busqueda o filtro." />
          ) : null}
          {filteredProfiles.map((student) => (
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
          <div className="grid gap-2 sm:grid-cols-4">
            <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => scrollToTarget('memberships-overview')}>Planes activos</button>
            <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => scrollToTarget('membership-activate')}>Activar plan</button>
            <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => scrollToTarget('membership-history')}>Historial</button>
            <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => scrollToTarget('token-movements')}>Tokens</button>
          </div>

          <div ref={membershipsOverviewRef} className="grid scroll-mt-28 gap-3 md:grid-cols-2">
            {filteredProfiles.map((profile) => {
              const activeMembership = activeMembershipByProfile.get(profile.id)
              const tokens = activeMembership ? getMembershipTokens(activeMembership) : null
              return (
                <article key={profile.id} className="k-panel p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">{activeMembership ? activeMembership.plan?.name ?? 'Plan KUPAN' : 'Sin plan activo'}</p>
                      <h3 className="mt-2 break-words text-lg font-black uppercase text-white">{profile.full_name}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/60">{profile.email}</p>
                    </div>
                    <span className={`k-pill shrink-0 ${
                      activeMembership?.status === 'active' ? 'text-kupan-flame' : activeMembership ? 'text-white/60' : 'text-kupan-red'
                    }`}
                    >
                      {activeMembership?.status ?? 'sin plan'}
                    </span>
                  </div>

                  {activeMembership ? (
                    <>
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                          <p className="text-[0.62rem] font-black uppercase text-white/50">Total</p>
                          <p className="mt-1 text-sm font-black uppercase text-white">{tokens.total}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                          <p className="text-[0.62rem] font-black uppercase text-white/50">Usados</p>
                          <p className="mt-1 text-sm font-black uppercase text-white">{tokens.used}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                          <p className="text-[0.62rem] font-black uppercase text-white/50">Disponibles</p>
                          <p className="mt-1 text-sm font-black uppercase text-kupan-flame">{tokens.remaining}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                          <p className="text-[0.62rem] font-black uppercase text-white/50">Vence</p>
                          <p className="mt-1 text-xs font-black uppercase text-white">{formatDate(activeMembership.end_date)}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button type="button" className="k-button px-3 py-2 text-xs" onClick={() => renewMembership(activeMembership)}>Renovar plan</button>
                        <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => adjustMembershipTokens(activeMembership)}>Ajustar tokens usados</button>
                        {activeMembership.status === 'paused' ? (
                          <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => updateMembershipStatus(activeMembership, 'active')}>Activar plan</button>
                        ) : (
                          <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => updateMembershipStatus(activeMembership, 'paused')}>Congelar / pausar</button>
                        )}
                        <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => extendMembershipSevenDays(activeMembership)}>Extender 7 dias</button>
                        <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => startEditMembership(activeMembership)}>Editar avanzado</button>
                        {activeMembership.status !== 'cancelled' ? (
                          <button type="button" className="rounded-lg border border-kupan-red/40 bg-kupan-red/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white" onClick={() => updateMembershipStatus(activeMembership, 'cancelled')}>Cancelar plan</button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <button type="button" className="k-button mt-4 w-full" onClick={() => prepareMembershipActivation(profile.id)}>
                      Activar plan
                    </button>
                  )}
                </article>
              )
            })}
            {filteredProfiles.length === 0 ? (
              <SmallRow title="Sin resultados" meta="Filtro activo" detail="No encontramos alumnos con esa busqueda o filtro." />
            ) : null}
          </div>

          <form ref={membershipActivateRef} className="k-panel grid scroll-mt-28 gap-3 p-4 sm:grid-cols-2" onSubmit={saveMembership}>
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
              setMembershipDraft((current) => ({ ...current, plan_id: value, classes_total: getPlanTokenTotal(selectedPlan), classes_used: '' }))
            }}>
              <option className="bg-kupan-black" value="">Seleccionar plan</option>
              {adminData.plans.map((plan) => <option key={plan.id} className="bg-kupan-black" value={plan.id}>{plan.name}</option>)}
            </SelectField>
            <Field label="Inicio" type="date" value={membershipDraft.start_date} required onChange={(value) => setMembershipDraft((current) => ({ ...current, start_date: value, end_date: current.end_date || addDays(value, 30) }))} />
            <Field label="Vencimiento" type="date" value={addDays(membershipDraft.start_date, 30)} required onChange={() => {}} />
            <Field label="Tokens del plan" type="number" value={membershipDraft.classes_total} onChange={(value) => setMembershipDraft((current) => ({ ...current, classes_total: value }))} />
            <Field label="Tokens ya usados" type="number" value={selectedMembershipPlan?.is_unlimited ? '0' : membershipDraft.classes_used} onChange={(value) => setMembershipDraft((current) => ({ ...current, classes_used: value }))} />
            <Field label="Proveedor pago" value={membershipDraft.payment_provider} onChange={(value) => setMembershipDraft((current) => ({ ...current, payment_provider: value }))} />
            <Field label="Referencia pago" value={membershipDraft.payment_reference} onChange={(value) => setMembershipDraft((current) => ({ ...current, payment_reference: value }))} />
            <Field label="Notas" value={membershipDraft.notes} onChange={(value) => setMembershipDraft((current) => ({ ...current, notes: value }))} />
            <div className="rounded-lg border border-white/10 bg-black/30 p-4 sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Activar con tokens ya usados</p>
              <p className="mt-2 text-sm font-bold leading-6 text-white/70">
                Tokens del plan: {selectedMembershipPlan?.is_unlimited ? 'Ilimitado' : migrationTotalTokens || 0} · Tokens ya usados: {migrationUsedTokens} · Disponibles al activar: {migrationAvailableTokens}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/45">
                Si el alumno venia entrenando antes de usar la app, registra aqui sus clases usadas. Quedara un movimiento en el historial.
              </p>
            </div>
            <button type="submit" className="k-button sm:col-span-2">Activar con tokens ya usados</button>
            <button type="button" className="k-button-secondary sm:col-span-2" onClick={simulateApprovedPayment}>
              Simular pago aprobado
            </button>
          </form>

          {membershipEditDraft.id ? (
            <form ref={membershipEditRef} className="k-panel grid scroll-mt-28 gap-3 border-kupan-ember/40 bg-kupan-ember/10 p-4 sm:grid-cols-2" onSubmit={saveMembershipEdit}>
              <div className="sm:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Editar membresia</p>
                <p className="mt-1 text-sm leading-6 text-white/60">Cambia plan, pausa, cancela, reactiva, extiende vencimiento o actualiza observaciones.</p>
              </div>
              <SelectField label="Plan" value={membershipEditDraft.plan_id} onChange={(value) => {
                const nextPlan = adminData.plans.find((plan) => plan.id === value)
                setMembershipEditDraft((current) => ({
                  ...current,
                  plan_id: value,
                  classes_total: nextPlan?.is_unlimited ? '' : getPlanTokenTotal(nextPlan),
                  classes_used: nextPlan?.is_unlimited ? 0 : current.classes_used,
                }))
              }}>
                {adminData.plans.map((plan) => <option key={plan.id} className="bg-kupan-black" value={plan.id}>{plan.name}</option>)}
              </SelectField>
              <SelectField label="Estado" value={membershipEditDraft.status} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, status: value }))}>
                {['active', 'expired', 'paused', 'cancelled'].map((status) => <option key={status} className="bg-kupan-black" value={status}>{status}</option>)}
              </SelectField>
              <Field label="Inicio" type="date" value={membershipEditDraft.start_date} required onChange={(value) => setMembershipEditDraft((current) => ({ ...current, start_date: value }))} />
              <Field label="Vencimiento" type="date" value={addDays(membershipEditDraft.start_date, 30)} required onChange={() => {}} />
              <Field label="Tokens totales" type="number" value={membershipEditDraft.classes_total} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, classes_total: value }))} />
              <Field label="Tokens usados" type="number" value={membershipEditDraft.classes_used} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, classes_used: value }))} />
              <SelectField label="Pago" value={membershipEditDraft.payment_status} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, payment_status: value }))}>
                {['pending', 'paid', 'failed', 'refunded'].map((status) => <option key={status} className="bg-kupan-black" value={status}>{status}</option>)}
              </SelectField>
              <Field label="Proveedor pago" value={membershipEditDraft.payment_provider} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, payment_provider: value }))} />
              <Field label="Referencia pago" value={membershipEditDraft.payment_reference} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, payment_reference: value }))} />
              <div className="sm:col-span-2">
                <Field label="Observaciones" value={membershipEditDraft.notes} onChange={(value) => setMembershipEditDraft((current) => ({ ...current, notes: value }))} />
              </div>
              <button type="submit" className="k-button">Guardar cambios</button>
              <button type="button" className="k-button-secondary" onClick={() => setMembershipEditDraft(emptyMembershipEdit)}>Cerrar edicion</button>
            </form>
          ) : null}

          <div ref={membershipHistoryRef} className="scroll-mt-28">
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
                    <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => renewMembership(membership)}>Renovar</button>
                    <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => adjustMembershipTokens(membership)}>Tokens</button>
                    <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => extendMembershipSevenDays(membership)}>+7 dias</button>
                    <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => startEditMembership(membership)}>Avanzado</button>
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

          <div ref={tokenMovementsRef} className="scroll-mt-28">
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
          {adminData.reservations.map((reservation) => {
            const isAttended = reservation.status === 'attended'
            const isNoShow = reservation.status === 'no_show'
            const isCancelled = reservation.status === 'cancelled'

            return (
              <SmallRow
                key={reservation.id}
                title={`${reservation.class_schedule?.class_name ?? 'Clase'} · ${toTime(reservation.class_schedule?.time)}`}
                meta={`${formatDate(reservation.reservation_date)} · ${reservation.status}`}
                detail={`${reservation.profile?.full_name ?? 'Alumno'} · Coach ${reservation.class_schedule?.coach ?? 'KUPAN'} · token ${reservation.token_charged ? 'cobrado' : 'no descuenta'}`}
                action={(
                  <div className="grid shrink-0 gap-2">
                    <button
                      type="button"
                      className={`k-button-secondary px-3 py-2 text-xs ${isAttended ? 'border-emerald-400/40 bg-emerald-400/15 text-white' : ''}`}
                      disabled={isAttended || isCancelled}
                      onClick={() => updateReservationStatus(reservation.id, 'attended')}
                    >
                      {isAttended ? 'Asistencia OK' : 'Asistio'}
                    </button>
                    <button
                      type="button"
                      className={`k-button-secondary px-3 py-2 text-xs ${isNoShow ? 'border-kupan-flame/40 bg-kupan-flame/15 text-white' : ''}`}
                      disabled={isNoShow || isCancelled}
                      onClick={() => updateReservationStatus(reservation.id, 'no_show')}
                    >
                      {isNoShow ? 'No show OK' : 'No show'}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-kupan-red/40 bg-kupan-red/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"
                      disabled={isAttended || isNoShow || isCancelled}
                      onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              />
            )
          })}
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
      </div>
      <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 grid gap-2 lg:bottom-5">
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-kupan-ember text-xs font-black text-white shadow-glow transition hover:scale-105"
          onClick={() => navigateAdmin({ id: 'create-student', target: 'create-student-form' })}
          aria-label="Crear alumno rapido"
        >
          NA
        </button>
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-kupan-gray text-xs font-black text-white shadow-2xl transition hover:scale-105"
          onClick={() => navigateAdmin({ id: 'memberships', target: 'membership-activate' })}
          aria-label="Activar membresia rapido"
        >
          ME
        </button>
      </div>
    </div>
  )
}
