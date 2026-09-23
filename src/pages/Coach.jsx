import { useEffect, useRef, useState } from 'react'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { Button, Dialog, ErrorState, PermissionDeniedState, SuccessState } from '../components/ui/index.js'
import {
  cancelCoachReservation,
  createCoachPrivateNote,
  loadCoachDashboard,
  loadCoachManualReservationOptions,
  loadCoachPrivateNotes,
  markCoachLateArrival,
  markCoachReservation,
} from '../utils/coachData.js'
import { adminReserveForStudent } from '../utils/supabaseReservations.js'
import { formatCoachName } from '../utils/coachName.js'

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
          <h3 className="mt-2 text-3xl font-black uppercase leading-none text-white">{classItem.timeLabel || classItem.time}</h3>
          <p className="mt-2 font-black uppercase text-white">{classItem.className}</p>
          <p className="mt-1 text-sm text-white/60">Coach {formatCoachName(classItem.coach)}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="text-[0.65rem] font-black uppercase text-white/50">Cupos ocupados</p>
              <p className="mt-1 text-2xl font-black text-white">{classItem.usedSpots}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="text-[0.65rem] font-black uppercase text-white/50">Disponibles</p>
              <p className="mt-1 text-2xl font-black text-kupan-flame">{classItem.unlimitedCapacity ? 'Sin límite' : classItem.availableSpots}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-white/60">No hay otra clase programada para hoy.</p>
      )}
    </MotionCard>
  )
}

function ReservationRow({ reservation, onMark, onLate, onCancel, onNote, busyId }) {
  const isBusy = busyId === reservation.id
  const student = reservation.profile?.full_name ?? 'Alumno KUPAN'
  const email = reservation.profile?.email
  const statusLabel = {
    reserved: 'Pendiente',
    attended: 'Presente',
    no_show: 'Ausente',
    cancelled: 'Cancelada',
  }[reservation.status] ?? reservation.status

  return (
    <MotionCard as="article" className="k-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">{statusLabel}</p>
          <h3 className="mt-2 break-words font-black uppercase text-white">{student}</h3>
          {email ? <p className="mt-1 break-words text-sm text-white/55">{email}</p> : null}
          <p className="mt-2 text-xs font-black uppercase text-white/45">
            Token {reservation.token_charged ? 'cobrado' : 'no descuenta'}
          </p>
          {reservation.notes ? <p className="mt-2 text-sm leading-6 text-white/55">{reservation.notes}</p> : null}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" aria-label={`Marcar presente a ${student}`} disabled={isBusy || reservation.status === 'attended' || reservation.status === 'cancelled'} onClick={() => onMark(reservation.id, 'attended')}>
          {isBusy ? 'Guardando...' : 'Presente'}
        </button>
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" aria-label={`Marcar llegada tarde de ${student}`} disabled={isBusy || reservation.status === 'cancelled'} onClick={() => onLate(reservation.id)}>
          Llegó tarde
        </button>
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" aria-label={`Marcar ausente a ${student}`} disabled={isBusy || reservation.status === 'no_show' || reservation.status === 'cancelled'} onClick={() => onMark(reservation.id, 'no_show')}>
          Ausente
        </button>
        {['attended', 'no_show'].includes(reservation.status) ? (
          <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" aria-label={`Corregir asistencia de ${student}`} disabled={isBusy} onClick={() => onMark(reservation.id, 'reserved')}>
            Corregir
          </button>
        ) : null}
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" aria-label={`Agregar nota privada para ${student}`} disabled={isBusy} onClick={() => onNote(reservation)}>
          Nota privada
        </button>
        <button type="button" className="rounded-lg border border-kupan-red/40 bg-kupan-red/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50" aria-label={`Cancelar reserva de ${student}`} disabled={isBusy || reservation.status === 'attended' || reservation.status === 'no_show' || reservation.status === 'cancelled'} onClick={() => onCancel(reservation)}>
          Cancelar
        </button>
      </div>
    </MotionCard>
  )
}

