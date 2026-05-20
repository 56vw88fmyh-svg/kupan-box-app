export function ClassCard({ item, onReserve }) {
  const isFull = item.spots === 0
  const maxSpots = item.maxSpots ?? 12

  return (
    <article className="k-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-black text-white">{item.time}</p>
          <h3 className="mt-1 text-lg font-black uppercase">{item.name}</h3>
          <p className="text-sm text-white/60">Coach {item.coach} · {item.level}</p>
          <p className="mt-1 text-xs font-black uppercase text-white/60">Máximo {maxSpots} alumnos</p>
        </div>
        <span className={`k-pill ${isFull ? 'text-white/60' : 'text-kupan-flame'}`}>{isFull ? 'Clase completa' : `${item.spots} cupos`}</span>
      </div>
      <button type="button" className={`mt-4 w-full ${isFull ? 'k-button-secondary opacity-60' : 'k-button'}`} disabled={isFull} onClick={onReserve}>
        {isFull ? 'Clase completa' : 'Reservar clase'}
      </button>
    </article>
  )
}
