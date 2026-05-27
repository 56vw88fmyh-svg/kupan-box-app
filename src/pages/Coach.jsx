import { useEffect, useState } from 'react'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import {
  cancelCoachReservation,
  loadCoachDashboard,
  markCoachReservation,
} from '../utils/coachData.js'

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

  if (!currentUser) {
    return (
      <section className="k-card p-5">
        <p className="k-pill inline-flex text-kupan-flame">Modo Coach</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Inicia sesión para entrar.</h2>
        <button type="button" className="k-button mt-5 w-full" onClick={() => setActivePage('login')}>
          Iniciar sesión
        </button>
      </section>
    )
  }

  if (!canAccess) {
    return (
      <section className="k-card p-5">
        <p className="k-pill inline-flex text-kupan-flame">Acceso denegado</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Solo admin o coach KUPAN.</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">Tu perfil no tiene permiso para marcar asistencia.</p>
        <button type="button" className="k-button-secondary mt-5 w-full" onClick={() => setActivePage('profile')}>
          Volver a perfil
        </button>
      </section>
    )
  }

  const selectedClass = dashboard.classes.find((classItem) => classItem.id === selectedClassId) ?? dashboard.currentClass
  const reservations = selectedClass?.reservations ?? []

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

      {message ? (
        <p className={`rounded-lg border p-3 text-sm font-bold text-white ${
          messageType === 'success' ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-kupan-flame/30 bg-kupan-flame/10'
        }`}
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <ClassSummary title="Clase actual" classItem={dashboard.currentClass} />
        <ClassSummary title="Próxima clase" classItem={dashboard.nextClass} />
      </div>

      <section>
        <SectionTitle eyebrow="Asistencia" title="Alumnos reservados" />
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
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
