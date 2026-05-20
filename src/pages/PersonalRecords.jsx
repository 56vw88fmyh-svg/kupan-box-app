import { useEffect, useMemo, useState } from 'react'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import {
  createPersonalRecord,
  deletePersonalRecord,
  loadPersonalRecords,
  recordUnits,
  suggestedMovements,
  updatePersonalRecord,
} from '../utils/personalRecords.js'

const emptyForm = {
  movement: 'Back Squat',
  value: '',
  unit: 'kg',
  recordDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

function formatDate(date) {
  if (!date) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function formatValue(record) {
  return `${Number(record.value).toLocaleString('es-CL')} ${record.unit}`
}

function sortRecords(records, sortMode) {
  return [...records].sort((a, b) => {
    if (sortMode === 'best') {
      if (a.unit === 'tiempo' && b.unit === 'tiempo') return Number(a.value) - Number(b.value)
      return Number(b.value) - Number(a.value)
    }

    return new Date(`${b.record_date}T00:00:00`) - new Date(`${a.record_date}T00:00:00`)
  })
}

function RecordField({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">{label}</span>
      {children}
    </label>
  )
}

export function PersonalRecords({ currentUser, setActivePage }) {
  const [records, setRecords] = useState([])
  const [formData, setFormData] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [movementFilter, setMovementFilter] = useState('Todos')
  const [sortMode, setSortMode] = useState('date')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchRecords() {
      if (!currentUser?.id) return

      setIsLoading(true)
      const result = await loadPersonalRecords(currentUser.id)

      if (!isMounted) return

      setIsLoading(false)

      if (!result.ok) {
        setMessage(result.message)
        setMessageType('error')
        return
      }

      setRecords(result.records)
    }

    fetchRecords()

    return () => {
      isMounted = false
    }
  }, [currentUser?.id])

  const movementOptions = useMemo(() => {
    const customMovements = records.map((record) => record.movement)
    return ['Todos', ...new Set([...suggestedMovements, ...customMovements])]
  }, [records])

  const visibleRecords = useMemo(() => {
    const filteredRecords = movementFilter === 'Todos'
      ? records
      : records.filter((record) => record.movement === movementFilter)

    return sortRecords(filteredRecords, sortMode)
  }, [movementFilter, records, sortMode])

  function updateForm(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setEditingId(null)
    setFormData(emptyForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setMessageType('error')
    setIsSaving(true)

    const result = editingId
      ? await updatePersonalRecord(editingId, formData)
      : await createPersonalRecord(currentUser.id, formData)

    setIsSaving(false)

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setRecords((current) => (
      editingId
        ? current.map((record) => (record.id === result.record.id ? result.record : record))
        : [result.record, ...current]
    ))
    setMessageType('success')
    setMessage(result.message)
    resetForm()
  }

  function startEdit(record) {
    setEditingId(record.id)
    setFormData({
      movement: record.movement,
      value: String(record.value),
      unit: record.unit,
      recordDate: record.record_date,
      notes: record.notes ?? '',
    })
    setMessage('')
  }

  async function handleDelete(recordId) {
    setMessage('')
    setMessageType('error')
    const result = await deletePersonalRecord(recordId)

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setRecords((current) => current.filter((record) => record.id !== recordId))
    if (editingId === recordId) resetForm()
    setMessageType('success')
    setMessage(result.message)
  }

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <MotionCard as="section" className="k-card p-5">
          <p className="k-pill inline-flex text-kupan-flame">Mis PR</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Inicia sesion para registrar tus marcas.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Tus PR son personales: cada alumno ve y modifica solo sus propias marcas.
          </p>
          <button type="button" className="k-button mt-5 w-full" onClick={() => setActivePage('login')}>
            Iniciar sesion
          </button>
        </MotionCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <MotionCard as="section" className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">Mis PR</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Tus marcas cuentan la historia del trabajo.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Registra tus mejores levantamientos, benchmarks y avances. Somos comunidad, esfuerzo y progreso.
          </p>
        </div>
        <div className="grid grid-cols-3 border-b border-white/10">
          <div className="p-4">
            <p className="text-3xl font-black text-white">{records.length}</p>
            <p className="text-[0.65rem] font-black uppercase text-white/60">PR guardados</p>
          </div>
          <div className="border-l border-white/10 p-4">
            <p className="text-3xl font-black text-white">{new Set(records.map((record) => record.movement)).size}</p>
            <p className="text-[0.65rem] font-black uppercase text-white/60">Movimientos</p>
          </div>
          <div className="border-l border-white/10 p-4">
            <p className="text-2xl font-black uppercase text-kupan-flame">{currentUser.level ?? 'KUPAN'}</p>
            <p className="text-[0.65rem] font-black uppercase text-white/60">Nivel</p>
          </div>
        </div>
      </MotionCard>

      <MotionCard as="section" className="k-card p-5" delay={0.03}>
        <SectionTitle eyebrow={editingId ? 'Editar PR' : 'Nuevo PR'} title={editingId ? 'Actualiza tu marca' : 'Registra progreso'} />
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <RecordField label="Movimiento">
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-kupan-ember"
              list="kupan-pr-movements"
              value={formData.movement}
              required
              onChange={(event) => updateForm('movement', event.target.value)}
            />
            <datalist id="kupan-pr-movements">
              {suggestedMovements.map((movement) => <option key={movement} value={movement} />)}
            </datalist>
          </RecordField>

          <div className="grid grid-cols-[1fr_0.75fr] gap-3">
            <RecordField label="Valor">
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-kupan-ember"
                type="number"
                min="0"
                step="0.01"
                value={formData.value}
                required
                onChange={(event) => updateForm('value', event.target.value)}
              />
            </RecordField>
            <RecordField label="Unidad">
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
                value={formData.unit}
                onChange={(event) => updateForm('unit', event.target.value)}
              >
                {recordUnits.map((unit) => (
                  <option key={unit} className="bg-kupan-black text-white" value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </RecordField>
          </div>

          <RecordField label="Fecha">
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-kupan-ember"
              type="date"
              value={formData.recordDate}
              required
              onChange={(event) => updateForm('recordDate', event.target.value)}
            />
          </RecordField>

          <RecordField label="Notas">
            <textarea
              className="mt-2 min-h-24 w-full resize-none rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-kupan-ember"
              value={formData.notes}
              placeholder="Como se sintio, carga, estrategia o contexto."
              onChange={(event) => updateForm('notes', event.target.value)}
            />
          </RecordField>

          {message ? (
            <p className={`rounded-lg border p-3 text-sm font-bold text-white ${
              messageType === 'success'
                ? 'border-emerald-400/30 bg-emerald-400/10'
                : 'border-kupan-flame/30 bg-kupan-flame/10'
            }`}
            >
              {message}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="submit" className="k-button w-full" disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingId ? 'Guardar PR' : 'Crear PR'}
            </button>
            {editingId ? (
              <button type="button" className="k-button-secondary w-full" onClick={resetForm}>
                Cancelar edicion
              </button>
            ) : null}
          </div>
        </form>
      </MotionCard>

      <section>
        <SectionTitle eyebrow="Historial" title="Tus marcas personales" />
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Filtrar movimiento</span>
            <select
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
              value={movementFilter}
              onChange={(event) => setMovementFilter(event.target.value)}
            >
              {movementOptions.map((movement) => (
                <option key={movement} className="bg-kupan-black text-white" value={movement}>
                  {movement}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Ordenar</span>
            <select
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
            >
              <option className="bg-kupan-black text-white" value="date">Fecha mas reciente</option>
              <option className="bg-kupan-black text-white" value="best">Mejor marca</option>
            </select>
          </label>
        </div>

        {isLoading ? <p className="k-panel p-4 text-sm font-bold text-white/60">Cargando tus PR desde Supabase...</p> : null}

        {!isLoading && visibleRecords.length === 0 ? (
          <MotionCard className="k-panel p-4">
            <p className="font-black uppercase text-white">Aun no hay PR para mostrar.</p>
            <p className="mt-1 text-sm leading-6 text-white/60">Registra tu primera marca y deja que el progreso hable.</p>
          </MotionCard>
        ) : null}

        <div className="space-y-3">
          {visibleRecords.map((record) => (
            <MotionCard key={record.id} as="article" className="k-panel p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">{formatDate(record.record_date)}</p>
                  <h3 className="mt-2 break-words text-xl font-black uppercase text-white">{record.movement}</h3>
                  <p className="mt-1 text-2xl font-black text-kupan-flame">{formatValue(record)}</p>
                  {record.notes ? <p className="mt-2 text-sm leading-6 text-white/60">{record.notes}</p> : null}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => startEdit(record)}>
                  Editar
                </button>
                <button type="button" className="rounded-lg border border-kupan-red/40 bg-kupan-red/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition active:scale-[0.98]" onClick={() => handleDelete(record.id)}>
                  Eliminar
                </button>
              </div>
            </MotionCard>
          ))}
        </div>
      </section>
    </div>
  )
}
