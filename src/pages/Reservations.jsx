import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { createWhatsAppUrl, whatsappMessages } from '../utils/whatsapp.js'
import {
  cancelSupabaseReservation,
  createSupabaseReservation,
  formatReservationDate,
  loadReservationData,
} from '../utils/supabaseReservations.js'

const dayNames = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']

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
      } ${isDisabled ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">
            {item.day} · {formatReservationDate(item.reservationDate)} · {item.block}
          </p>
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
      }`}
      >
        {item.isFull ? 'Clase completa' : item.isReserved ? 'Ya reservada' : isSelected ? 'Lista para confirmar' : 'Reservar clase'}
      </div>
    </Motion.button>
  )
}

function BookingSummary({ selectedClass, onConfirm, currentUser, onGoLogin, hasActiveMembership, membership }) {
  const canConfirm = selectedClass && !selectedClass.isFull && !selectedClass.isReserved && hasActiveMembership

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
          {selectedClass.day} · {formatReservationDate(selectedClass.reservationDate)} · {selectedClass.time} · Coach {selectedClass.coach}
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
            {selectedClass.isFull ? 'Completa' : selectedClass.isReserved ? 'Ya reservada' : 'Disponible'}
          </p>
        </div>
      </div>
      <div className="p-5">
        <p className="mb-4 text-sm leading-6 text-white/70">
          {currentUser
            ? hasActiveMembership
              ? 'Confirma tu cupo y queda listo para entrenar fuerte con la comunidad.'
              : `Para reservar necesitas membresía activa. Estado actual: ${membership?.status ?? 'sin plan activo'}.`
            : 'Inicia sesión para tomar este cupo y mantener tu reserva guardada.'}
        </p>
        {currentUser ? (
          <button type="button" className={`w-full ${canConfirm ? 'k-button' : 'k-button-secondary opacity-60'}`} disabled={!canConfirm} onClick={() => onConfirm(selectedClass)}>
            {!hasActiveMembership ? 'Membresía requerida' : selectedClass.isFull ? 'Clase completa' : selectedClass.isReserved ? 'Ya tienes esta reserva' : 'Confirmar reserva'}
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
        Tu cupo quedó tomado para {reservation.name}, {reservation.day} {formatReservationDate(reservation.reservationDate)} a las {reservation.time}.
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
              <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">
                {item.day} · {formatReservationDate(item.reservationDate)} · {item.block}
              </p>
              <p className="font-black uppercase text-white">{item.name}</p>
              <p className="text-sm text-white/60">{item.time} · Coach {item.coach}</p>
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

export function Reservations({ pendingReservation, currentUser, onClearPendingReservation, setActivePage, appContent }) {
  const text = appContent.appText
  const [availableClasses, setAvailableClasses] = useState([])
  const [userActiveReservations, setUserActiveReservations] = useState([])
  const [membership, setMembership] = useState(null)
  const [hasActiveMembership, setHasActiveMembership] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reservationMessage, setReservationMessage] = useState('')
  const [selectedDayId, setSelectedDayId] = useState('all')
  const [selectedClass, setSelectedClass] = useState(null)
  const [successReservation, setSuccessReservation] = useState(null)
  const selectedClassKey = selectedClass ? `${selectedClass.classScheduleId}-${selectedClass.reservationDate}` : null
  const filteredClasses = selectedDayId === 'all'
    ? availableClasses
    : availableClasses.filter((classItem) => classItem.dayId === selectedDayId)
  const totalClasses = availableClasses.length
  const totalSpots = availableClasses.reduce((sum, item) => sum + item.spots, 0)
  const reservedCount = userActiveReservations.length

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
    })))
    setMembership(result.membership)
    setHasActiveMembership(result.hasActiveMembership)
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
    setSelectedClass(matchedClass ?? null)
  }, [availableClasses, pendingReservation])

  function handleSelect(classItem) {
    if (classItem.isFull || classItem.isReserved) return
    setSelectedClass(classItem)
    setSuccessReservation(null)
    setReservationMessage('')
  }

  async function handleConfirm(classItem) {
    const result = await createSupabaseReservation(currentUser?.id, classItem, hasActiveMembership)
    if (!result.ok) {
      setReservationMessage(result.message)
      return
    }
    setSuccessReservation(result.reservation)
    setSelectedClass(null)
    refreshReservations()
  }

  async function handleCancelReservation(reservationId) {
    const result = await cancelSupabaseReservation(reservationId)
    if (!result.ok) {
      setReservationMessage(result.message)
      return
    }
    setReservationMessage(result.message)
    refreshReservations()
  }

  function handleNewReservation() {
    onClearPendingReservation()
    setSelectedClass(null)
    setSuccessReservation(null)
  }

  const dayFilters = useMemo(() => [...new Map(availableClasses.map((classItem) => [classItem.dayId, classItem])).values()], [availableClasses])

  return (
    <div className="space-y-6">
      <MotionCard as="section" className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">Reserva KUPAN</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">{text.reservationsTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">{text.reservationsBody}</p>
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

      <SuccessMessage reservation={successReservation} onGoProfile={() => setActivePage('profile')} onNewReservation={handleNewReservation} />

      <BookingSummary
        selectedClass={selectedClass}
        currentUser={currentUser}
        onConfirm={handleConfirm}
        onGoLogin={() => setActivePage('login')}
        hasActiveMembership={hasActiveMembership}
        membership={membership}
      />

      <section>
        <SectionTitle eyebrow="Disponibles" title="Clases para entrar al WOD" />
        {isLoading ? <p className="k-panel mb-4 p-4 text-sm font-bold text-white/60">Cargando cupos reales desde Supabase...</p> : null}
        {reservationMessage ? <p className="mb-4 rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-sm font-bold text-white">{reservationMessage}</p> : null}
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
          {dayFilters.map((day) => (
            <button
              key={day.dayId}
              type="button"
              aria-pressed={selectedDayId === day.dayId}
              className={`min-w-16 rounded-lg px-4 py-3 text-sm font-black uppercase transition ${
                selectedDayId === day.dayId ? 'bg-kupan-ember text-white shadow-glow' : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
              }`}
              onClick={() => setSelectedDayId(day.dayId)}
            >
              {day.short}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {filteredClasses.map((item, index) => (
            <Motion.div
              key={`${item.classScheduleId}-${item.reservationDate}`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.16) }}
            >
              <ReservationCard
                item={item}
                isSelected={selectedClassKey === `${item.classScheduleId}-${item.reservationDate}`}
                onSelect={handleSelect}
              />
            </Motion.div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Mis cupos" title="Tu agenda KUPAN" />
        <ReservationList reservations={userActiveReservations} onCancelReservation={handleCancelReservation} />
      </section>
    </div>
  )
}
