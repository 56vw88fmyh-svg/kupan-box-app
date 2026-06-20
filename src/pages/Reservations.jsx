import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Dialog, EmptyState, ErrorState, LoadingState, useToast } from '../components/ui/index.js'
import {
  cancelSupabaseReservation,
  createSupabaseReservation,
  formatReservationDate,
  loadReservationData,
} from '../utils/supabaseReservations.js'

const CHILE_TIME_ZONE = 'America/Santiago'
const dayNames = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']

function getChileDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CHILE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getReservationDayId(date) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: CHILE_TIME_ZONE, weekday: 'short' }).format(date)
  const map = { Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5', Sat: '6', Sun: '7' }
  return map[weekday] ?? '1'
}

function buildWeekDays(baseDate = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() + index)
    const short = new Intl.DateTimeFormat('es-CL', { timeZone: CHILE_TIME_ZONE, weekday: 'short' })
      .format(date)
      .replace('.', '')
    const number = new Intl.DateTimeFormat('es-CL', { timeZone: CHILE_TIME_ZONE, day: '2-digit' }).format(date)
    const month = new Intl.DateTimeFormat('es-CL', { timeZone: CHILE_TIME_ZONE, month: 'short' })
      .format(date)
      .replace('.', '')

    return {
      date,
      dateKey: getChileDateKey(date),
      dayId: getReservationDayId(date),
      short,
      number,
      month,
      label: new Intl.DateTimeFormat('es-CL', {
        timeZone: CHILE_TIME_ZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(date),
    }
  })
}

function parseLocalClassDateTime(reservationDate, time) {
  if (!reservationDate || !time) return null
  const [year, month, day] = reservationDate.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  if (![year, month, day, hours, minutes].every(Number.isFinite)) return null
  return new Date(year, month - 1, day, hours, minutes)
}

function formatMembershipDate(date) {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: CHILE_TIME_ZONE,
  }).format(new Date(`${date}T00:00:00`))
}

function getDurationLabel(item) {
  const duration = item.durationMinutes ?? item.duration_minutes ?? item.duration
  if (!duration) return ''
  if (typeof duration === 'number') return `${duration} min`
  return String(duration)
}

function getSpots(item) {
  const maxSpots = Number(item.maxSpots ?? item.max_spots ?? 0)
  const available = Math.max(Number(item.spots ?? item.available_spots ?? 0), 0)
  const capacity = maxSpots > 0 ? maxSpots : available
  const occupied = Math.max(capacity - available, 0)
  return { capacity, available, occupied }
}

function getClassViewState(item, now = new Date()) {
  const classDateTime = parseLocalClassDateTime(item.reservationDate, item.time)
  const isPastOrInProgress = classDateTime ? classDateTime <= now : false
  const rawStatus = String(item.status ?? item.class_status ?? '').toLowerCase()

  if (rawStatus.includes('cancel') || item.isCancelled) {
    return { key: 'cancelled', label: 'Clase cancelada', badge: 'cancelled', action: 'none' }
  }

  if (rawStatus.includes('closed') || rawStatus.includes('cerrad') || item.isClosed) {
    return { key: 'closed', label: 'Reservas cerradas', badge: 'neutral', action: 'none' }
  }

  if (isPastOrInProgress) {
    return { key: 'past', label: 'En curso o pasada', badge: 'neutral', action: 'none' }
  }

  if (item.isReserved) {
    return { key: 'reserved', label: 'Reserva confirmada', badge: 'success', action: 'cancel' }
  }

  if (item.isFull) {
    return { key: 'full', label: 'Clase completa', badge: 'full', action: 'none' }
  }

  return { key: 'available', label: 'Cupos disponibles', badge: 'available', action: 'reserve' }
}

function getClassKey(item) {
  return `${item.classScheduleId}-${item.reservationDate}`
}

