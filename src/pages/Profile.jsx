import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { updateCurrentUserPassword } from '../utils/auth.js'
import {
  calculateAge,
  calculateDaysRemaining,
  getMembershipTokenSummary,
  loadSupabaseProfileData,
  profileEditableLevels,
  subscribeToProfileData,
  updateSupabaseProfile,
} from '../utils/profileData.js'
import { gymConfig } from '../config/gymConfig.js'

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
const weekDayInitials = ['L', 'M', 'M', 'J', 'V', 'S']

function getChileDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function buildWeeklyProgress(reservations) {
  const todayKey = getChileDateString()
  const today = new Date(`${todayKey}T12:00:00`)
  const mondayOffset = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)
  const attendedDates = new Set(
    reservations
      .filter((reservation) => reservation.status === 'attended')
      .map((reservation) => reservation.reservation_date ?? reservation.reservationDate),
  )

  return weekDayInitials.map((day, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const dateKey = getChileDateString(date)
    return { day, date: dateKey, done: attendedDates.has(dateKey) }
  })
}

function formatDate(date) {
  if (!date) return 'Sin registrar'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function formatCurrency(value) {
  if (value === null || value === undefined) return ''
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

function ProfileField({ label, value }) {
  const displayValue = value === null || value === undefined || value === '' ? 'Sin registrar' : value

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 break-words text-sm font-black uppercase text-white">{displayValue}</p>
    </div>
  )
}

function formatUpdatedTime(date) {
  if (!date) return 'Pendiente de sincronizar'

  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function MembershipSummary({
  membership,
  planName,
  planPrice,
  tokenSummary,
  daysRemaining,
  isLoading,
  isRefreshing,
  lastUpdatedAt,
  message,
  onRefresh,
  onRenew,
}) {
  const membershipEndDate = membership?.end_date ?? membership?.expires_at
  const hasMembership = Boolean(membership)
  const statusLabel = hasMembership ? 'Plan activo' : 'Sin plan activo'
  const progress = tokenSummary.isUnlimited || tokenSummary.total <= 0
    ? 0
    : Math.min((tokenSummary.used / tokenSummary.total) * 100, 100)

  return (
    <MotionCard as="section" className="k-card overflow-hidden p-0" delay={0.02}>
      <div className="flex flex-col gap-4 border-b border-white/10 bg-black/25 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">Membresía {gymConfig.identity.name}</p>
          <h2 className="k-display mt-2 text-4xl font-black uppercase leading-none text-white">
            {isLoading ? 'Revisando tu plan...' : planName ?? 'Activa tu plan'}
          </h2>
          <p className="mt-2 text-sm font-bold text-white/55">
            {statusLabel} · Actualizado {formatUpdatedTime(lastUpdatedAt)}
          </p>
        </div>
        <button
          type="button"
          className="k-button-secondary min-h-12 w-full sm:w-auto"
          disabled={isLoading || isRefreshing}
          onClick={onRefresh}
        >
          {isRefreshing ? 'Actualizando...' : 'Actualizar plan'}
        </button>
      </div>

      {message ? (
        <p className="mx-5 mt-5 rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-sm font-bold leading-6 text-white">
          {message}
        </p>
      ) : null}

      {hasMembership ? (
        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-[1.25fr_1fr]">
            <div className="rounded-lg border border-kupan-ember/35 bg-kupan-ember/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Tokens disponibles</p>
              <p className="mt-2 text-5xl font-black uppercase leading-none text-white">
                {tokenSummary.isUnlimited ? 'Full' : tokenSummary.remaining}
              </p>
              <p className="mt-3 text-sm font-bold uppercase text-white/60">
                {tokenSummary.isUnlimited ? 'Entrena sin descuento de tokens' : `de ${tokenSummary.total} clases del plan`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
              <ProfileField label="Tokens usados" value={tokenSummary.isUnlimited ? 'No descuenta' : tokenSummary.used} />
              <ProfileField label="Vencimiento" value={formatDate(membershipEndDate)} />
            </div>
          </div>

          {!tokenSummary.isUnlimited ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="flex flex-col items-start gap-2 text-xs font-black uppercase text-white/55 sm:flex-row sm:items-center sm:justify-between">
                <span>Uso del plan</span>
                <span className="break-words text-kupan-flame">{tokenSummary.used} usados · {tokenSummary.remaining} disponibles</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" aria-label={`${tokenSummary.used} de ${tokenSummary.total} tokens utilizados`}>
                <Motion.div
                  className="h-full rounded-full bg-kupan-ember"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ProfileField label="Inicio" value={formatDate(membership.start_date)} />
            <ProfileField label="Días restantes" value={daysRemaining !== null ? `${daysRemaining} días` : 'Sin registrar'} />
            <ProfileField label="Tokens totales" value={tokenSummary.isUnlimited ? 'Ilimitado' : tokenSummary.total} />
            <ProfileField label="Estado" value={membership.status === 'active' ? 'Activa' : membership.status} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <ProfileField label="Estado de pago" value={membership.payment_status === 'paid' ? 'Pagado' : membership.payment_status ?? 'Sin registrar'} />
            <ProfileField label="Valor del plan" value={planPrice ? formatCurrency(planPrice) : 'Consultar'} />
          </div>

          <p className="mt-4 text-sm font-bold leading-6 text-white/55">
            {planPrice ? `${formatCurrency(planPrice)} · ` : ''}Los tokens no utilizados vencen al terminar el plan y no son acumulables.
          </p>
          <button type="button" className="k-button mt-4 w-full" onClick={onRenew}>Ver opciones de renovación</button>
        </div>
      ) : (
        <div className="p-5">
          <div className="rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-4">
            <p className="font-black uppercase text-white">Aún no tienes una membresía activa.</p>
            <p className="mt-2 text-sm leading-6 text-white/65">Cuando el administrador active tu plan, aparecerá aquí automáticamente con sus tokens y vencimiento.</p>
            <button type="button" className="k-button mt-4 w-full" onClick={onRenew}>Ver planes {gymConfig.identity.name}</button>
          </div>
        </div>
      )}
    </MotionCard>
  )
}

function EditableField({ label, type = 'text', value, onChange, required = false }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-kupan-ember"
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function getReservationClass(reservation) {
  return reservation?.class_schedule ?? {
    day_of_week: Number(reservation?.dayId ?? 0),
    time: reservation?.time,
    class_name: reservation?.name,
    coach: reservation?.coach,
  }
}

function StudentDashboard({
  isLoading,
  message,
  activeMembership,
  nextReservation,
  setActivePage,
}) {
  const planIsActive = Boolean(activeMembership?.status === 'active')
  const showPlanWarning = !isLoading && !planIsActive
  const classItem = getReservationClass(nextReservation)
  const dayLabel = classItem?.day_of_week ? dayNames[classItem.day_of_week] : nextReservation?.day
  const classTime = classItem?.time?.slice?.(0, 5) ?? classItem?.time ?? ''
  const className = classItem?.class_name ?? `Clase ${gymConfig.identity.name}`
  const coach = classItem?.coach ?? `Coach ${gymConfig.identity.name}`

  return (
    <MotionCard as="section" className="k-card overflow-hidden p-0" delay={0.025}>
      <div className="border-b border-white/10 bg-black/25 p-5">
        <p className="k-pill inline-flex text-kupan-flame">Panel alumno</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Tu semana {gymConfig.identity.name} clara y al tiro.</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Revisa tu próxima clase, tokens y plan antes de reservar.
        </p>
      </div>

      {isLoading ? (
        <p className="border-b border-white/10 p-5 text-sm font-bold text-white/60">Cargando tu información segura...</p>
      ) : null}

      {message ? (
        <p className="m-5 rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-sm font-bold text-white">{message}</p>
      ) : null}

      <div className="p-5">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Próxima clase</p>
          {isLoading ? (
            <>
              <h3 className="mt-2 text-2xl font-black uppercase leading-tight text-white">Revisando tus reservas...</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">Estamos cargando tu próxima clase.</p>
            </>
          ) : nextReservation ? (
            <>
              <h3 className="mt-2 text-3xl font-black uppercase leading-none text-white">{className}</h3>
              <p className="mt-2 text-sm font-bold text-white/65">
                {formatDate(nextReservation.reservation_date ?? nextReservation.reservationDate)} · {dayLabel} · {classTime} · Coach {coach}
              </p>
            </>
          ) : (
            <>
              <h3 className="mt-2 text-2xl font-black uppercase leading-tight text-white">Aún no tienes una clase reservada.</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">Reserva tu clase y ven a darlo todo con la comunidad.</p>
            </>
          )}
        </div>

      </div>

      {showPlanWarning ? (
        <div className="mx-5 mb-5 rounded-lg border border-kupan-flame/35 bg-kupan-flame/10 p-4">
          <p className="text-sm font-black uppercase leading-6 text-white">No tienes un plan activo. Activa tu membresía para poder reservar clases.</p>
        </div>
      ) : null}

      <div className="grid gap-3 border-t border-white/10 p-5 sm:grid-cols-2">
        <button type="button" className="k-button w-full" onClick={() => setActivePage('reservations')}>
          Reservar clase
        </button>
        <button type="button" className="k-button-secondary w-full" onClick={() => setActivePage('prs')}>
          Mis PR
        </button>
      </div>
    </MotionCard>
  )
}

export function Profile({ setActivePage, currentUser, onLogout, onUserUpdate }) {
  const location = useLocation()
  const profileRequestIdRef = useRef(0)
  const [profileData, setProfileData] = useState(null)
  const [isFetchingProfile, setIsFetchingProfile] = useState(false)
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [membershipSyncMessage, setMembershipSyncMessage] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordMessageType, setPasswordMessageType] = useState('error')
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' })
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    birthDate: '',
    level: 'Iniciado',
  })

  const refreshProfile = useCallback(async ({ background = false, syncForm = false } = {}) => {
    if (!currentUser?.id) return false

    const requestId = profileRequestIdRef.current + 1
    profileRequestIdRef.current = requestId

    if (background) setIsRefreshingProfile(true)
    else setIsFetchingProfile(true)

    const result = await loadSupabaseProfileData(currentUser.id)

    if (requestId !== profileRequestIdRef.current) return false

    setIsFetchingProfile(false)
    setIsRefreshingProfile(false)

    if (!result.ok) {
      setMembershipSyncMessage(result.message)
      return false
    }

    const nextProfile = result.data.profile
    setProfileData(result.data)
    setLastUpdatedAt(new Date())
    setMembershipSyncMessage(result.data.membershipIssue ?? '')

    if (syncForm) {
      setFormData({
        fullName: nextProfile?.full_name ?? currentUser.name ?? '',
        phone: nextProfile?.phone ?? '',
        birthDate: nextProfile?.birth_date ?? '',
        level: nextProfile?.level ?? 'Iniciado',
      })
      if (result.data.profileIssue) {
        setMessageType('error')
        setProfileMessage(result.data.profileIssue)
      } else {
        setProfileMessage('')
      }
    }

    return true
  }, [currentUser?.id, currentUser?.name])

  useEffect(() => {
    refreshProfile({ syncForm: true })

    return () => {
      profileRequestIdRef.current += 1
    }
  }, [refreshProfile])

  useEffect(() => {
    if (!currentUser?.id) return undefined

    let refreshTimer = null
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        refreshProfile({ background: true })
      }, 300)
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh()
    }
    const periodicRefresh = window.setInterval(refreshWhenVisible, 90000)
    const unsubscribe = subscribeToProfileData(currentUser.id, scheduleRefresh)

    window.addEventListener('focus', scheduleRefresh)
    window.addEventListener('online', scheduleRefresh)
    window.addEventListener('pageshow', scheduleRefresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.clearTimeout(refreshTimer)
      window.clearInterval(periodicRefresh)
      window.removeEventListener('focus', scheduleRefresh)
      window.removeEventListener('online', scheduleRefresh)
      window.removeEventListener('pageshow', scheduleRefresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      unsubscribe()
    }
  }, [currentUser?.id, refreshProfile])

  const supabaseProfile = profileData?.profile
  const activeMembership = profileData?.membership
  const supabaseReservations = useMemo(() => profileData?.reservations ?? [], [profileData?.reservations])
  const personalRecords = useMemo(() => profileData?.records ?? [], [profileData?.records])
  const recordsIssue = profileData?.recordsIssue ?? ''
  const visibleReservations = supabaseReservations
  const accessRestricted = new window.URLSearchParams(location.search).get('access') === 'restricted'

  const profileName = supabaseProfile?.full_name ?? currentUser?.name ?? `Atleta ${gymConfig.identity.name}`
  const email = supabaseProfile?.email ?? currentUser?.email ?? 'Inicia sesión para guardar tu progreso'
  const phone = supabaseProfile?.phone ?? currentUser?.phone ?? ''
  const birthDate = supabaseProfile?.birth_date ?? currentUser?.birthDate ?? ''
  const age = calculateAge(birthDate)
  const level = supabaseProfile?.level ?? currentUser?.level ?? 'Iniciado'
  const status = supabaseProfile?.status ?? currentUser?.status ?? 'active'
  const plan = activeMembership?.plan
  const planName = plan?.name ?? activeMembership?.plan_name
  const planPrice = activeMembership?.agreed_price ?? plan?.price
  const tokenSummary = getMembershipTokenSummary(activeMembership, profileData?.remainingTokens)
  const daysRemaining = calculateDaysRemaining(activeMembership?.end_date ?? activeMembership?.expires_at)
  const nextReservation = useMemo(() => {
    const today = getChileDateString()

    return supabaseReservations
      .filter((reservation) => {
        const date = reservation.reservation_date ?? reservation.reservationDate
        return date >= today && reservation.status === 'reserved'
      })
      .sort((a, b) => {
        const aClass = getReservationClass(a)
        const bClass = getReservationClass(b)
        const aDateTime = `${a.reservation_date ?? a.reservationDate}T${aClass?.time ?? '00:00'}`
        const bDateTime = `${b.reservation_date ?? b.reservationDate}T${bClass?.time ?? '00:00'}`
        return aDateTime.localeCompare(bDateTime)
      })[0] ?? null
  }, [supabaseReservations])

  const weeklyProgress = useMemo(() => buildWeeklyProgress(supabaseReservations), [supabaseReservations])
  const weeklyCompleted = weeklyProgress.filter((item) => item.done).length
  const weeklyGoal = weeklyProgress.length
  const weeklyPercent = Math.round((weeklyCompleted / weeklyGoal) * 100)
  const currentMonth = getChileDateString().slice(0, 7)
  const attendance = supabaseReservations.filter((reservation) => (
    reservation.status === 'attended'
    && String(reservation.reservation_date ?? reservation.reservationDate ?? '').startsWith(currentMonth)
  )).length
  const motivation = 'Entrena fuerte, entrena acompañado. El progreso se construye apareciendo.'

  const stats = useMemo(() => ([
    { label: 'Reservas', value: visibleReservations.length },
    { label: 'Asist. mes', value: attendance },
    { label: 'Nivel', value: level },
  ]), [attendance, level, visibleReservations.length])

  const hasUnsavedProfileChanges = useMemo(() => (
    formData.fullName !== (supabaseProfile?.full_name ?? currentUser?.name ?? '')
    || formData.phone !== (supabaseProfile?.phone ?? '')
    || formData.birthDate !== (supabaseProfile?.birth_date ?? '')
    || formData.level !== (supabaseProfile?.level ?? 'Iniciado')
  ), [currentUser?.name, formData, supabaseProfile])

  function toggleEditProfile() {
    setIsEditOpen((current) => {
      const nextValue = !current
      if (current && hasUnsavedProfileChanges) {
        setMessageType('error')
        setProfileMessage('Tienes cambios sin guardar. Quedaron en el formulario para cuando vuelvas a abrirlo.')
      }
      return nextValue
    })
  }

  function togglePasswordPanel() {
    setIsPasswordOpen((current) => {
      const nextValue = !current
      if (current) {
        setPasswordForm({ password: '', confirmPassword: '' })
        setPasswordMessage('')
        setPasswordMessageType('error')
      }
      return nextValue
    })
  }

  async function handleSaveProfile(event) {
    event.preventDefault()
    setProfileMessage('')
    setMessageType('error')

    if (!formData.birthDate) {
      setProfileMessage('La fecha de nacimiento es obligatoria.')
      return
    }

    setIsSavingProfile(true)
    const result = await updateSupabaseProfile(currentUser.id, formData)
    setIsSavingProfile(false)

    if (!result.ok) {
      setProfileMessage(result.message)
      return
    }

    setProfileData((current) => ({
      ...current,
      profile: result.profile,
    }))
    onUserUpdate?.({
      id: result.profile.id,
      name: result.profile.full_name,
      email: result.profile.email,
      phone: result.profile.phone ?? '',
      birthDate: result.profile.birth_date,
      level: result.profile.level,
      role: result.profile.role,
      status: result.profile.status,
    })
    setMessageType('success')
    setProfileMessage(result.message)
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setPasswordMessage('')
    setPasswordMessageType('error')

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordMessage('Las contraseñas no coinciden.')
      return
    }

    setIsSavingPassword(true)
    const result = await updateCurrentUserPassword(passwordForm.password)
    setIsSavingPassword(false)

    if (!result.ok) {
      setPasswordMessage(result.message)
      return
    }

    setPasswordForm({ password: '', confirmPassword: '' })
    setPasswordMessageType('success')
    setPasswordMessage(result.message)
  }

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <MotionCard as="section" className="k-card p-5">
          <p className="k-pill inline-flex text-kupan-flame">Perfil {gymConfig.identity.name}</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Entra a tu cuenta y entrena acompañado.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Inicia sesión para ver tu plan, reservas, datos personales y progreso dentro del box.
          </p>
          <button type="button" className="k-button mt-5 w-full" onClick={() => setActivePage('login')}>
            Iniciar sesión
          </button>
        </MotionCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {accessRestricted ? (
        <MotionCard as="section" className="k-card border-kupan-flame/30 bg-kupan-flame/10 p-5">
          <p className="k-pill inline-flex text-kupan-flame">Acceso restringido</p>
          <h2 className="mt-3 text-2xl font-black uppercase leading-tight text-white">Ese panel requiere permiso administrativo.</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">Tu cuenta sigue segura en el perfil de alumno. Si necesitas entrar al panel admin, pide que validen tu permiso.</p>
        </MotionCard>
      ) : null}

      <MotionCard as="section" className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-kupan-ember/50 bg-kupan-ember text-4xl font-black text-white shadow-glow">
              {profileName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="k-pill inline-flex text-kupan-flame">Atleta {gymConfig.identity.name}</p>
              <h2 className="mt-3 break-words text-4xl font-black uppercase leading-none text-white">{profileName}</h2>
              <p className="mt-2 text-sm text-white/60">{email}</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-kupan-ember/30 bg-kupan-ember/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Frase de la semana</p>
            <p className="mt-2 text-xl font-black uppercase leading-tight text-white">{motivation}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-0 border-b border-white/10">
          {stats.map((item, index) => (
            <div key={item.label} className={`${index > 0 ? 'border-l border-white/10' : ''} min-w-0 px-3 py-4 sm:p-4`}>
              <p className={`${item.label === 'Nivel' ? 'text-base text-kupan-flame sm:text-xl' : 'text-3xl text-white'} break-words font-black uppercase leading-none`}>{item.value}</p>
              <p className="mt-2 text-[0.65rem] font-black uppercase text-white/60">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="p-5">
          <button type="button" className="k-button-secondary w-full" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </MotionCard>

      <MembershipSummary
        membership={activeMembership}
        planName={planName}
        planPrice={planPrice}
        tokenSummary={tokenSummary}
        daysRemaining={daysRemaining}
        isLoading={isFetchingProfile}
        isRefreshing={isRefreshingProfile}
        lastUpdatedAt={lastUpdatedAt}
        message={membershipSyncMessage}
        onRefresh={() => refreshProfile({ background: true })}
        onRenew={() => setActivePage('plans')}
      />

      <StudentDashboard
        isLoading={isFetchingProfile}
        message={profileData?.reservationsIssue ?? ''}
        activeMembership={activeMembership}
        nextReservation={nextReservation}
        setActivePage={setActivePage}
      />

      <MotionCard as="section" className="k-card p-5" delay={0.03}>
        <SectionTitle eyebrow="Datos del atleta" title={`Tu ficha ${gymConfig.identity.name}`} />
        {isFetchingProfile ? <p className="mb-4 text-sm font-bold text-white/60">Cargando tus datos seguros...</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileField label="Nombre completo" value={profileName} />
          <ProfileField label="Email" value={email} />
          <ProfileField label="Teléfono" value={phone} />
          <ProfileField label="Fecha nacimiento" value={formatDate(birthDate)} />
          <ProfileField label="Edad" value={age !== null ? `${age} años` : 'Sin registrar'} />
          <ProfileField label="Nivel" value={level} />
          <ProfileField label="Estado" value={status === 'active' ? 'Activo' : 'Inactivo'} />
          <ProfileField label="Rol" value={currentUser.role === 'admin' ? 'Admin' : 'Alumno'} />
        </div>
      </MotionCard>

      <MotionCard as="section" className="k-card p-5" delay={0.04}>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-kupan-ember/60 hover:bg-kupan-ember/10 focus:border-kupan-ember focus:outline-none"
          aria-expanded={isEditOpen}
          onClick={toggleEditProfile}
        >
          <span className="min-w-0">
            <span className="block text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Editar perfil</span>
            <span className="mt-2 block text-2xl font-black uppercase leading-none text-white">Datos que puedes actualizar</span>
            <span className="mt-2 block text-sm font-bold leading-6 text-white/55">Nombre, teléfono, fecha de nacimiento y nivel.</span>
          </span>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/35 text-lg font-black text-kupan-flame transition ${isEditOpen ? '-rotate-90' : 'rotate-90'}`}>
            {'>'}
          </span>
        </button>

        {profileMessage ? (
          <p className={`mt-4 rounded-lg border p-3 text-sm font-bold text-white ${
            messageType === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10'
              : 'border-kupan-flame/30 bg-kupan-flame/10'
          }`}
          >
            {profileMessage}
          </p>
        ) : null}

        <AnimatePresence initial={false}>
          {isEditOpen ? (
            <Motion.div
              key="profile-editor"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <form className="mt-4 space-y-4" onSubmit={handleSaveProfile}>
                <EditableField label="Nombre completo" value={formData.fullName} required onChange={(value) => setFormData((current) => ({ ...current, fullName: value }))} />
                <EditableField label="Teléfono" type="tel" value={formData.phone} onChange={(value) => setFormData((current) => ({ ...current, phone: value }))} />
                <EditableField label="Fecha de nacimiento" type="date" value={formData.birthDate} required onChange={(value) => setFormData((current) => ({ ...current, birthDate: value }))} />
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Nivel</span>
                  <select
                    className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
                    value={formData.level}
                    onChange={(event) => setFormData((current) => ({ ...current, level: event.target.value }))}
                  >
                    {profileEditableLevels.map((levelOption) => (
                      <option key={levelOption} className="bg-kupan-black text-white" value={levelOption}>
                        {levelOption}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/60">
                  Email, plan, rol y estado de membresía quedan protegidos. Si necesitas cambiarlos, debe hacerlo un admin.
                </div>

                <button type="submit" className="k-button w-full" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </MotionCard>

      <MotionCard as="section" className="k-card p-5" delay={0.045}>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-kupan-ember/60 hover:bg-kupan-ember/10 focus:border-kupan-ember focus:outline-none"
          aria-expanded={isPasswordOpen}
          onClick={togglePasswordPanel}
        >
          <span className="min-w-0">
            <span className="block text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Seguridad</span>
            <span className="mt-2 block text-2xl font-black uppercase leading-none text-white">Cambiar contraseña</span>
            <span className="mt-2 block text-sm font-bold leading-6 text-white/55">Actualiza tu clave de acceso cuando lo necesites.</span>
          </span>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/35 text-lg font-black text-kupan-flame transition ${isPasswordOpen ? '-rotate-90' : 'rotate-90'}`}>
            {'>'}
          </span>
        </button>

        {passwordMessage ? (
          <p className={`mt-4 rounded-lg border p-3 text-sm font-bold text-white ${
            passwordMessageType === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10'
              : 'border-kupan-flame/30 bg-kupan-flame/10'
          }`}
          >
            {passwordMessage}
          </p>
        ) : null}

        <AnimatePresence initial={false}>
          {isPasswordOpen ? (
            <Motion.div
              key="password-editor"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <form className="mt-4 space-y-4" onSubmit={handleChangePassword}>
                <EditableField label="Nueva contraseña" type="password" value={passwordForm.password} required onChange={(value) => setPasswordForm((current) => ({ ...current, password: value }))} />
                <EditableField label="Confirmar contraseña" type="password" value={passwordForm.confirmPassword} required onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} />
                <button type="submit" className="k-button-secondary w-full" disabled={isSavingPassword}>
                  {isSavingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </form>
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </MotionCard>

      <MotionCard as="section" className="k-card p-5" delay={0.06}>
        <SectionTitle eyebrow="Progreso semanal" title={`${weeklyCompleted}/${weeklyGoal} entrenamientos`} />
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
          <Motion.div
            className="h-full rounded-full bg-kupan-ember shadow-glow"
            initial={{ width: 0 }}
            whileInView={{ width: `${weeklyPercent}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-4 grid grid-cols-6 gap-2">
          {weeklyProgress.map((item, index) => (
            <Motion.div
              key={`${item.day}-${index}`}
              className={`rounded-lg border p-3 text-center ${
              item.done ? 'border-kupan-ember bg-kupan-ember/15 text-white' : 'border-white/10 bg-white/5 text-white/40'
            }`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.035, duration: 0.2 }}
            >
              <p className="text-sm font-black uppercase">{item.day}</p>
            </Motion.div>
          ))}
        </div>
      </MotionCard>

      <section>
        <SectionTitle eyebrow="Reservas activas" title={`Tu agenda ${gymConfig.identity.name}`} />
        {visibleReservations.length > 0 ? (
          <div className="space-y-3">
            {visibleReservations.map((item) => {
              const classItem = item.class_schedule
              const isSupabaseReservation = Boolean(classItem)
              const dayLabel = isSupabaseReservation ? dayNames[classItem.day_of_week] : item.day

              return (
                <MotionCard key={item.id} as="article" className="k-panel p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">
                        {isSupabaseReservation ? formatDate(item.reservation_date) : dayLabel}
                      </p>
                      <h3 className="mt-2 font-black uppercase text-white">
                        {isSupabaseReservation ? `${classItem.time.slice(0, 5)} · ${classItem.class_name}` : `${item.time} · ${item.name}`}
                      </h3>
                      <p className="mt-1 text-sm text-white/60">
                        {dayLabel} · Coach {isSupabaseReservation ? classItem.coach : item.coach} · cupo confirmado
                      </p>
                    </div>
                  </div>
                </MotionCard>
              )
            })}
          </div>
        ) : (
          <MotionCard className="k-panel p-4">
            <p className="font-black uppercase text-white">Aún no tienes reservas.</p>
            <p className="mt-1 text-sm leading-6 text-white/60">Reserva tu clase y ven a darlo todo. Tu semana queda ordenada aca.</p>
          </MotionCard>
        )}
      </section>

      {gymConfig.features.wod ? <section>
        <SectionTitle eyebrow="Ultimos PR" title="Marcas que se celebran" />
        <button type="button" className="k-button mb-4 w-full" onClick={() => setActivePage('prs')}>
          Gestionar mis PR
        </button>
        {recordsIssue ? <p className="mb-4 rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-sm font-bold text-white">{recordsIssue}</p> : null}
        {personalRecords.length > 0 ? (
          <div className="space-y-3">
            {personalRecords.map((record) => (
              <MotionCard key={record.id} className="k-panel flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-black uppercase text-white">{record.movement}</p>
                  {record.record_date ? <p className="mt-1 text-xs font-bold uppercase text-white/45">{formatDate(record.record_date)}</p> : null}
                </div>
                <p className="text-lg font-black text-kupan-flame">
                  {record.value} {record.unit ?? ''}
                </p>
              </MotionCard>
            ))}
          </div>
        ) : (
          <MotionCard className="k-panel p-4">
            <p className="font-black uppercase text-white">Aún no tienes PR registrados.</p>
            <p className="mt-1 text-sm leading-6 text-white/60">Entra a Mis PR y registra tu primera marca {gymConfig.identity.name}.</p>
          </MotionCard>
        )}
      </section> : null}

      {['admin', 'coach'].includes(currentUser.role) ? (
        <MotionCard as="section" className="k-card p-5" delay={0.08}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Gestion del box</p>
          <h2 className="mt-2 text-2xl font-black uppercase text-white">Herramientas {gymConfig.identity.name}</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Entra al modo coach para ver la clase del día, reservas y asistencia.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {gymConfig.features.coachManagement ? <button type="button" className="k-button-secondary w-full" onClick={() => setActivePage('coach')}>
              Entrar a modo coach
            </button> : null}
            {currentUser.role === 'admin' ? (
              <button type="button" className="k-button-secondary w-full" onClick={() => setActivePage('admin')}>
                Entrar a admin
              </button>
            ) : null}
          </div>
        </MotionCard>
      ) : null}
    </div>
  )
}
