import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Dialog, EmptyState, ErrorState, Input, LoadingState, useToast } from '../components/ui/index.js'
import {
  createPersonalRecord,
  deletePersonalRecord,
  loadPersonalRecords,
  recordUnits,
  retryPendingPersonalRecords,
  suggestedMovements,
  updatePersonalRecord,
} from '../utils/personalRecords.js'
import { migrateLegacyPrs } from '../services/prMigrationService.js'

const categories = [
  { id: 'strength', label: 'Fuerza', match: ['squat', 'deadlift', 'bench', 'press', 'thruster'] },
  { id: 'weightlifting', label: 'Halterofilia', match: ['snatch', 'clean', 'jerk'] },
  { id: 'gymnastics', label: 'Gimnásticos', match: ['pull up', 'chest to bar', 'muscle up', 'toes to bar', 'handstand', 'wall ball', 'box jump', 'burpee', 'double under'] },
  { id: 'benchmarks', label: 'Benchmarks', match: ['fran', 'grace', 'isabel', 'helen', 'annie', 'diane', 'cindy', 'murph'] },
  { id: 'cardio', label: 'Cardio', match: ['row', 'run', 'bike', 'ski', 'assault', 'carry'] },
  { id: 'other', label: 'Otros', match: [] },
]

const emptyForm = {
  customMovement: '',
  movement: '',
  notes: '',
  recordDate: new Date().toISOString().slice(0, 10),
  reps: '',
  resultType: 'kg',
  rounds: '',
  time: '',
  unit: 'kg',
  value: '',
}

function formatDate(date) {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

function normalizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function toTitleCase(value) {
  return normalizeName(value).toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
}

function parsePositiveNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(String(value).replace(',', '.'))
  return Number.isFinite(number) && number >= 0 ? number : null
}

function parseTimeToSeconds(value) {
  const text = normalizeName(value)
  if (!text) return null
  const parts = text.split(':').map(Number)
  if (parts.length === 1) return parsePositiveNumber(parts[0])
  if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1]
  if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

