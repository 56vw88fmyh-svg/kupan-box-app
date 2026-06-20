import { useEffect, useState } from 'react'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { ErrorState, PermissionDeniedState, SuccessState } from '../components/ui/index.js'
import {
  cancelCoachReservation,
  loadCoachDashboard,
  loadCoachManualReservationOptions,
  markCoachReservation,
} from '../utils/coachData.js'
import { adminReserveForStudent } from '../utils/supabaseReservations.js'

function getMembershipTokens(membership) {
  const isUnlimited = Boolean(membership?.plan?.is_unlimited)
  const total = membership?.classes_total
  const used = Number(membership?.classes_used ?? 0)
  return {
    total: isUnlimited ? 'Ilimitado' : total ?? 0,
    used: isUnlimited ? 'No descuenta' : used,
    remaining: isUnlimited ? 'Ilimitado' : Math.max(Number(total ?? 0) - used, 0),
  }
}

function ClassSummary({ title, classItem }) {
  return (
    <MotionCard className="k-panel p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">{title}</p>
      {classItem ? (
        <>
          <h3 className="mt-2 text-3xl font-black uppercase leading-none text-white">{classItem.time}</h3>
          <p className="mt-2 font-black uppercase text-white">{classItem.className}</p>
          <p className="mt-1 text-sm text-white/60">Coach {classItem.coach}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="text-[0.65rem] font-black uppercase text-white/50">Usados</p>
              <p className="mt-1 text-2xl font-black text-white">{classItem.usedSpots}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="text-[0.65rem] font-black uppercase text-white/50">Disponibles</p>
              <p className="mt-1 text-2xl font-black text-kupan-flame">{classItem.availableSpots}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-white/60">No hay otra clase programada para hoy.</p>
      )}
    </MotionCard>
  )
}