function PlanStatusCard({ currentUser, hasActiveMembership, membership, remainingTokens, isLoading }) {
  const isUnlimitedPlan = Boolean(membership?.is_unlimited)
  const planName = membership?.plan?.name ?? membership?.plan_name ?? 'Plan KUPAN'
  const expiresAt = membership?.end_date ?? membership?.expires_at
  const hasTokens = isUnlimitedPlan || remainingTokens === null || Number(remainingTokens) > 0

  return (
    <Card variant="standard" className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">Tu acceso</p>
          <h2 className="mt-1 text-lg font-black text-text-primary">
            {isLoading
              ? 'Actualizando plan...'
              : !currentUser
                ? 'Inicia sesión para reservar'
                : hasActiveMembership
                  ? planName
                  : 'Sin plan activo'}
          </h2>
        </div>
        <Badge status={hasActiveMembership && hasTokens ? 'success' : 'warning'}>
          {hasActiveMembership ? (hasTokens ? 'Listo para reservar' : 'Sin tokens') : 'Revisar plan'}
        </Badge>
      </div>
      {currentUser ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl border border-border-default bg-bg-secondary p-3">
            <p className="text-xs text-text-muted">Tokens</p>
            <p className="mt-1 font-black text-text-primary">{hasActiveMembership ? (isUnlimitedPlan ? 'Full' : remainingTokens ?? 0) : '-'}</p>
          </div>
          <div className="rounded-xl border border-border-default bg-bg-secondary p-3">
            <p className="text-xs text-text-muted">Vence</p>
            <p className="mt-1 font-black text-text-primary">{hasActiveMembership ? formatMembershipDate(expiresAt) : 'Sin fecha'}</p>
          </div>
          <div className="rounded-xl border border-border-default bg-bg-secondary p-3">
            <p className="text-xs text-text-muted">Estado</p>
            <p className="mt-1 font-black text-text-primary">{hasActiveMembership && hasTokens ? 'Activo' : 'Bloqueado'}</p>
          </div>
        </div>
      ) : null}
      {currentUser && (!hasActiveMembership || !hasTokens) ? (
        <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm font-semibold text-text-secondary">
          Para reservar necesitas un plan activo y cupos disponibles. Si ya pagaste, pide revisión en recepción.
        </p>
      ) : null}
    </Card>
  )
}