function formatTime(seconds) {
  const total = Math.max(Number(seconds) || 0, 0)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function formatValue(record) {
  if (record.unit === 'tiempo') return formatTime(record.time_seconds ?? record.value)
  if (record.rounds !== null && record.rounds !== undefined) return `${record.rounds} rondas + ${record.reps ?? 0} reps`
  return `${Number(record.value).toLocaleString('es-CL')} ${record.unit}`
}

function getCategoryForMovement(movement) {
  const normalized = normalizeName(movement).toLowerCase()
  return categories.find((category) => category.match.some((term) => normalized.includes(term))) ?? categories.at(-1)
}

function compareRecords(a, b) {
  if (!b) return -1
  if (a.unit === 'tiempo') return Number(a.value) - Number(b.value)
  if (a.rounds !== null && a.rounds !== undefined) {
    const roundsDiff = Number(b.rounds ?? Math.floor(b.value)) - Number(a.rounds ?? Math.floor(a.value))
    if (roundsDiff !== 0) return roundsDiff
    return Number(b.reps ?? 0) - Number(a.reps ?? 0)
  }
  return Number(b.value) - Number(a.value)
}

function groupRecords(records) {
  const groups = new Map()
  records.forEach((record) => {
    const key = `${normalizeName(record.movement).toLowerCase()}|${record.unit}`
    const group = groups.get(key) ?? { history: [], movement: record.movement, unit: record.unit }
    group.history.push(record)
    groups.set(key, group)
  })

  return [...groups.values()].map((group) => {
    const history = [...group.history].sort((a, b) => new Date(`${b.record_date}T00:00:00`) - new Date(`${a.record_date}T00:00:00`))
    const best = history.reduce((current, item) => (compareRecords(item, current) < 0 ? item : current), null)
    const previousBest = history.filter((item) => item.id !== best.id).reduce((current, item) => (compareRecords(item, current) < 0 ? item : current), null)
    const category = getCategoryForMovement(group.movement)
    return { ...group, best, category, history, previousBest, trend: previousBest ? compareRecords(best, previousBest) < 0 ? 'up' : 'same' : 'new' }
  }).sort((a, b) => a.movement.localeCompare(b.movement))
}

function buildPayload(formData) {
  const movement = formData.movement === '__custom__' ? toTitleCase(formData.customMovement) : normalizeName(formData.movement)
  if (!movement || movement.length < 2) return { ok: false, message: 'Selecciona un ejercicio o crea uno personalizado válido.' }
  if (!formData.recordDate) return { ok: false, message: 'Selecciona la fecha del PR.' }

  const base = { movement, recordDate: formData.recordDate, notes: normalizeName(formData.notes) }

  if (formData.resultType === 'tiempo') {
    const seconds = parseTimeToSeconds(formData.time)
    if (!seconds || seconds <= 0) return { ok: false, message: 'Ingresa un tiempo válido. Ejemplo: 08:45.' }
    return { ok: true, payload: { ...base, value: seconds, unit: 'tiempo', timeSeconds: seconds } }
  }

  if (formData.resultType === 'rounds_reps') {
    const rounds = parsePositiveNumber(formData.rounds)
    const reps = parsePositiveNumber(formData.reps || 0)
    if (rounds === null || reps === null) return { ok: false, message: 'Ingresa rondas y repeticiones válidas.' }
    return { ok: true, payload: { ...base, value: rounds, unit: 'reps', rounds, reps } }
  }

  const unit = formData.resultType
  const value = parsePositiveNumber(formData.value)
  if (value === null || value <= 0) return { ok: false, message: 'Ingresa un valor mayor a cero.' }
  return { ok: true, payload: { ...base, value, unit } }
}

function getDefaultResultType(unit) {
  if (unit === 'tiempo') return 'tiempo'
  if (unit === 'metros') return 'metros'
  if (unit === 'calorias') return 'calorias'
  if (unit === 'reps') return 'reps'
  return 'kg'
}

function MovementSelector({ customValue, movement, onChange }) {
  const [query, setQuery] = useState('')
  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const baseOptions = normalizedQuery
      ? suggestedMovements.filter((item) => item.toLowerCase().includes(normalizedQuery))
      : suggestedMovements
    return baseOptions.slice(0, 80)
  }, [query])

  return (
    <div className="space-y-3">
      <Input label="Buscar ejercicio" value={query} helpText="Primero busca en la lista KUPAN." onChange={(event) => setQuery(event.target.value)} />
      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Ejercicio</span>
        <select
          className="mt-2 min-h-12 w-full rounded-xl border border-kupan-border bg-kupan-black/45 px-4 py-3 text-base font-bold text-kupan-bone outline-none transition focus:border-kupan-flame"
          value={movement}
          onChange={(event) => onChange({ movement: event.target.value })}
        >
          <option className="bg-kupan-black" value="">Seleccionar ejercicio</option>
          {options.map((item) => <option key={item} className="bg-kupan-black" value={item}>{item}</option>)}
          <option className="bg-kupan-black" value="__custom__">Crear ejercicio personalizado</option>
        </select>
      </label>
      {movement === '__custom__' ? (
        <Input
          label="Ejercicio personalizado"
          value={customValue}
          helpText="Se normaliza el nombre antes de guardar. Evita duplicados como clean/Clean."
          onChange={(event) => onChange({ customMovement: event.target.value })}
        />
      ) : null}
    </div>
  )
}

function ResultFields({ formData, onChange }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Tipo de marca</span>
        <select
          className="mt-2 min-h-12 w-full rounded-xl border border-kupan-border bg-kupan-black/45 px-4 py-3 text-base font-bold text-kupan-bone outline-none transition focus:border-kupan-flame"
          value={formData.resultType}
          onChange={(event) => onChange({ resultType: event.target.value, unit: event.target.value === 'rounds_reps' ? 'reps' : event.target.value })}
        >
          <option className="bg-kupan-black" value="kg">Peso</option>
          <option className="bg-kupan-black" value="tiempo">Tiempo</option>
          <option className="bg-kupan-black" value="rounds_reps">Rondas y repeticiones</option>
          <option className="bg-kupan-black" value="metros">Distancia</option>
          <option className="bg-kupan-black" value="calorias">Calorías</option>
          <option className="bg-kupan-black" value="reps">Repeticiones</option>
        </select>
      </label>

      {formData.resultType === 'tiempo' ? <Input label="Tiempo" value={formData.time} helpText="Ejemplo: 08:45" onChange={(event) => onChange({ time: event.target.value })} /> : null}
      {formData.resultType === 'rounds_reps' ? (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Rondas" type="number" min="0" value={formData.rounds} onChange={(event) => onChange({ rounds: event.target.value })} />
          <Input label="Repeticiones" type="number" min="0" value={formData.reps} onChange={(event) => onChange({ reps: event.target.value })} />
        </div>
      ) : null}
      {!['tiempo', 'rounds_reps'].includes(formData.resultType) ? (
        <Input
          label={formData.resultType === 'kg' ? 'Peso' : formData.resultType === 'metros' ? 'Distancia' : formData.resultType === 'calorias' ? 'Calorías' : 'Repeticiones'}
          type="number"
          min="0"
          step={formData.resultType === 'kg' ? '0.5' : '1'}
          value={formData.value}
          helpText={formData.resultType === 'kg' ? 'Kilos' : recordUnits.includes(formData.resultType) ? formData.resultType : ''}
          onChange={(event) => onChange({ value: event.target.value })}
        />
      ) : null}
    </div>
  )
}

