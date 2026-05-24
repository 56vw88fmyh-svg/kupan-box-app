import { useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { profile as mockProfile } from '../data/mockData.js'
import { updateCurrentUserPassword } from '../utils/auth.js'
import {
  calculateAge,
  calculateDaysRemaining,
  loadSupabaseProfileData,
  profileEditableLevels,
  updateSupabaseProfile,
} from '../utils/profileData.js'

const weeklyProgress = [
  { day: 'L', done: true },
  { day: 'M', done: true },
  { day: 'M', done: false },
  { day: 'J', done: true },
  { day: 'V', done: false },
  { day: 'S', done: true },
]

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

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
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 break-words text-sm font-black uppercase text-white">{value || 'Sin registrar'}</p>
    </div>
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

export function Profile({ userReservations, onCancelReservation, setActivePage, currentUser, onLogout, onUserUpdate }) {
  const [profileData, setProfileData] = useState(null)
  const [isFetchingProfile, setIsFetchingProfile] = useState(false)
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

  useEffect(() => {
    let isMounted = true

    async function fetchProfile() {
      if (!currentUser?.id) return

      setIsFetchingProfile(true)
      const result = await loadSupabaseProfileData(currentUser.id)

      if (!isMounted) return

      setIsFetchingProfile(false)

      if (!result.ok) {
        setProfileMessage(result.message)
        setMessageType('error')
        return
      }

      const nextProfile = result.data.profile
      setProfileData(result.data)
      setFormData({
        fullName: nextProfile?.full_name ?? currentUser.name ?? '',
        phone: nextProfile?.phone ?? '',
        birthDate: nextProfile?.birth_date ?? '',
        level: nextProfile?.level ?? 'Iniciado',
      })
      setProfileMessage('')
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [currentUser?.id, currentUser?.name])

  const supabaseProfile = profileData?.profile
  const activeMembership = profileData?.membership
  const supabaseReservations = profileData?.reservations ?? []
  const personalRecords = profileData?.records ?? []
  const localReservations = currentUser
    ? userReservations.filter((reservation) => reservation.userId === currentUser.id)
    : []
  const visibleReservations = supabaseReservations.length > 0 ? supabaseReservations : localReservations

  const profileName = supabaseProfile?.full_name ?? currentUser?.name ?? mockProfile.name
  const email = supabaseProfile?.email ?? currentUser?.email ?? 'Inicia sesion para guardar tu progreso'
  const phone = supabaseProfile?.phone ?? currentUser?.phone ?? ''
  const birthDate = supabaseProfile?.birth_date ?? currentUser?.birthDate ?? ''
  const age = calculateAge(birthDate)
  const level = supabaseProfile?.level ?? currentUser?.level ?? 'Iniciado'
  const status = supabaseProfile?.status ?? currentUser?.status ?? 'active'
  const plan = activeMembership?.plan
  const planName = plan?.name ?? activeMembership?.plan_name
  const planPrice = plan?.price
  const isUnlimitedPlan = Boolean(plan?.is_unlimited ?? activeMembership?.is_unlimited)
  const classesTotal = activeMembership?.classes_total
  const classesUsed = activeMembership?.classes_used ?? 0
  const classesRemaining = isUnlimitedPlan ? null : Math.max(Number(classesTotal ?? 0) - Number(classesUsed), 0)
  const daysRemaining = calculateDaysRemaining(activeMembership?.end_date)

  const weeklyCompleted = weeklyProgress.filter((item) => item.done).length
  const weeklyGoal = weeklyProgress.length
  const weeklyPercent = Math.round((weeklyCompleted / weeklyGoal) * 100)
  const attendance = currentUser ? mockProfile.attendance + visibleReservations.length : mockProfile.attendance
  const motivation = 'Entrena fuerte, entrena acompañado. El progreso se construye apareciendo.'

  const stats = useMemo(() => ([
    { label: 'Reservas', value: visibleReservations.length },
    { label: 'Asistencias', value: attendance },
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
          <p className="k-pill inline-flex text-kupan-flame">Perfil KUPAN</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Entra a tu cuenta y entrena acompañado.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Inicia sesion para ver tu plan, reservas, datos personales y progreso dentro del box.
          </p>
          <button type="button" className="k-button mt-5 w-full" onClick={() => setActivePage('login')}>
            Iniciar sesion
          </button>
        </MotionCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <MotionCard as="section" className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-kupan-ember/50 bg-kupan-ember text-4xl font-black text-white shadow-glow">
              {profileName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="k-pill inline-flex text-kupan-flame">Atleta KUPAN</p>
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
            <div key={item.label} className={`${index > 0 ? 'border-l border-white/10' : ''} p-4`}>
              <p className={`${item.label === 'Nivel' ? 'text-2xl text-kupan-flame' : 'text-3xl text-white'} font-black uppercase`}>{item.value}</p>
              <p className="text-[0.65rem] font-black uppercase text-white/60">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="p-5">
          <button type="button" className="k-button-secondary w-full" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </MotionCard>

      <MotionCard as="section" className="k-card p-5" delay={0.03}>
        <SectionTitle eyebrow="Datos del atleta" title="Tu ficha KUPAN" />
        {isFetchingProfile ? <p className="mb-4 text-sm font-bold text-white/60">Cargando tus datos desde Supabase...</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileField label="Nombre completo" value={profileName} />
          <ProfileField label="Email" value={email} />
          <ProfileField label="Telefono" value={phone} />
          <ProfileField label="Fecha nacimiento" value={formatDate(birthDate)} />
          <ProfileField label="Edad" value={age !== null ? `${age} anos` : 'Sin registrar'} />
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
            <span className="mt-2 block text-sm font-bold leading-6 text-white/55">Nombre, telefono, fecha de nacimiento y nivel.</span>
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

        <Motion.div
          initial={false}
          animate={isEditOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <form className="mt-4 space-y-4" onSubmit={handleSaveProfile}>
            <EditableField label="Nombre completo" value={formData.fullName} required onChange={(value) => setFormData((current) => ({ ...current, fullName: value }))} />
            <EditableField label="Telefono" type="tel" value={formData.phone} onChange={(value) => setFormData((current) => ({ ...current, phone: value }))} />
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
              Email, plan, rol y estado de membresia quedan protegidos. Si necesitas cambiarlos, debe hacerlo un admin.
            </div>

            <button type="submit" className="k-button w-full" disabled={isSavingProfile}>
              {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </Motion.div>
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

        <Motion.div
          initial={false}
          animate={isPasswordOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
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
      </MotionCard>

      <MotionCard as="section" className="k-card p-5" delay={0.05}>
        <SectionTitle eyebrow="Plan activo" title={planName ?? 'Sin plan activo'} />
        {activeMembership ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfileField label="Plan" value={`${planName ?? 'Plan KUPAN'} ${planPrice ? `· ${formatCurrency(planPrice)}` : ''}`} />
              <ProfileField label="Inicio" value={formatDate(activeMembership.start_date)} />
              <ProfileField label="Vencimiento" value={formatDate(activeMembership.end_date)} />
              <ProfileField label="Dias restantes" value={daysRemaining !== null ? `${daysRemaining} dias` : 'Sin registrar'} />
              <ProfileField label="Tokens totales" value={isUnlimitedPlan ? 'Ilimitado' : classesTotal} />
              <ProfileField label="Tokens usados" value={isUnlimitedPlan ? 'No descuenta' : classesUsed} />
              <ProfileField label="Tokens disponibles" value={isUnlimitedPlan ? 'Ilimitado' : classesRemaining} />
              <ProfileField label="Estado membresia" value={activeMembership.status === 'active' ? 'Activa' : activeMembership.status} />
            </div>
            <p className="mt-4 rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-4 text-sm font-bold leading-6 text-white">
              Los tokens no utilizados vencen al terminar el plan y no son acumulables.
            </p>
          </>
        ) : (
          <p className="text-sm leading-6 text-white/60">
            Aun no hay una membresia activa asociada a tu perfil. Escríbenos para activar tu plan y seguir entrenando.
          </p>
        )}
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
        <SectionTitle eyebrow="Reservas activas" title="Tu agenda KUPAN" />
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
                    {!isSupabaseReservation ? (
                      <button type="button" className="k-button-secondary shrink-0 px-3 py-2 text-xs" onClick={() => onCancelReservation(item.id)}>
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </MotionCard>
              )
            })}
          </div>
        ) : (
          <MotionCard className="k-panel p-4">
            <p className="font-black uppercase text-white">Aun no tienes reservas.</p>
            <p className="mt-1 text-sm leading-6 text-white/60">Reserva tu clase y ven a darlo todo. Tu semana queda ordenada aca.</p>
          </MotionCard>
        )}
      </section>

      <section>
        <SectionTitle eyebrow="Ultimos PR" title="Marcas que se celebran" />
        <button type="button" className="k-button mb-4 w-full" onClick={() => setActivePage('prs')}>
          Gestionar mis PR
        </button>
        <div className="space-y-3">
          {(personalRecords.length > 0 ? personalRecords : mockProfile.prs).map((record) => (
            <MotionCard key={record.id ?? record.lift} className="k-panel flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-black uppercase text-white">{record.movement ?? record.lift}</p>
                {record.record_date ? <p className="mt-1 text-xs font-bold uppercase text-white/45">{formatDate(record.record_date)}</p> : null}
              </div>
              <p className="text-lg font-black text-kupan-flame">
                {record.value} {record.unit ?? ''}
              </p>
            </MotionCard>
          ))}
        </div>
      </section>

      <MotionCard as="section" className="k-card p-5" delay={0.08}>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Gestion del box</p>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">Panel admin KUPAN</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Gestiona alumnos, planes, reservas, WOD, horarios y comunidad desde Supabase.
        </p>
        <button type="button" className="k-button-secondary mt-4 w-full" onClick={() => setActivePage('admin')}>
          Entrar a admin
        </button>
      </MotionCard>
    </div>
  )
}