function WeekSelector({ weekDays, selectedDateKey, onSelect }) {
  return (
    <div className="-mx-4 overflow-x-auto k-scroll-x px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Seleccionar dia de reserva">
      <div className="flex min-w-max gap-2">
        {weekDays.map((day) => {
          const isSelected = day.dateKey === selectedDateKey
          return (
            <button
              key={day.dateKey}
              type="button"
              aria-pressed={isSelected}
              aria-label={`Ver clases de ${day.label}`}
              onClick={() => onSelect(day.dateKey)}
              className={`min-h-20 min-w-[4.75rem] rounded-2xl border px-3 py-3 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red ${
                isSelected
                  ? 'border-brand-red bg-brand-red text-white shadow-[0_0_0_3px_rgba(240,68,68,.18)]'
                  : 'border-border-default bg-bg-card text-text-secondary hover:border-border-strong hover:bg-bg-elevated hover:text-text-primary'
              }`}
            >
              <span className="block text-xs font-black uppercase tracking-[0.12em]">{day.short}</span>
              <span className="mt-1 block text-2xl font-black leading-none">{day.number}</span>
              <span className="mt-1 block text-[0.68rem] font-bold uppercase opacity-80">{day.month}</span>
              {isSelected ? <span className="mx-auto mt-2 block h-1.5 w-8 rounded-full bg-white" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ClassCard({ item, reservation, currentUser, hasActiveMembership, remainingTokens, onReserve, onCancel, processingKey }) {
  const status = getClassViewState(item)
  const spots = getSpots(item)
  const duration = getDurationLabel(item)
  const classKey = getClassKey(item)
  const isProcessing = processingKey === classKey
  const hasTokens = remainingTokens === null || Number(remainingTokens) > 0
  const canReserve = status.action === 'reserve' && currentUser && hasActiveMembership && hasTokens
  const progress = spots.capacity > 0 ? Math.min((spots.occupied / spots.capacity) * 100, 100) : 0

  return (
    <Card variant={status.key === 'reserved' ? 'selected' : 'interactive'} className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-3xl font-black leading-none text-text-primary">{item.time}</p>
          <h3 className="mt-2 text-lg font-black text-text-primary">{item.name}</h3>
          <p className="mt-1 text-sm text-text-secondary">Coach {item.coach || 'KUPAN'}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-text-muted">
            <span>{formatReservationDate(item.reservationDate)}</span>
            {duration ? <span>· {duration}</span> : null}
            {item.block ? <span>· {item.block}</span> : null}
          </div>
        </div>
        <Badge status={status.badge}>{status.label}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-border-default bg-bg-secondary p-3">
          <p className="text-text-muted">Ocupados</p>
          <p className="mt-1 text-xl font-black text-text-primary">{spots.occupied}/{spots.capacity || '-'}</p>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-secondary p-3">
          <p className="text-text-muted">Disponibles</p>
          <p className="mt-1 text-xl font-black text-text-primary">{spots.available}</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-elevated" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-red transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-4">
        {status.action === 'reserve' ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isProcessing}
            disabled={isProcessing || !canReserve}
            onClick={() => onReserve(item)}
          >
            {!currentUser ? 'Iniciar sesión' : !hasActiveMembership ? 'Plan requerido' : !hasTokens ? 'Sin tokens' : 'Reservar'}
          </Button>
        ) : null}
        {status.action === 'cancel' ? (
          <Button type="button" variant="secondary" size="lg" fullWidth disabled={isProcessing || !reservation?.id} onClick={() => onCancel(reservation ?? item)}>
            Cancelar reserva
          </Button>
        ) : null}
        {status.key === 'full' ? <p className="text-sm font-semibold text-text-muted">No hay lista de espera activa para esta clase.</p> : null}
        {status.action === 'none' && status.key !== 'full' ? <p className="text-sm font-semibold text-text-muted">Esta clase no admite acciones de reserva.</p> : null}
      </div>
    </Card>
  )
}

function ReservationList({ reservations, onCancel, processingKey }) {
  if (reservations.length === 0) {
    return (
      <EmptyState
        title="Aun no tienes reservas."
        description="Elige una clase disponible y tu cupo quedará guardado aquí."
      />
    )
  }

  return (
    <div className="space-y-3">
      {reservations.map((item) => {
        const classKey = getClassKey(item)
        return (
          <Card key={item.id} variant="standard" className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{item.day} · {formatReservationDate(item.reservationDate)}</p>
                <h3 className="mt-1 font-black text-text-primary">{item.name}</h3>
                <p className="mt-1 text-sm text-text-secondary">{item.time} · Coach {item.coach || 'KUPAN'}</p>
              </div>
              <Button type="button" variant="tertiary" size="sm" disabled={processingKey === classKey} onClick={() => onCancel(item)}>
                Cancelar
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export function Reservations({ pendingReservation, currentUser, onClearPendingReservation, setActivePage }) {
  const { showToast } = useToast()
  const weekDays = useMemo(() => buildWeekDays(), [])
  const [availableClasses, setAvailableClasses] = useState([])
  const [userActiveReservations, setUserActiveReservations] = useState([])
  const [membership, setMembership] = useState(null)
  const [hasActiveMembership, setHasActiveMembership] = useState(false)
  const [remainingTokens, setRemainingTokens] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [reservationMessage, setReservationMessage] = useState('')
  const [selectedDateKey, setSelectedDateKey] = useState(weekDays[0]?.dateKey ?? getChileDateKey())
  const [processingClassKey, setProcessingClassKey] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)

  const selectedDay = weekDays.find((day) => day.dateKey === selectedDateKey) ?? weekDays[0]
  const filteredClasses = availableClasses
    .filter((classItem) => classItem.dayId === selectedDay?.dayId)
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))
  const totalSpots = filteredClasses.reduce((sum, item) => sum + getSpots(item).available, 0)
  const reservationByClassKey = useMemo(() => new Map(userActiveReservations.map((reservation) => [getClassKey(reservation), reservation])), [userActiveReservations])

  const refreshReservations = useCallback(async () => {
    setIsLoading(true)
    const result = await loadReservationData(currentUser?.id)
    setIsLoading(false)

    if (!result.ok) {
      setReservationMessage(result.message)
      return
    }

    setAvailableClasses(result.classes)
    setUserActiveReservations(result.reservations.map((reservation) => ({
      id: reservation.id,
      classScheduleId: reservation.class_schedule_id,
      reservationDate: reservation.reservation_date,
      status: reservation.status,
      dayId: String(reservation.class_schedule?.day_of_week),
      day: reservation.class_schedule?.day_of_week ? dayNames[reservation.class_schedule.day_of_week] : '',
      block: reservation.class_schedule?.time && Number(reservation.class_schedule.time.slice(0, 2)) < 12 ? 'AM' : 'PM',
      time: reservation.class_schedule?.time?.slice(0, 5) ?? '',
      name: reservation.class_schedule?.class_name ?? 'Clase KUPAN',
      coach: reservation.class_schedule?.coach ?? 'Coach KUPAN',
      isReserved: reservation.status === 'reserved',
    })))
    setMembership(result.membership)
    setHasActiveMembership(result.hasActiveMembership)
    setRemainingTokens(result.remainingTokens)
    setReservationMessage('')
  }, [currentUser?.id])

  useEffect(() => {
    refreshReservations()
  }, [refreshReservations])

  useEffect(() => {
    if (!pendingReservation) return
    const matchedClass = availableClasses.find((classItem) => (
      classItem.time === pendingReservation.time &&
      classItem.name === pendingReservation.name &&
      classItem.day === pendingReservation.day
    ))
    if (matchedClass?.dayId) {
      const matchedDay = weekDays.find((day) => day.dayId === matchedClass.dayId)
      if (matchedDay) setSelectedDateKey(matchedDay.dateKey)
    }
    onClearPendingReservation()
  }, [availableClasses, onClearPendingReservation, pendingReservation, weekDays])

  async function handleReserve(classItem) {
    if (!currentUser) {
      setActivePage('login')
      return
    }

    const classKey = getClassKey(classItem)
    if (processingClassKey === classKey || classItem.isReserved) return

    setProcessingClassKey(classKey)
    setReservationMessage('')
    const result = await createSupabaseReservation(currentUser.id, classItem, hasActiveMembership)

    if (!result.ok) {
      const completed = result.message.toLowerCase().includes('complet') || result.message.toLowerCase().includes('cupos')
      setReservationMessage(completed ? 'La clase acaba de completarse. Actualizamos los cupos disponibles.' : result.message)
      showToast({
        type: completed ? 'warning' : 'error',
        title: completed ? 'Clase completa' : 'No pudimos reservar',
        description: completed ? 'Otro alumno tomó el ultimo cupo antes que tu.' : result.message,
      })
      await refreshReservations()
      setProcessingClassKey('')
      return
    }

    showToast({
      type: 'success',
      title: 'Reserva confirmada',
      description: `${classItem.name} a las ${classItem.time} quedó guardada en tu agenda.`,
    })
    await refreshReservations()
    setProcessingClassKey('')
  }

  function requestCancel(classItem) {
    setCancelTarget(classItem)
  }

  async function confirmCancel() {
    if (!cancelTarget?.id) return
    const classKey = getClassKey(cancelTarget)
    setProcessingClassKey(classKey)
    const result = await cancelSupabaseReservation(cancelTarget.id)

    if (!result.ok) {
      setReservationMessage(result.message)
      showToast({ type: 'error', title: 'No pudimos cancelar', description: result.message })
      setProcessingClassKey('')
      return
    }

    showToast({ type: 'success', title: 'Reserva cancelada', description: result.message || 'Tu cupo quedó liberado.' })
    setCancelTarget(null)
    await refreshReservations()
    setProcessingClassKey('')
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <section className="space-y-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-red">Reservas</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black leading-tight text-text-primary sm:text-4xl">Reserva tu proxima clase</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-text-secondary">
              Elige el día, revisa cupos reales y toma tu clase en un solo paso.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-60">
            <Card variant="standard" className="p-3 text-center">
              <p className="text-2xl font-black text-text-primary">{filteredClasses.length}</p>
              <p className="text-xs font-bold text-text-muted">clases</p>
            </Card>
            <Card variant="standard" className="p-3 text-center">
              <p className="text-2xl font-black text-success">{totalSpots}</p>
              <p className="text-xs font-bold text-text-muted">cupos</p>
            </Card>
          </div>
        </div>
      </section>

      <PlanStatusCard
        currentUser={currentUser}
        hasActiveMembership={hasActiveMembership}
        membership={membership}
        remainingTokens={remainingTokens}
        isLoading={isLoading}
      />

      <section className="space-y-4">
        <WeekSelector weekDays={weekDays} selectedDateKey={selectedDateKey} onSelect={setSelectedDateKey} />

        {isLoading ? <LoadingState title="Cargando horarios" description="Estamos revisando cupos reales desde KUPAN." /> : null}

        {reservationMessage ? (
          <ErrorState title="Atencion" description={reservationMessage} actionLabel="Actualizar cupos" onAction={refreshReservations} />
        ) : null}

        {!isLoading && !reservationMessage && filteredClasses.length === 0 ? (
          <EmptyState
            title="No hay clases programadas para este día."
            description="Puedes revisar otro día de la semana para encontrar el mejor horario."
          />
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {filteredClasses.map((item) => (
            <ClassCard
              key={getClassKey(item)}
              item={item}
              reservation={reservationByClassKey.get(getClassKey(item))}
              currentUser={currentUser}
              hasActiveMembership={hasActiveMembership}
              remainingTokens={remainingTokens}
              onReserve={handleReserve}
              onCancel={requestCancel}
              processingKey={processingClassKey}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">Mis reservas</p>
          <h2 className="mt-1 text-2xl font-black text-text-primary">Tu agenda</h2>
        </div>
        <ReservationList reservations={userActiveReservations} onCancel={requestCancel} processingKey={processingClassKey} />
      </section>

      <Dialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancelar reserva"
        description={cancelTarget ? `¿Cancelar tu reserva de ${cancelTarget.name} a las ${cancelTarget.time}?` : ''}
        isDestructive
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" fullWidth onClick={() => setCancelTarget(null)}>
            Mantener reserva
          </Button>
          <Button type="button" variant="destructive" fullWidth isLoading={Boolean(cancelTarget && processingClassKey === getClassKey(cancelTarget))} onClick={confirmCancel}>
            Sí, cancelar
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