function RecordCard({ group, onOpen }) {
  return (
    <button type="button" className="w-full text-left" onClick={() => onOpen(group)}>
      <Card variant="interactive" className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{group.category.label}</p>
            <h3 className="mt-1 break-words text-lg font-black text-text-primary">{group.movement}</h3>
            <p className="mt-2 text-2xl font-black text-kupan-flame">{formatValue(group.best)}</p>
            <p className="mt-1 text-sm text-text-muted">{formatDate(group.best.record_date)}</p>
          </div>
          <Badge state={group.trend === 'up' ? 'success' : group.trend === 'new' ? 'available' : 'neutral'}>
            {group.trend === 'up' ? 'Mejorando' : group.trend === 'new' ? 'Nuevo' : 'Estable'}
          </Badge>
        </div>
      </Card>
    </button>
  )
}

function MigrationNotice({ migrationState, onRetry }) {
  if (migrationState.status === 'idle') return null
  const isProblem = ['error', 'warning'].includes(migrationState.status)
  return (
    <Card variant={isProblem ? 'warning' : 'standard'} className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-text-primary">
            {migrationState.status === 'migrating' ? 'Migrando tus récords' : migrationState.status === 'completed' ? 'Récords sincronizados' : 'No fue posible sincronizar algunos récords'}
          </p>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {migrationState.status === 'migrating'
              ? 'Estamos revisando si existen marcas antiguas guardadas en este dispositivo.'
              : migrationState.message || 'Puedes reintentar sin borrar los datos locales.'}
          </p>
        </div>
        {isProblem ? <Button type="button" variant="secondary" size="sm" onClick={onRetry}>Reintentar</Button> : null}
      </div>
    </Card>
  )
}

