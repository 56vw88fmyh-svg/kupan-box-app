import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, StaleDataState } from '../components/ui/index.js'
import { formatChileDisplayDate, formatShortChileDate, loadCommunityFeed, loadTodaysWod } from '../utils/communityFeed.js'
import { formatReservationDate, loadReservationData } from '../utils/supabaseReservations.js'

const fallbackDashboard = {
  isLoading: false,
  message: '',
  classes: [],
  reservations: [],
  wod: null,
  news: [],
}

function getInitials(name = 'KUPAN') {
  return String(name)
    .split(' ')
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'K'
}

function getSafeName(currentUser) {
  return currentUser?.name || currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Atleta KUPAN'
}

function getDateTimeValue(classItem) {
  if (!classItem?.reservationDate || !classItem?.time) return Number.MAX_SAFE_INTEGER
  const value = new Date(`${classItem.reservationDate}T${classItem.time}:00`).getTime()
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value
}

function findNextReservation(reservations = []) {
  return reservations
    .filter((reservation) => ['reserved', 'waitlist', 'cancelled'].includes(reservation.status))
    .sort((a, b) => {
      const aTime = new Date(`${a.reservation_date ?? ''}T${a.class_schedule?.time ?? '23:59'}:00`).getTime()
      const bTime = new Date(`${b.reservation_date ?? ''}T${b.class_schedule?.time ?? '23:59'}:00`).getTime()
      return (Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime) - (Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime)
    })[0] ?? null
}

function normalizeReservedClass(reservation) {
  if (!reservation?.class_schedule) return null

  return {
    classScheduleId: reservation.class_schedule.id ?? reservation.class_schedule_id,
    reservationDate: reservation.reservation_date,
    day: reservation.class_schedule.day_of_week ? ['','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'][reservation.class_schedule.day_of_week] : '',
    time: reservation.class_schedule.time?.slice(0, 5) ?? '',
    name: reservation.class_schedule.class_name ?? 'Clase KUPAN',
    coach: reservation.class_schedule.coach ?? 'Coach KUPAN',
    maxSpots: reservation.class_schedule.max_spots ?? 12,
    spots: null,
    isReserved: reservation.status === 'reserved',
    status: reservation.status,
  }
}

function getNextClass(classes = [], reservations = []) {
  const nextReservation = findNextReservation(reservations)
  if (nextReservation) return normalizeReservedClass(nextReservation)

  return [...classes]
    .sort((a, b) => getDateTimeValue(a) - getDateTimeValue(b))
    .find((classItem) => !classItem.isReserved) ?? null
}

function getClassStatus(classItem, currentUser) {
  if (!classItem) return { state: 'empty', label: 'Sin clases disponibles', action: 'Ver horarios' }
  if (classItem.status === 'cancelled') return { state: 'cancelled', label: 'Clase cancelada', action: 'Ver horarios' }
  if (classItem.status === 'waitlist') return { state: 'pending', label: 'Lista de espera', action: 'Ver reserva' }
  if (classItem.isReserved) return { state: 'reserved', label: 'Reserva confirmada', action: 'Ver reserva' }
  if (classItem.isFull) return { state: 'full', label: 'Clase completa', action: 'Ver horarios' }
  if (!currentUser) return { state: 'pending', label: 'Inicia sesión para reservar', action: 'Iniciar sesión' }
  return { state: 'available', label: 'Sin reserva', action: 'Reservar clase' }
}

function getBadgeState(status) {
  if (status.state === 'reserved') return 'reserved'
  if (status.state === 'available') return 'available'
  if (status.state === 'full') return 'full'
  if (status.state === 'cancelled') return 'cancelled'
  if (status.state === 'pending') return 'pending'
  return 'neutral'
}

function buildWodSummary(wod, fallbackWod) {
  if (!wod && !fallbackWod) return null
  if (wod) {
    const lines = [
      ...wod.warmup.slice(0, 1),
      ...wod.strength.slice(0, 1),
      ...wod.workout.slice(0, 2),
    ].filter(Boolean).slice(0, 4)

    return {
      title: wod.title || 'WOD KUPAN',
      type: wod.timeCap ? `Time cap ${wod.timeCap}` : 'WOD de hoy',
      level: 'Todos los niveles',
      lines,
    }
  }

  return {
    title: fallbackWod.title || 'WOD KUPAN',
    type: fallbackWod.type || 'WOD de hoy',
    level: 'Todos los niveles',
    lines: (fallbackWod.workout ?? []).slice(0, 4),
  }
}

