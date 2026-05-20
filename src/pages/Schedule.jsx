import { useMemo, useState } from 'react'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { weeklySchedule as defaultWeeklySchedule } from '../data/mockData.js'
import { withReservationState } from '../utils/reservations.js'

function ScheduleClassCard({ item, onReserve }) {
  const isFull = item.isFull
  const isReserved = item.isReserved
  const maxSpots = item.maxSpots ?? 12
  const isDisabled = isFull || isReserved

  return (
    <article className="k-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-3xl font-black leading-none text-white">{item.time}</p>
          <h3 className="mt-2 text-base font-black uppercase text-white">{item.name}</h3>
          <p className="mt-1 text-sm font-semibold text-white/60">Coach {item.coach}</p>
          <p className="mt-1 text-xs font-black uppercase text-white/60">Máximo {maxSpots} alumnos</p>
        </div>
        <span className={`k-pill shrink-0 ${isFull ? 'text-white/60' : 'text-kupan-flame'}`}>
          {isFull ? 'Clase completa' : `${item.spots} cupos`}
        </span>
      </div>
      <button
        type="button"
        className={`mt-4 w-full ${isDisabled ? 'k-button-secondary opacity-60' : 'k-button'}`}
        disabled={isDisabled}
        onClick={() => onReserve(item)}
      >
        {isFull ? 'Clase completa' : isReserved ? 'Ya reservada' : 'Reservar clase'}
      </button>
    </article>
  )
}

function ScheduleBlock({ title, subtitle, block, classes, selectedDay, onReserve }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">{subtitle}</p>
          <h3 className="text-2xl font-black uppercase text-white">{title}</h3>
        </div>
        <span className="k-pill">{classes.length > 0 ? `${classes.length} clases` : 'AM por definir'}</span>
      </div>
      {classes.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {classes.map((item) => (
            <ScheduleClassCard
              key={`${item.time}-${item.name}`}
              item={{ ...item, block, dayId: selectedDay.id, day: selectedDay.label }}
              onReserve={onReserve}
            />
          ))}
        </div>
      ) : (
        <div className="k-panel p-4">
          <p className="font-black uppercase text-white">AM por definir</p>
          <p className="mt-1 text-sm leading-6 text-white/60">Estamos armando este bloque para que entrenes fuerte desde temprano.</p>
        </div>
      )}
    </section>
  )
}

export function Schedule({ onStartReservation, userReservations, appContent, currentUser }) {
  const weeklySchedule = Array.isArray(appContent?.weeklySchedule) && appContent.weeklySchedule.length > 0
    ? appContent.weeklySchedule
    : defaultWeeklySchedule
  const [selectedDayId, setSelectedDayId] = useState(weeklySchedule[0].id)
  const selectedDay = useMemo(
    () => weeklySchedule.find((day) => day.id === selectedDayId) ?? weeklySchedule[0],
    [selectedDayId, weeklySchedule],
  )
  const classesByBlock = useMemo(
    () => ({
      AM: selectedDay.blocks.AM.map((item) => withReservationState({ ...item, block: 'AM', dayId: selectedDay.id, day: selectedDay.label }, userReservations, currentUser?.id)),
      PM: selectedDay.blocks.PM.map((item) => withReservationState({ ...item, block: 'PM', dayId: selectedDay.id, day: selectedDay.label }, userReservations, currentUser?.id)),
    }),
    [currentUser?.id, selectedDay, userReservations],
  )
  const selectedClasses = [...classesByBlock.AM, ...classesByBlock.PM]
  const totalSpots = selectedClasses.reduce((sum, item) => sum + item.spots, 0)
  const totalMaxSpots = selectedClasses.reduce((sum, item) => sum + (item.maxSpots ?? 12), 0)

  return (
    <div className="space-y-6">
      <section className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">Lunes a sábado</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Reserva tu clase y ven a darlo todo.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Elige día, revisa cupos y llega listo para entrenar fuerte con la comunidad.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto p-3">
          {weeklySchedule.map((day) => {
            const isActive = selectedDay.id === day.id

            return (
              <button
                key={day.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedDayId(day.id)}
                className={`min-w-16 rounded-lg px-4 py-3 text-sm font-black uppercase transition ${
                  isActive ? 'bg-kupan-ember text-white shadow-glow' : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
                }`}
              >
                {day.short}
              </button>
            )
          })}
        </div>
      </section>

      <section className="k-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">{selectedDay.label}</p>
            <h2 className="mt-2 text-3xl font-black uppercase text-white">{selectedDay.note}</h2>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-right">
            <p className="text-2xl font-black text-white">{totalSpots}</p>
            <p className="text-[0.65rem] font-black uppercase text-white/60">de {totalMaxSpots} cupos</p>
          </div>
        </div>
      </section>

      <SectionTitle eyebrow="Horarios KUPAN" title="Elige tu bloque" />

      <ScheduleBlock
        title="Bloque AM"
        subtitle="Mañana"
        block="AM"
        classes={classesByBlock.AM}
        selectedDay={selectedDay}
        onReserve={onStartReservation}
      />

      <ScheduleBlock
        title="Bloque PM"
        subtitle="Tarde"
        block="PM"
        classes={classesByBlock.PM}
        selectedDay={selectedDay}
        onReserve={onStartReservation}
      />
    </div>
  )
}