export function PersonalRecords({ currentUser, setActivePage }) {
  const { showToast } = useToast()
  const [records, setRecords] = useState([])
  const [formData, setFormData] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [migrationAttempt, setMigrationAttempt] = useState(0)
  const [migrationState, setMigrationState] = useState({ status: 'idle', message: '' })
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const refreshRecords = useCallback(async () => {
    if (!currentUser?.id) return

    setIsLoading(true)
    const pendingResult = await retryPendingPersonalRecords()
    const result = await loadPersonalRecords(currentUser.id)
    setIsLoading(false)

    if (!pendingResult.ok && pendingResult.status === 'pending') {
      setMigrationState({ status: 'warning', message: pendingResult.message, result: pendingResult })
    }

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setRecords(result.records ?? [])
    setMessage('')
  }, [currentUser?.id])

  useEffect(() => {
    let isMounted = true

    async function syncAndFetchRecords() {
      if (!currentUser?.id) return
      setMigrationState({ status: 'migrating', message: 'Migrando tus récords.' })
      const migrationResult = await migrateLegacyPrs({ currentUser })
      if (!isMounted) return

      const shouldShowMigrationState = migrationResult.status !== 'completed'
        || migrationResult.migrated > 0
        || migrationResult.skipped > 0
        || migrationResult.invalid > 0

      setMigrationState(shouldShowMigrationState
        ? { status: migrationResult.status, message: migrationResult.message, result: migrationResult }
        : { status: 'idle', message: '' })

      await refreshRecords()
    }

    syncAndFetchRecords()
    return () => {
      isMounted = false
    }
  }, [currentUser, migrationAttempt, refreshRecords])

  const groupedRecords = useMemo(() => groupRecords(records), [records])
  const visibleGroups = activeCategory === 'all' ? groupedRecords : groupedRecords.filter((group) => group.category.id === activeCategory)
  const selectedHistory = selectedGroup ? groupedRecords.find((group) => `${group.movement}|${group.unit}` === `${selectedGroup.movement}|${selectedGroup.unit}`) : null

  function updateForm(partial) {
    setFormData((current) => ({ ...current, ...partial }))
    setMessage('')
  }

  function resetForm() {
    setEditingId(null)
    setFormData(emptyForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const input = buildPayload(formData)
    if (!input.ok) {
      setMessage(input.message)
      return
    }

    setIsSaving(true)
    const result = editingId ? await updatePersonalRecord(editingId, input.payload) : await createPersonalRecord(currentUser.id, input.payload)
    setIsSaving(false)

    if (!result.ok) {
      setMessage(result.message)
      showToast({ type: result.status === 'pending' ? 'warning' : 'error', title: result.status === 'pending' ? 'Pendiente de sincronización' : 'No pudimos guardar', description: result.message })
      return
    }

    setRecords((current) => (editingId
      ? current.map((record) => (record.id === result.record.id ? result.record : record))
      : [result.record, ...current]))
    showToast({ type: 'success', title: 'Guardado correctamente', description: result.message })
    resetForm()
  }

  function startEdit(record) {
    setEditingId(record.id)
    setFormData({
      ...emptyForm,
      movement: suggestedMovements.includes(record.movement) ? record.movement : '__custom__',
      customMovement: suggestedMovements.includes(record.movement) ? '' : record.movement,
      resultType: record.rounds !== null && record.rounds !== undefined ? 'rounds_reps' : getDefaultResultType(record.unit),
      unit: record.unit,
      value: record.unit === 'tiempo' || record.rounds !== null && record.rounds !== undefined ? '' : String(record.value),
      time: record.unit === 'tiempo' ? formatTime(record.time_seconds ?? record.value) : '',
      rounds: record.rounds ?? '',
      reps: record.reps ?? '',
      recordDate: record.record_date,
      notes: record.notes ?? '',
    })
    setSelectedGroup(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function requestDelete(record) {
    setDeleteTarget(record)
    setIsDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteTarget?.id) return
    const result = await deletePersonalRecord(deleteTarget.id)
    if (!result.ok) {
      setMessage(result.message)
      showToast({ type: 'error', title: 'No pudimos eliminar', description: result.message })
      return
    }
    setRecords((current) => current.filter((record) => record.id !== deleteTarget.id))
    if (editingId === deleteTarget.id) resetForm()
    setIsDeleteOpen(false)
    setDeleteTarget(null)
    showToast({ type: 'success', title: 'PR eliminado', description: result.message })
  }

  if (!currentUser) {
    return (
      <div className="space-y-6 pb-24 md:pb-8">
        <Card as="section" variant="elevated" className="p-5">
          <Badge state="neutral">Mis PR</Badge>
          <h1 className="mt-4 text-3xl font-black leading-tight text-text-primary">Inicia sesión para registrar tus marcas.</h1>
          <p className="mt-3 text-base leading-7 text-text-secondary">Tus PR son personales y se guardan en Supabase para que no desaparezcan al actualizar la app.</p>
          <Button type="button" className="mt-5" fullWidth onClick={() => setActivePage('login')}>Iniciar sesión</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <Card as="section" variant="elevated" className="overflow-hidden p-0">
        <div className="border-b border-border-default bg-bg-secondary p-5">
          <Badge state="neutral">Récords personales</Badge>
          <h1 className="mt-4 text-3xl font-black leading-tight text-text-primary sm:text-4xl">Tus marcas quedan guardadas.</h1>
          <p className="mt-3 text-base leading-7 text-text-secondary">Supabase es la fuente principal. Si la conexión falla, mantenemos visibles los datos anteriores y puedes reintentar.</p>
        </div>
        <div className="grid grid-cols-3 border-b border-border-default">
          <div className="p-4">
            <p className="text-3xl font-black text-text-primary">{records.length}</p>
            <p className="text-xs font-bold text-text-muted">historial</p>
          </div>
          <div className="border-l border-border-default p-4">
            <p className="text-3xl font-black text-text-primary">{groupedRecords.length}</p>
            <p className="text-xs font-bold text-text-muted">PR actuales</p>
          </div>
          <div className="border-l border-border-default p-4">
            <p className="text-2xl font-black text-kupan-flame">{currentUser.level ?? 'KUPAN'}</p>
            <p className="text-xs font-bold text-text-muted">nivel</p>
          </div>
        </div>
      </Card>

      <MigrationNotice migrationState={migrationState} onRetry={() => setMigrationAttempt((current) => current + 1)} />

      <Card as="section" variant="standard" className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-text-muted">{editingId ? 'Editar PR' : 'Añadir nuevo PR'}</p>
            <h2 className="mt-1 text-2xl font-black text-text-primary">{editingId ? 'Actualiza tu marca' : 'Registra progreso'}</h2>
          </div>
          {editingId ? <Button type="button" variant="secondary" size="sm" onClick={resetForm}>Cancelar edición</Button> : null}
        </div>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <MovementSelector movement={formData.movement} customValue={formData.customMovement} onChange={updateForm} />
          <ResultFields formData={formData} onChange={updateForm} />
          <Input label="Fecha" type="date" value={formData.recordDate} onChange={(event) => updateForm({ recordDate: event.target.value })} />
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Notas</span>
            <textarea
              className="mt-2 min-h-24 w-full resize-none rounded-xl border border-kupan-border bg-kupan-black/45 px-4 py-3 text-base font-bold leading-6 text-kupan-bone outline-none transition placeholder:text-white/35 focus:border-kupan-flame"
              value={formData.notes}
              placeholder="Contexto, escala usada o cómo se sintió."
              onChange={(event) => updateForm({ notes: event.target.value })}
            />
          </label>
          {message ? <p className="rounded-xl border border-kupan-warning/30 bg-kupan-warning/10 p-3 text-sm font-semibold leading-6 text-text-secondary">{message}</p> : null}
          <Button type="submit" fullWidth isLoading={isSaving}>{editingId ? 'Guardar cambios' : 'Guardar PR'}</Button>
        </form>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-text-muted">PR actuales</p>
            <h2 className="mt-1 text-2xl font-black text-text-primary">Por categoría</h2>
          </div>
          {isLoading && records.length > 0 ? <Badge state="pending">Actualizando</Badge> : null}
        </div>

        <div className="flex gap-2 overflow-x-auto k-scroll-x pb-1">
          <button type="button" className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-black ${activeCategory === 'all' ? 'border-brand-red bg-brand-red text-white' : 'border-border-default bg-bg-card text-text-secondary'}`} onClick={() => setActiveCategory('all')}>Todos</button>
          {categories.map((category) => (
            <button key={category.id} type="button" className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-black ${activeCategory === category.id ? 'border-brand-red bg-brand-red text-white' : 'border-border-default bg-bg-card text-text-secondary'}`} onClick={() => setActiveCategory(category.id)}>
              {category.label}
            </button>
          ))}
        </div>

        {isLoading && records.length === 0 ? <LoadingState label="Cargando tus récords" lines={4} /> : null}
        {!isLoading && message && records.length > 0 ? <ErrorState title="No se pudieron cargar tus récords" description="Mantenemos visibles tus datos anteriores. Puedes reintentar cuando vuelva la conexión." actionLabel="Reintentar" onAction={refreshRecords} /> : null}
        {!isLoading && records.length === 0 && !message ? <EmptyState title="No tienes PR registrados." description="Agrega tu primera marca para comenzar tu historial." /> : null}
        {!isLoading && visibleGroups.length === 0 && records.length > 0 ? <EmptyState title="No hay PR en esta categoría." description="Cambia de categoría o registra una nueva marca." /> : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {visibleGroups.map((group) => <RecordCard key={`${group.movement}-${group.unit}`} group={group} onOpen={setSelectedGroup} />)}
        </div>
      </section>

      <Dialog isOpen={Boolean(selectedHistory)} onClose={() => setSelectedGroup(null)} title={selectedHistory?.movement ?? 'Detalle PR'} description={selectedHistory ? `${selectedHistory.category.label} · ${selectedHistory.unit}` : ''}>
        {selectedHistory ? (
          <div className="space-y-4">
            <Card variant="selected" className="p-4">
              <p className="text-sm font-semibold text-text-secondary">Récord actual</p>
              <p className="mt-1 text-3xl font-black text-kupan-flame">{formatValue(selectedHistory.best)}</p>
              <p className="mt-1 text-sm text-text-muted">{formatDate(selectedHistory.best.record_date)}</p>
              {selectedHistory.best.notes ? <p className="mt-3 text-sm leading-6 text-text-secondary">{selectedHistory.best.notes}</p> : null}
            </Card>
            <div className="space-y-3">
              {selectedHistory.history.map((record) => (
                <Card key={record.id} variant="standard" className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-text-primary">{formatValue(record)}</p>
                      <p className="mt-1 text-sm text-text-muted">{formatDate(record.record_date)}</p>
                      {record.notes ? <p className="mt-2 text-sm leading-6 text-text-secondary">{record.notes}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="tertiary" size="sm" onClick={() => startEdit(record)}>Editar</Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => requestDelete(record)}>Eliminar</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Eliminar PR" description={deleteTarget ? `¿Eliminar ${deleteTarget.movement} del ${formatDate(deleteTarget.record_date)}?` : ''} isDestructive>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" fullWidth onClick={() => setIsDeleteOpen(false)}>Mantener PR</Button>
          <Button type="button" variant="destructive" fullWidth onClick={confirmDelete}>Sí, eliminar</Button>
        </div>
      </Dialog>
    </div>
  )
}