function HomeHeader({ currentUser, dateLabel, onProfile }) {
  const name = getSafeName(currentUser)

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold leading-5 text-white/65">Hola,</p>
        <h1 className="break-words text-3xl font-black uppercase leading-none text-white">{name}</h1>
        <p className="mt-2 text-sm font-bold capitalize leading-5 text-white/60">{dateLabel}</p>
      </div>
      <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-kupan-border bg-kupan-gray/80 text-sm font-black uppercase text-white shadow-2xl" aria-label="Ir a perfil" onClick={onProfile}>
        {getInitials(name)}
      </button>
    </header>
  )
}

function NextClassCard({ classItem, currentUser, onAction }) {
  const status = getClassStatus(classItem, currentUser)
  const dateLabel = classItem?.reservationDate ? formatReservationDate(classItem.reservationDate) : 'Próxima clase'
  const spotsLabel = classItem?.spots === null || classItem?.spots === undefined ? 'Cupo reservado' : `${classItem.spots} cupos quedan`
  const coach = classItem?.coach || 'Coach KUPAN'

  if (!classItem) {
    return (
      <EmptyState
        title="No hay clases publicadas"
        description="Revisa más tarde o escribe al box para confirmar horarios."
        action={<Button onClick={onAction}>Ver horarios</Button>}
      />
    )
  }

  return (
    <Card className="overflow-hidden p-0" variant="elevated">
      <div className="border-b border-kupan-border bg-kupan-ember/10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Próxima clase</p>
            <h2 className="mt-3 break-words text-3xl font-black uppercase leading-none text-white">{classItem.name || 'Clase KUPAN'}</h2>
          </div>
          <Badge state={getBadgeState(status)}>{status.label}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 border-b border-kupan-border">
        <div className="p-4">
          <p className="text-xs font-black uppercase text-white/55">Día</p>
          <p className="mt-1 text-lg font-black uppercase text-white">{dateLabel}</p>
        </div>
        <div className="border-l border-kupan-border p-4">
          <p className="text-xs font-black uppercase text-white/55">Hora</p>
          <p className="mt-1 text-lg font-black uppercase text-white">{classItem.time || 'Por definir'}</p>
        </div>
        <div className="border-t border-kupan-border p-4">
          <p className="text-xs font-black uppercase text-white/55">Coach</p>
          <p className="mt-1 text-sm font-black uppercase text-white">{coach}</p>
        </div>
        <div className="border-l border-t border-kupan-border p-4">
          <p className="text-xs font-black uppercase text-white/55">Cupos</p>
          <p className="mt-1 text-sm font-black uppercase text-kupan-flame">{spotsLabel}</p>
        </div>
      </div>
      <div className="p-5">
        <Button className="w-full" variant={status.state === 'full' || status.state === 'cancelled' ? 'secondary' : 'primary'} onClick={onAction}>
          {status.action}
        </Button>
      </div>
    </Card>
  )
}

function WodPreview({ summary, onOpen }) {
  if (!summary) {
    return (
      <Card className="p-5" variant="standard">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">WOD de hoy</p>
        <h2 className="mt-3 text-2xl font-black uppercase leading-tight text-white">WOD sorpresa</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">El coach aún no ha publicado la pizarra de hoy.</p>
        <Button className="mt-4 w-full" variant="secondary" onClick={onOpen}>Ver WOD completo</Button>
      </Card>
    )
  }

  return (
    <Card className="p-5" variant="standard">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">WOD de hoy</p>
          <h2 className="mt-3 text-2xl font-black uppercase leading-tight text-white">{summary.title}</h2>
          <p className="mt-1 text-sm font-bold text-white/60">{summary.type} · {summary.level}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {summary.lines.length > 0 ? summary.lines.map((line) => (
          <li key={line} className="flex gap-3 text-sm leading-6 text-white/75">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kupan-ember" aria-hidden="true" />
            <span>{line}</span>
          </li>
        )) : <li className="text-sm leading-6 text-white/65">Resumen pendiente.</li>}
      </ul>
      <Button className="mt-5 w-full" variant="secondary" onClick={onOpen}>Ver WOD completo</Button>
    </Card>
  )
}

