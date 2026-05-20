import { useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { weeklySchedule as defaultWeeklySchedule } from '../data/mockData.js'
import { createWhatsAppUrl, whatsappMessages } from '../utils/whatsapp.js'
import { getClassKey, withReservationState } from '../utils/reservations.js'

function getClassesWithReservationState(userReservations, weeklySchedule, currentUser) {
  return weeklySchedule.flatMap((day) =>
    ['AM', 'PM'].flatMap((block) =>
      day.blocks[block]
        .map((item) => ({
          ...item,
          block,
          day: day.label,
          dayId: day.id,
        }))
        .map((item) => withReservationState(item, userReservations, currentUser?.id)),
    ),
  )
}

function ReservationCard({ item, isSelected, onSelect }) {
  const maxSpots = item.maxSpots ?? 12
  const isDisabled = item.isFull || item.isReserved
  const reservedSpots = maxSpots - item.spots
  const progress = Math.min(Math.max((reservedSpots / maxSpots) * 100, 0), 100)

  return (
    <Motion.button
      type="button"
      onClick={() => onSelect(item)}
      disabled={isDisabled}
      whileHover={!isDisabled ? { y: -3, scale: 1.005 } : undefined}
      whileTap={!isDisabled ? { scale: 0.985 } : undefined}
      transition={{ duration: 0.16 }}
      className={`k-panel w-full overflow-hidden p-4 text-left transition ${
        isSelected ? 'border-kupan-ember bg-kupan-ember/15 shadow-glow' : 'hover:border-kupan-flame/60'
      } ${isDisabled ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">{item.day} · {item.block}</p>
          <p className="mt-2 text-3xl font-black leading-none text-white">{item.time}</p>
          <h3 className="mt-2 text-base font-black uppercase text-white">{item.name}</h3>
          <p className="mt-1 text-sm font-semibold text-white/60">Coach {item.coach}</p>
          <p className="mt-1 text-xs font-black uppercase text-white/60">Máximo {maxSpots} alumnos</p>
        </div>
        <span className={`k-pill ${item.isFull ? 'text-white/60' : 'text-kupan-flame'}`}>
          {item.isFull ? 'Clase completa' : `${item.spots} cupos`}
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${item.isFull ? 'bg-kupan-flame' : 'bg-kupan-ember'}`} style={{ width: `${progress}%` }} />
      </div>
      <div className={`mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-black uppercase ${
        isSelected ? 'bg-kupan-ember text-white' : 'border border-white/15 bg-white/10 text-white'
      }`}>
        {item.isFull ? 'Clase completa' : item.isReserved ? 'Ya reservada' : isSelected ? 'Lista para confirmar' : 'Reservar clase'}
      </div>
    </Motion.button>
  )
}

function BookingSummary({ selectedClass, onConfirm, currentUser, onGoLogin }) {
  const canConfirm = selectedClass && !selectedClass.isFull && !selectedClass.isReserved

  if (!selectedClass) {
    return (
      <MotionCard as="section" className="k-card p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Primer paso</p>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">Elige tu clase y ven a darlo todo</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Toca una clase disponible y te mostramos el resumen antes de confirmar tu cupo.
        </p>
      </MotionCard>
    )
  }

  return (
    <MotionCard as="section" className="k-card overflow-hidden p-0">
      <div className="border-b border-white/10 bg-black/25 p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Reserva tu cupo</p>
        <h2 className="mt-2 text-3xl font-black uppercase text-white">{selectedClass.name}</h2>
        <p className="mt-2 text-sm text-white/60">
          {selectedClass.day} · {selectedClass.time} · Coach {selectedClass.coach}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-0 border-b border-white/10">
        <div className="p-4">
          <p className="text-xs font-black uppercase text-white/60">Bloque</p>
          <p className="mt-1 text-lg font-black text-white">{selectedClass.block}</p>
        </div>
        <div className="border-l border-white/10 p-4">
          <p className="text-xs font-black uppercase text-white/60">Cupos</p>
          <p className="mt-1 text-lg font-black text-white">{selectedClass.spots}/{selectedClass.maxSpots ?? 12}</p>
        </div>
        <div className="border-l border-white/10 p-4">
          <p className="text-xs font-black uppercase text-white/60">Estado</p>
          <p className="mt-1 text-lg font-black text-kupan-flame">
            {selectedClass.isFull ? 'Completa' : selectedClass.isReserved ? 'Ya reservada' : 'A tiempo'}
          </p>
        </div>
      </div>
      <div className="p-5">
        <p className="mb-4 text-sm leading-6 text-white/70">
          {canConfirm
            ? currentUser
              ? 'Confirma tu cupo y queda listo para entrenar fuerte con la comunidad.'
              : 'Inicia sesión para tomar este cupo y mantener tu reserva guardada.'
            : 'Esta clase no permite nuevas reservas desde la app en este momento.'}
        </p>
        {currentUser ? (
          <button type="button" className={`w-full ${canConfirm ? 'k-button' : 'k-button-secondary opacity-60'}`} disabled={!canConfirm} onClick={() => onConfirm(selectedClass)}>
            {selectedClass.isFull ? 'Clase completa' : selectedClass.isReserved ? 'Ya tienes esta reserva' : 'Confirmar reserva'}
          </button>
        ) : (
          <button type="button" className="k-button w-full" onClick={onGoLogin}>
            Iniciar sesión para reservar
          </button>
        )}
        <a className="k-button-secondary mt-3 w-full" href={createWhatsAppUrl(whatsappMessages.reservation)} target="_blank" rel="noreferrer">
          Reservar por WhatsApp
        </a>
      </div>
    </MotionCard>
  )
}

function SuccessMessage({ reservation, onGoProfile, onNewReservation }) {
  if (!reservation) return null

  return (
    <MotionCard as="section" className="rounded-lg border border-kupan-ember/50 bg-kupan-ember/15 p-5 shadow-glow">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Reserva lista</p>
      <h2 className="mt-2 text-3xl font-black uppercase text-white">Nos vemos en el box.</h2>
      <p className="mt-2 text-sm leading-6 text-white/80">
        Tu cupo quedó tomado para {reservation.name}, {reservation.day} a las {reservation.time}. Llega con ganas, acá entrenamos acompañados.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" className="k-button" onClick={onGoProfile}>
          Ver en mi perfil
        </button>
        <button type="button" className="k-button-secondary" onClick={onNewReservation}>
          Reservar otra
        </button>
      </div>
    </MotionCard>
  )
}

function ReservationList({ reservations, onCancelReservation }) {
  if (reservations.length === 0) {
    return (
      <MotionCard className="k-panel p-4">
        <p className="font-black uppercase text-white">Aún no tienes reservas.</p>
        <p className="mt-1 text-sm text-white/60">Elige una clase, reserva tu cupo y ven a darlo todo con el equipo.</p>
      </MotionCard>
    )
  }

  return (
    <div className="space-y-3">
      {reservations.map((item) => (
        <MotionCard key={item.id} as="article" className="k-panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">{item.day} · {item.block}</p>
              <p className="font-black uppercase text-white">{item.name}</p>
              <p className="text-sm text-white/60">{item.day} · {item.time} · Coach {item.coach}</p>
              <span className="k-pill mt-3 inline-flex text-kupan-flame">{item.status}</span>
            </div>
            <button type="button" className="k-button-secondary shrink-0 px-3 py-2 text-xs" onClick={() => onCancelReservation(item.id)}>
              Cancelar
            </button>
          </div>
        </MotionCard>
      ))}
    </div>
  )
}

export function Reservations({
  pendingReservation,
  currentUser,
  userReservations,
  onConfirmReservation,
  onCancelReservation,
  onClearPendingReservation,
  setActivePage,
  appContent,
}) {
  const text = appContent.appText
  const weeklySchedule = Array.isArray(appContent?.weeklySchedule) && appContent.weeklySchedule.length > 0
    ? appContent.weeklySchedule
    : defaultWeeklySchedule
  const availableClasses = useMemo(() => getClassesWithReservationState(userReservations, weeklySchedule, currentUser), [currentUser, userReservations, weeklySchedule])
  const userActiveReservations = currentUser
    ? userReservations.filter((reservation) => reservation.userId === currentUser.id)
    : []
  const [selectedDayId, setSelectedDayId] = useState('all')
  const pendingClass = useMemo(
    () => (pendingReservation ? withReservationState(pendingReservation, userReservations, currentUser?.id) : null),
    [currentUser?.id, pendingReservation, userReservations],
  )
  const [selectedClass, setSelectedClass] = useState(pendingClass)
  const [successReservation, setSuccessReservation] = useState(null)
  const selectedClassKey = selectedClass ? getClassKey(selectedClass) : null
  const filteredClasses = selectedDayId === 'all'
    ? availableClasses
    : availableClasses.filter((classItem) => classItem.dayId === selectedDayId)
  const totalClasses = availableClasses.length
  const totalSpots = availableClasses.reduce((sum, item) => sum + item.spots, 0)
  const reservedCount = userActiveReservations.length

  useEffect(() => {
    setSelectedClass(pendingClass)
  }, [pendingClass])

  useEffect(() => {
    if (!selectedClassKey) return

    const updatedClass = availableClasses.find((classItem) => getClassKey(classItem) === selectedClassKey)
    setSelectedClass(updatedClass?.isReserved || updatedClass?.isFull ? null : updatedClass ?? null)
  }, [availableClasses, selectedClassKey])

  function handleSelect(classItem) {
    if (classItem.isFull || classItem.isReserved) return
    setSelectedClass(classItem)
    setSuccessReservation(null)
  }

  function handleConfirm(classItem) {
    const confirmed = onConfirmReservation(classItem)
    if (!confirmed) return
    setSuccessReservation(confirmed)
    setSelectedClass(null)
  }

  function handleNewReservation() {
    onClearPendingReservation()
    setSelectedClass(null)
    setSuccessReservation(null)
  }

  return (
    <div className="space-y-6">
      <MotionCard as="section" className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">Reserva KUPAN</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">{text.reservationsTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            {text.reservationsBody}
          </p>
          <a className="k-button-secondary mt-5 w-full" href={createWhatsAppUrl(whatsappMessages.reservation)} target="_blank" rel="noreferrer">
            Reservar por WhatsApp
          </a>
        </div>
        <div className="grid grid-cols-3 gap-0 border-t border-white/10">
          <div className="p-4">
            <p className="text-2xl font-black text-white">{totalClasses}</p>
            <p className="text-[0.65rem] font-black uppercase text-white/60">Clases</p>
          </div>
          <div className="border-l border-white/10 p-4">
            <p className="text-2xl font-black text-white">{totalSpots}</p>
            <p className="text-[0.65rem] font-black uppercase text-white/60">Cupos vivos</p>
          </div>
          <div className="border-l border-white/10 p-4">
            <p className="text-2xl font-black text-kupan-flame">{reservedCount}</p>
            <p className="text-[0.65rem] font-black uppercase text-white/60">Reservas</p>
          </div>
        </div>
      </MotionCard>

      <SuccessMessage
        reservation={successReservation}
        onGoProfile={() => setActivePage('profile')}
        onNewReservation={handleNewReservation}
      />

      <BookingSummary selectedClass={selectedClass} currentUser={currentUser} onConfirm={handleConfirm} onGoLogin={() => setActivePage('login')} />

      <section>
        <SectionTitle eyebrow="Disponibles" title="Clases para entrar al WOD" />
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            aria-pressed={selectedDayId === 'all'}
            className={`min-w-20 rounded-lg px-4 py-3 text-sm font-black uppercase transition ${
              selectedDayId === 'all' ? 'bg-kupan-ember text-white shadow-glow' : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
            }`}
            onClick={() => setSelectedDayId('all')}
          >
            Todos
          </button>
          {weeklySchedule.map((day) => (
            <button
              key={day.id}
              type="button"
              aria-pressed={selectedDayId === day.id}
              className={`min-w-16 rounded-lg px-4 py-3 text-sm font-black uppercase transition ${
                selectedDayId === day.id ? 'bg-kupan-ember text-white shadow-glow' : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
              }`}
              onClick={() => setSelectedDayId(day.id)}
            >
              {day.short}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {filteredClasses.map((item, index) => (
            <Motion.div
              key={`${item.dayId}-${item.time}-${item.name}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.16) }}
            >
              <ReservationCard
              item={item}
              isSelected={
                selectedClassKey === getClassKey(item)
              }
              onSelect={handleSelect}
              />
            </Motion.div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Mis cupos" title="Tu agenda KUPAN" />
        <ReservationList reservations={userActiveReservations} onCancelReservation={onCancelReservation} />
      </section>
    </div>
  )
}