function ReservationRow({ reservation, onMark, onCancel, busyId }) {
  const isBusy = busyId === reservation.id
  const student = reservation.profile?.full_name ?? 'Alumno KUPAN'
  const email = reservation.profile?.email

  return (
    <MotionCard as="article" className="k-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">{reservation.status}</p>
          <h3 className="mt-2 break-words font-black uppercase text-white">{student}</h3>
          {email ? <p className="mt-1 break-words text-sm text-white/55">{email}</p> : null}
          <p className="mt-2 text-xs font-black uppercase text-white/45">
            Token {reservation.token_charged ? 'cobrado' : 'no descuenta'}
          </p>
          {reservation.notes ? <p className="mt-2 text-sm leading-6 text-white/55">{reservation.notes}</p> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" disabled={isBusy || reservation.status === 'attended' || reservation.status === 'cancelled'} onClick={() => onMark(reservation.id, 'attended')}>
          {isBusy ? 'Guardando...' : 'Attended'}
        </button>
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" disabled={isBusy || reservation.status === 'no_show' || reservation.status === 'cancelled'} onClick={() => onMark(reservation.id, 'no_show')}>
          No show
        </button>
        <button type="button" className="rounded-lg border border-kupan-red/40 bg-kupan-red/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50" disabled={isBusy || reservation.status === 'attended' || reservation.status === 'no_show' || reservation.status === 'cancelled'} onClick={() => onCancel(reservation.id)}>
          Cancelar
        </button>
      </div>
    </MotionCard>
  )
}

export function Coach({ currentUser, setActivePage }) {
  const canAccess = ['admin', 'coach'].includes(currentUser?.role)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [dashboard, setDashboard] = useState({ classes: [], currentClass: null, nextClass: null })
  const [selectedClassId, setSelectedClassId] = useState('')
  const [busyId, setBusyId] = useState('')
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [manualOptions, setManualOptions] = useState({ profiles: [], memberships: [] })
  const [manualDraft, setManualDraft] = useState({ profileId: '', query: '', note: '', allowWithoutMembership: false })
  const [isManualSaving, setIsManualSaving] = useState(false)

  async function refreshCoach() {
    if (!canAccess) return

    setIsLoading(true)
    const result = await loadCoachDashboard()
    setIsLoading(false)

    if (!result.ok) {
      setMessageType('error')
      setMessage(result.message)
      return
    }

    setDashboard(result)
    setSelectedClassId((current) => current || result.currentClass?.id || result.classes[0]?.id || '')
    setMessage('')
  }

  useEffect(() => {
    refreshCoach()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess])

  useEffect(() => {
    let isMounted = true

    async function fetchManualOptions() {
      if (!canAccess || !isManualOpen) return
      const result = await loadCoachManualReservationOptions()
      if (!isMounted) return

      if (!result.ok) {
        setMessageType('error')
        setMessage(result.message)
        return
      }

      setManualOptions({ profiles: result.profiles, memberships: result.memberships })
    }

    fetchManualOptions()

    return () => {
      isMounted = false
    }
  }, [canAccess, isManualOpen])

  async function handleMark(reservationId, status) {
    setBusyId(reservationId)
    const result = await markCoachReservation(reservationId, status)
    setBusyId('')
    setMessageType(result.ok ? 'success' : 'error')
    setMessage(result.message)
    if (result.ok) refreshCoach()
  }

  async function handleCancel(reservationId) {
    setBusyId(reservationId)
    const result = await cancelCoachReservation(reservationId)
    setBusyId('')
    setMessageType(result.ok ? 'success' : 'error')
    setMessage(result.message)
    if (result.ok) refreshCoach()
  }

  async function handleManualReservation(event) {
    event.preventDefault()
    if (!selectedClass) {
      setMessageType('error')
      setMessage('Selecciona una clase antes de agregar alumno.')
      return
    }

    setIsManualSaving(true)
    const result = await adminReserveForStudent({
      profileId: manualDraft.profileId,
      classScheduleId: selectedClass.id,
      reservationDate: dashboard.today,
      allowWithoutMembership: currentUser?.role === 'admin' && manualDraft.allowWithoutMembership,
      note: manualDraft.note,
    })
    setIsManualSaving(false)
    setMessageType(result.ok ? 'success' : 'error')
    setMessage(result.message)

    if (result.ok) {
      setManualDraft({ profileId: '', query: '', note: '', allowWithoutMembership: false })
      refreshCoach()
    }
  }

  if (!currentUser) {
    return (
      <ErrorState
        actionLabel="Iniciar sesión"
        error="session expired"
        onAction={() => setActivePage('login')}
        title="Inicia sesión para entrar"
      />
    )
  }

  if (!canAccess) {
    return <PermissionDeniedState onBack={() => setActivePage('profile')} />
  }

  const selectedClass = dashboard.classes.find((classItem) => classItem.id === selectedClassId) ?? dashboard.currentClass
  const reservations = selectedClass?.reservations ?? []
  const manualQuery = manualDraft.query.trim().toLowerCase()
  const manualStudents = manualOptions.profiles
    .filter((profile) => {
      const searchable = `${profile.full_name ?? ''} ${profile.email ?? ''} ${profile.phone ?? ''}`.toLowerCase()
      return !manualQuery || searchable.includes(manualQuery)
    })
    .slice(0, 40)
  const selectedManualProfile = manualOptions.profiles.find((profile) => profile.id === manualDraft.profileId)
  const selectedManualMembership = manualOptions.memberships.find((membership) => membership.profile_id === manualDraft.profileId && membership.status === 'active')
  const selectedManualTokens = selectedManualMembership ? getMembershipTokens(selectedManualMembership) : null

  return (
    <div className="space-y-6">
      <section className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">Modo Coach</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Clase, cupos y asistencia.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">Vista rápida para operar el día sin entrar al panel completo.</p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <button type="button" className="k-button w-full" onClick={() => setActivePage('wod')}>
            Ver WOD del día
          </button>
          <button type="button" className="k-button-secondary w-full" onClick={refreshCoach} disabled={isLoading}>
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </section>

      {message && messageType === 'success' ? <SuccessState title="Acción realizada" description={message} /> : null}
      {message && messageType !== 'success' ? <ErrorState title="No fue posible completar la acción" description={message} onAction={refreshCoach} /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <ClassSummary title="Clase actual" classItem={dashboard.currentClass} />
        <ClassSummary title="Próxima clase" classItem={dashboard.nextClass} />
      </div>

      <section>
        <SectionTitle eyebrow="Asistencia" title="Alumnos reservados" />
        <div className="mb-4 flex gap-2 overflow-x-auto k-scroll-x pb-1">
          {dashboard.classes.map((classItem) => (
            <button
              key={classItem.id}
              type="button"
              className={`min-w-max rounded-lg px-4 py-3 text-sm font-black uppercase transition ${
                selectedClass?.id === classItem.id ? 'bg-kupan-ember text-white shadow-glow' : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
              }`}
              onClick={() => setSelectedClassId(classItem.id)}
            >
              {classItem.time} · {classItem.className}
            </button>
          ))}
        </div>

        {selectedClass ? (
          <MotionCard className="k-card mb-4 p-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="k-stat"><p className="text-2xl font-black text-white">{reservations.length}</p><p className="text-[0.65rem] font-black uppercase text-white/60">Reservados</p></div>
              <div className="k-stat"><p className="text-2xl font-black text-white">{selectedClass.usedSpots}</p><p className="text-[0.65rem] font-black uppercase text-white/60">Usados</p></div>
              <div className="k-stat"><p className="text-2xl font-black text-kupan-flame">{selectedClass.availableSpots}</p><p className="text-[0.65rem] font-black uppercase text-white/60">Disponibles</p></div>
            </div>
            <button type="button" className="k-button mt-4 w-full" onClick={() => setIsManualOpen((current) => !current)}>
              {isManualOpen ? 'Cerrar agregar alumno' : 'Agregar alumno'}
            </button>
          </MotionCard>
        ) : null}

        {isManualOpen ? (
          <MotionCard className="k-panel mb-4 p-4">
            <form className="space-y-3" onSubmit={handleManualReservation}>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">Agregar alumno</p>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  {selectedClass ? `${selectedClass.className} · ${selectedClass.time} · ${dashboard.today}` : 'Selecciona una clase para continuar.'}
                </p>
              </div>
              <label className="block">
                <span className="text-xs font-black uppercase text-white/60">Buscar alumno</span>
                <input
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
                  value={manualDraft.query}
                  onChange={(event) => setManualDraft((current) => ({ ...current, query: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-white/60">Alumno</span>
                <select
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
                  value={manualDraft.profileId}
                  onChange={(event) => setManualDraft((current) => ({ ...current, profileId: event.target.value }))}
                >
                  <option className="bg-kupan-black" value="">Seleccionar alumno</option>
                  {manualStudents.map((profile) => (
                    <option key={profile.id} className="bg-kupan-black" value={profile.id}>{profile.full_name} · {profile.email}</option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm font-bold leading-6 text-white/65">
                {selectedManualProfile ? (
                  <span>
                    {selectedManualProfile.full_name} · {selectedManualMembership ? `plan ${selectedManualMembership.plan?.name ?? 'activo'} · tokens ${selectedManualTokens?.used}/${selectedManualTokens?.total} · disponibles ${selectedManualTokens?.remaining}` : 'sin plan activo'}
                  </span>
                ) : 'Selecciona un alumno para revisar plan y tokens.'}
              </div>
              <label className="block">
                <span className="text-xs font-black uppercase text-white/60">Nota opcional</span>
                <textarea
                  className="mt-2 min-h-20 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold leading-6 text-white outline-none transition focus:border-kupan-ember"
                  value={manualDraft.note}
                  onChange={(event) => setManualDraft((current) => ({ ...current, note: event.target.value }))}
                />
              </label>
              {currentUser?.role === 'admin' ? (
                <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2">
                  <span className="text-xs font-black uppercase text-white/60">Permitir sin plan activo</span>
                  <input
                    className="h-5 w-5 accent-kupan-ember"
                    type="checkbox"
                    checked={manualDraft.allowWithoutMembership}
                    onChange={(event) => setManualDraft((current) => ({ ...current, allowWithoutMembership: event.target.checked }))}
                  />
                </label>
              ) : null}
              <button type="submit" className="k-button w-full" disabled={isManualSaving}>
                {isManualSaving ? 'Agregando...' : 'Confirmar alumno'}
              </button>
            </form>
          </MotionCard>
        ) : null}

        <div className="space-y-3">
          {reservations.length > 0 ? reservations.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              busyId={busyId}
              onMark={handleMark}
              onCancel={handleCancel}
            />
          )) : (
            <MotionCard className="k-panel p-4">
              <p className="font-black uppercase text-white">No hay alumnos reservados en esta clase.</p>
              <p className="mt-1 text-sm text-white/60">Cuando tomen cupo, aparecerán acá para marcar asistencia.</p>
            </MotionCard>
          )}
        </div>
      </section>
    </div>
  )
}