function QuickActions({ setActivePage }) {
  const actions = [
    { label: 'Reservar', page: 'reservations' },
    { label: 'Ver WOD', page: 'wod' },
    { label: 'Horarios', page: 'reservations' },
    { label: 'Registrar resultado', page: 'prs' },
  ]

  return (
    <section>
      <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/55">Accesos rápidos</p>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button key={action.label} variant="secondary" onClick={() => setActivePage(action.page)}>{action.label}</Button>
        ))}
      </div>
    </section>
  )
}

function NewsPreview({ news, onOpenCommunity }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Novedades</p>
          <h2 className="text-xl font-black uppercase text-white">Lo último del box</h2>
        </div>
        <button type="button" className="text-xs font-black uppercase text-white/65 hover:text-white" onClick={onOpenCommunity}>Ver comunidad</button>
      </div>
      {news.length > 0 ? (
        <div className="space-y-3">
          {news.slice(0, 2).map((item) => (
            <Card key={item.id} className="p-4" variant="standard">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-kupan-flame">{item.type ?? 'KUPAN'} · {formatShortChileDate(item.event_date ?? item.created_at?.slice(0, 10))}</p>
              <h3 className="mt-2 font-black uppercase text-white">{item.title || 'Novedad KUPAN'}</h3>
              {item.content ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/65">{item.content}</p> : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-4" variant="standard">
          <p className="font-black uppercase text-white">Sin novedades por ahora.</p>
          <p className="mt-1 text-sm leading-6 text-white/60">Cuando haya eventos o noticias, aparecerán acá.</p>
        </Card>
      )}
    </section>
  )
}

export function Home({ setActivePage, appContent, currentUser }) {
  const [dashboard, setDashboard] = useState({ ...fallbackDashboard, isLoading: true })
  const dateLabel = useMemo(() => formatChileDisplayDate(), [])

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setDashboard((current) => ({ ...current, isLoading: true, message: '' }))
      const [reservationResult, wodResult, communityResult] = await Promise.allSettled([
        loadReservationData(currentUser?.id),
        loadTodaysWod(),
        loadCommunityFeed(),
      ])

      if (!isMounted) return

      const reservationData = reservationResult.status === 'fulfilled' && reservationResult.value.ok ? reservationResult.value : null
      const wodData = wodResult.status === 'fulfilled' && wodResult.value.ok ? wodResult.value.wod : null
      const communityData = communityResult.status === 'fulfilled' && communityResult.value.ok ? communityResult.value : null
      const errors = [reservationResult, wodResult, communityResult]
        .map((result) => (result.status === 'fulfilled' && !result.value.ok ? result.value.message : result.reason?.message))
        .filter(Boolean)

      setDashboard({
        isLoading: false,
        message: errors[0] ?? '',
        classes: reservationData?.classes ?? appContent.schedule ?? [],
        reservations: reservationData?.reservations ?? [],
        wod: wodData,
        news: communityData?.news ?? [],
      })
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [appContent.schedule, currentUser?.id])

  const nextClass = getNextClass(dashboard.classes, dashboard.reservations)
  const wodSummary = buildWodSummary(dashboard.wod, appContent.wod)

  function handleClassAction() {
    if (!currentUser) {
      setActivePage('login')
      return
    }
    setActivePage('reservations')
  }

  return (
    <div className="space-y-6">
      <HomeHeader currentUser={currentUser} dateLabel={dateLabel} onProfile={() => setActivePage('profile')} />

      {dashboard.isLoading ? <LoadingState label="Preparando tu día KUPAN" /> : null}

      {!dashboard.isLoading && dashboard.message ? (
        <ErrorState
          title="No pudimos cargar todo el inicio"
          description="Mostramos la información disponible. Intenta nuevamente si algo no aparece actualizado."
          onAction={() => window.location.reload()}
        />
      ) : null}
      {!dashboard.isLoading && dashboard.message && (dashboard.classes.length > 0 || dashboard.news.length > 0 || dashboard.wod) ? (
        <StaleDataState onRetry={() => window.location.reload()} />
      ) : null}

      {!dashboard.isLoading ? <NextClassCard classItem={nextClass} currentUser={currentUser} onAction={handleClassAction} /> : null}

      {!dashboard.isLoading ? <WodPreview summary={wodSummary} onOpen={() => setActivePage('wod')} /> : null}

      <QuickActions setActivePage={setActivePage} />

      {!dashboard.isLoading ? <NewsPreview news={dashboard.news} onOpenCommunity={() => setActivePage('community')} /> : null}
    </div>
  )
}