function focusCoachSection(ref) {
  window.setTimeout(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ref.current?.focus?.({ preventScroll: true })
  }, 80)
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
  const [noteTarget, setNoteTarget] = useState(null)
  const [noteDraft, setNoteDraft] = useState({ noteType: 'scaling', content: '' })
  const [privateNotes, setPrivateNotes] = useState([])
  const [isNoteSaving, setIsNoteSaving] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const feedbackRef = useRef(null)
  const attendanceRef = useRef(null)
  const manualFormRef = useRef(null)

  async function refreshCoach({ preserveMessage = false } = {}) {
    if (!canAccess) return

    setIsLoading(true)
    const result = await loadCoachDashboard()
    setIsLoading(false)

    if (!result.ok) {
      setMessageType('error')
      setMessage(result.message)
      return result
    }

    setDashboard(result)
    setSelectedClassId((current) => current || result.currentClass?.id || result.classes[0]?.id || '')
    if (!preserveMessage) setMessage('')
    return result
  }

  useEffect(() => {
    refreshCoach()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess])

  useEffect(() => {
    if (isManualOpen) focusCoachSection(manualFormRef)
  }, [isManualOpen])

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
    if (status === 'reserved' && !window.confirm('¿Corregir esta asistencia? El cambio quedará en el historial.')) return
    setBusyId(reservationId)
    const result = await markCoachReservation(reservationId, status)
    setBusyId('')
    setMessageType(result.ok ? 'success' : 'error')
    setMessage(result.message)
    if (result.ok) await refreshCoach({ preserveMessage: true })
    focusCoachSection(feedbackRef)
  }

  async function handleLate(reservationId) {
    setBusyId(reservationId)
    const result = await markCoachLateArrival(reservationId)
    setBusyId('')
    setMessageType(result.ok ? 'success' : 'error')
    setMessage(result.message)
    if (result.ok) await refreshCoach({ preserveMessage: true })
    focusCoachSection(feedbackRef)
  }

  async function openPrivateNotes(reservation) {
    setNoteTarget(reservation)
    setPrivateNotes([])
    const result = await loadCoachPrivateNotes(reservation.profile_id)
    if (result.ok) setPrivateNotes(result.notes)
    else {
      setMessageType('error')
      setMessage(result.message)
      focusCoachSection(feedbackRef)
    }
  }

  async function savePrivateNote(event) {
    event.preventDefault()
    if (!noteDraft.content.trim() || !noteTarget) return
    setIsNoteSaving(true)
    const result = await createCoachPrivateNote({
      profileId: noteTarget.profile_id,
      reservationId: noteTarget.id,
      ...noteDraft,
    })
    setIsNoteSaving(false)
    setMessageType(result.ok ? 'success' : 'error')
    setMessage(result.message)
    if (result.ok) {
      setNoteTarget(null)
      setNoteDraft({ noteType: 'scaling', content: '' })
    }
    focusCoachSection(feedbackRef)
  }

  async function markPendingPresent() {
    const pending = reservations.filter((reservation) => reservation.status === 'reserved')
    if (!pending.length || !window.confirm(`¿Marcar presentes a ${pending.length} alumnos pendientes?`)) return
    setBusyId('batch')
    const results = await Promise.all(pending.map((reservation) => markCoachReservation(reservation.id, 'attended')))
    setBusyId('')
    const failed = results.filter((result) => !result.ok)
    setMessageType(failed.length ? 'error' : 'success')
    setMessage(failed.length ? `${failed.length} asistencias no pudieron actualizarse.` : 'Asistencias pendientes marcadas correctamente.')
    await refreshCoach({ preserveMessage: true })
    focusCoachSection(feedbackRef)
  }

  function handleCancel(reservation) {
    setCancelTarget(reservation)
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    setBusyId(cancelTarget.id)
    const result = await cancelCoachReservation(cancelTarget.id)
    setBusyId('')
    setMessageType(result.ok ? 'success' : 'error')
    setMessage(result.message)
    setCancelTarget(null)
    if (result.ok) await refreshCoach({ preserveMessage: true })
    focusCoachSection(feedbackRef)
  }

  async function handleManualReservation(event) {
    event.preventDefault()
    if (!selectedClass) {
      setMessageType('error')
      setMessage('Selecciona una clase antes de agregar alumno.')
      focusCoachSection(feedbackRef)
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
      setIsManualOpen(false)
      await refreshCoach({ preserveMessage: true })
    }
    focusCoachSection(feedbackRef)
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
          <button type="button" className="k-button-secondary w-full" onClick={() => refreshCoach()} disabled={isLoading}>
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </section>

      {message ? (
        <div ref={feedbackRef} className="scroll-mt-28 outline-none" tabIndex={-1}>
          {messageType === 'success' ? <SuccessState title="Acción realizada" description={message} /> : null}
          {messageType !== 'success' ? <ErrorState title="No fue posible completar la acción" description={message} onAction={() => refreshCoach()} /> : null}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <ClassSummary title={dashboard.currentClass?.isCurrent ? 'Clase actual' : 'Siguiente clase'} classItem={dashboard.currentClass} />
        <ClassSummary title={dashboard.currentClass?.isCurrent ? 'Próxima clase' : 'Clase posterior'} classItem={dashboard.nextClass} />
      </div>

      <section ref={attendanceRef} className="scroll-mt-28 outline-none" tabIndex={-1}>
        <SectionTitle eyebrow="Asistencia" title="Alumnos reservados" />
        <label className="mb-4 block rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Clase del día</span>
          <select
            className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-kupan-black px-3 text-base font-black text-white outline-none focus:border-kupan-ember"
            value={selectedClass?.id ?? ''}
            onChange={(event) => {
              setSelectedClassId(event.target.value)
              focusCoachSection(attendanceRef)
            }}
          >
            {dashboard.classes.length === 0 ? <option value="">No hay clases disponibles</option> : null}
            {dashboard.classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.timeLabel || classItem.time} · {classItem.className} · Coach {formatCoachName(classItem.coach)}
              </option>
            ))}
          </select>
        </label>

        {selectedClass ? (
          <MotionCard className="k-card mb-4 p-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="k-stat"><p className="text-2xl font-black text-white">{reservations.length}</p><p className="text-[0.65rem] font-black uppercase text-white/60">Reservados</p></div>
              <div className="k-stat"><p className="text-2xl font-black text-white">{selectedClass.usedSpots}</p><p className="text-[0.65rem] font-black uppercase text-white/60">Cupos ocupados</p></div>
              <div className="k-stat"><p className="text-2xl font-black text-kupan-flame">{selectedClass.unlimitedCapacity ? 'Sin límite' : selectedClass.availableSpots}</p><p className="text-[0.65rem] font-black uppercase text-white/60">Disponibles</p></div>
            </div>
            <button type="button" className="k-button mt-4 w-full" onClick={() => setIsManualOpen((current) => !current)}>
              {isManualOpen ? 'Cerrar agregar alumno' : 'Agregar alumno'}
            </button>
            <button type="button" className="k-button-secondary mt-2 w-full" disabled={busyId === 'batch' || !reservations.some((reservation) => reservation.status === 'reserved')} onClick={markPendingPresent}>
              {busyId === 'batch' ? 'Guardando asistencias...' : 'Marcar pendientes presentes'}
            </button>
          </MotionCard>
        ) : null}

        {isManualOpen ? (
          <MotionCard ref={manualFormRef} className="k-panel mb-4 scroll-mt-28 p-4 outline-none" tabIndex={-1}>
            <form className="space-y-3" onSubmit={handleManualReservation}>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">Agregar alumno</p>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  {selectedClass ? `${selectedClass.className} · ${selectedClass.timeLabel || selectedClass.time} · ${dashboard.today}` : 'Selecciona una clase para continuar.'}
                </p>
              </div>
              <label className="block">
                <span className="text-xs font-black uppercase text-white/60">Buscar alumno</span>
                <input
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
                  value={manualDraft.query}
                  placeholder="Nombre, correo o teléfono"
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
              onLate={handleLate}
              onCancel={handleCancel}
              onNote={openPrivateNotes}
            />
          )) : (
            <MotionCard className="k-panel p-4">
              <p className="font-black uppercase text-white">No hay alumnos reservados en esta clase.</p>
              <p className="mt-1 text-sm text-white/60">Cuando tomen cupo, aparecerán acá para marcar asistencia.</p>
            </MotionCard>
          )}
        </div>
      </section>

      <Dialog
        isDestructive
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Confirmar cancelación"
        description="La reserva se cancelará y el token se devolverá cuando corresponda."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-kupan-flame">Alumno</p>
            <p className="mt-2 font-black uppercase text-white">{cancelTarget?.profile?.full_name ?? 'Alumno KUPAN'}</p>
            <p className="mt-1 text-sm font-bold text-white/60">{selectedClass ? `${selectedClass.className} · ${selectedClass.timeLabel || selectedClass.time}` : 'Clase del día'}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button fullWidth disabled={Boolean(busyId)} variant="secondary" onClick={() => setCancelTarget(null)}>Volver</Button>
            <Button fullWidth isLoading={Boolean(busyId)} loadingLabel="Cancelando" variant="destructive" onClick={confirmCancel}>Cancelar reserva</Button>
          </div>
        </div>
      </Dialog>

      <Dialog isOpen={Boolean(noteTarget)} onClose={() => setNoteTarget(null)} title="Observación privada" description="Solo coach y administración pueden ver esta información.">
        <form className="space-y-4" onSubmit={savePrivateNote}>
          {privateNotes.length ? (
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-kupan-border bg-black/25 p-3">
              {privateNotes.map((note) => <p key={note.id} className="text-sm leading-6 text-text-secondary"><strong className="text-kupan-sand">{note.note_type}:</strong> {note.content}</p>)}
            </div>
          ) : null}
          <label className="block">
            <span className="text-xs font-black uppercase text-text-muted">Tipo</span>
            <select className="mt-2 min-h-12 w-full rounded-lg border border-kupan-border bg-kupan-black px-3 text-white" value={noteDraft.noteType} onChange={(event) => setNoteDraft((current) => ({ ...current, noteType: event.target.value }))}>
              <option value="scaling">Escalado utilizado</option>
              <option value="technical">Observación técnica</option>
              <option value="limitation">Limitación informada</option>
              <option value="follow_up">Seguimiento sugerido</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-text-muted">Observación</span>
            <textarea className="mt-2 min-h-28 w-full rounded-lg border border-kupan-border bg-kupan-black p-3 text-base text-white" required value={noteDraft.content} onChange={(event) => setNoteDraft((current) => ({ ...current, content: event.target.value }))} />
          </label>
          <Button type="submit" fullWidth isLoading={isNoteSaving}>Guardar observación</Button>
        </form>
      </Dialog>
    </div>
  )
}
