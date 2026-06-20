import { useEffect, useMemo, useState } from 'react'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { EmptyState, ErrorState, LoadingState, StaleDataState } from '../components/ui/index.js'
import { prMovements } from '../data/movements.js'
import { formatRankingDate, loadPrRanking } from '../utils/ranking.js'

const levels = ['Todos', 'Iniciado', 'Rookie', 'Scaled', 'RX']

function formatValue(record) {
  return `${Number(record.value).toLocaleString('es-CL')} ${record.unit}`
}

function RankingRow({ record, index }) {
  return (
    <MotionCard as="article" className="k-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
            index === 0 ? 'bg-kupan-ember text-white shadow-glow' : 'bg-white/10 text-kupan-flame'
          }`}
          >
            #{index + 1}
          </div>
          <div className="min-w-0">
            <p className="break-words font-black uppercase text-white">{record.full_name}</p>
            <p className="mt-1 text-sm text-white/60">{record.level} · {formatRankingDate(record.record_date)}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-kupan-flame">{record.movement}</p>
          </div>
        </div>
        <div className="rounded-lg border border-kupan-ember/40 bg-kupan-ember/10 px-3 py-2 text-right">
          <p className="text-2xl font-black text-white">{formatValue(record)}</p>
          <p className="text-[0.65rem] font-black uppercase text-kupan-flame">PR</p>
        </div>
      </div>
    </MotionCard>
  )
}

export function Ranking() {
  const [movement, setMovement] = useState('Back Squat')
  const [level, setLevel] = useState('Todos')
  const [records, setRecords] = useState([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const movementOptions = useMemo(() => ['Todos', ...prMovements], [])

  useEffect(() => {
    let isMounted = true

    async function fetchRanking() {
      setIsLoading(true)
      const result = await loadPrRanking({
        movement: movement === 'Todos' ? '' : movement,
        level: level === 'Todos' ? '' : level,
      })

      if (!isMounted) return

      setIsLoading(false)
      if (!result.ok) {
        setMessage(result.message)
        return
      }

      setMessage('')
      setRecords(result.records)
    }

    fetchRanking()

    return () => {
      isMounted = false
    }
  }, [level, movement, reloadKey])

  return (
    <div className="space-y-6">
      <section className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">Ranking KUPAN</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Mejores marcas por movimiento.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Ranking interno con privacidad básica: nombre, nivel, movimiento, marca y fecha.
          </p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Movimiento</span>
            <select
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
              value={movement}
              onChange={(event) => setMovement(event.target.value)}
            >
              {movementOptions.map((option) => (
                <option key={option} className="bg-kupan-black text-white" value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Nivel</span>
            <select
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              {levels.map((option) => (
                <option key={option} className="bg-kupan-black text-white" value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Tabla interna" title={movement === 'Todos' ? 'Todos los movimientos' : movement} />
        {isLoading && records.length === 0 ? <LoadingState label="Cargando ranking" lines={4} /> : null}
        {isLoading && records.length > 0 ? <StaleDataState /> : null}
        {message ? <ErrorState title="No fue posible actualizar el ranking" description={message} onAction={() => setReloadKey((current) => current + 1)} /> : null}
        {!isLoading && records.length === 0 && !message ? (
          <EmptyState title="Aún no hay marcas para este filtro." description="Cuando un alumno registre un PR válido, aparecerá en el ranking." />
        ) : null}
        <div className="space-y-3">
          {records.map((record, index) => (
            <RankingRow key={record.id} record={record} index={index} />
          ))}
        </div>
      </section>
    </div>
  )
}
