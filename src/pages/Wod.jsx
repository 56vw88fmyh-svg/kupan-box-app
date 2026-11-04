import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Dialog, EmptyState, ErrorState, Input, LoadingState, useToast } from '../components/ui/index.js'
import { createPersonalRecord, getWorkoutResultHistory } from '../services/personalRecordsService.ts'
import { formatChileDisplayDate, loadTodaysWod } from '../utils/communityFeed.js'

import { buildResultInput, isBetterResult, resultContext } from '../utils/workoutResults.js'

const LEVEL_STORAGE_KEY = 'kupan_wod_selected_level_v1'
const levelOptions = ['Iniciado', 'Rookie', 'Scaled', 'RX']

const emptyResultDraft = {
  calories: '',
  distance: '',
  load: '',
  notes: '',
  reps: '',
  rounds: '',
  time: '',
  type: 'time',
}

function readSavedLevel() {
  try {
    const value = window.localStorage.getItem(LEVEL_STORAGE_KEY)
    return levelOptions.includes(value) ? value : 'Scaled'
  } catch {
    return 'Scaled'
  }
}

function saveLevel(level) {
  try {
    window.localStorage.setItem(LEVEL_STORAGE_KEY, level)
  } catch {
    // No sensible fallback needed; the selected level still works for this session.
  }
}

function toLines(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  if (value && typeof value === 'object' && Array.isArray(value.details)) return toLines(value.details)
  return String(value ?? '').split('\n').map((item) => item.trim()).filter(Boolean)
}

function getStrengthLines(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return toLines(value.details)
  return toLines(value)
}

function normalizeWod(rawWod, fallbackWod) {
  if (!rawWod) return null
  const sameFallback = fallbackWod?.id && fallbackWod.id === rawWod.id
  const fallbackScaling = sameFallback && Array.isArray(fallbackWod.scaling) ? fallbackWod.scaling : []

  return {
    id: rawWod.id ?? rawWod.date ?? 'today-wod',
    date: rawWod.date ?? new Date().toISOString().slice(0, 10),
    title: rawWod.title || 'WOD KUPAN',
    type: rawWod.type || fallbackWod?.type || 'Entrenamiento del día',
    focus: rawWod.focus || fallbackWod?.focus || '',
    timeCap: rawWod.timeCap || rawWod.time_cap || 'Por definir',
    warmup: toLines(rawWod.warmup),
    skill: toLines(rawWod.skill ?? rawWod.technique),
    strength: getStrengthLines(rawWod.strength),
    workout: toLines(rawWod.workout),
    cooldown: toLines(rawWod.cooldown ?? rawWod.coolDown),
    notes: toLines(rawWod.notes),
    scaling: Array.isArray(rawWod.scaling) ? rawWod.scaling : fallbackScaling,
    isHidden: Boolean(rawWod.isHidden || rawWod.hidden || rawWod.reveal_at),
  }
}

function wodHasContent(wod) {
  if (!wod || wod.isHidden) return false
  return wod.scaling?.some(plan => plan.items?.length) || ['warmup', 'skill', 'strength', 'workout', 'cooldown', 'notes'].some((key) => wod[key]?.length > 0)
}

function getLevelPlan(wod, selectedLevel) {
  return wod?.scaling?.find((item) => String(item.level).toLowerCase() === selectedLevel.toLowerCase()) ?? null
}

function buildWodSections(wod, selectedLevel) {
  if (!wod) return []
  const levelPlan = getLevelPlan(wod, selectedLevel)
  const workoutItems = levelPlan?.items?.length ? levelPlan.items : wod.workout

  return [
    { id: 'warmup', title: 'Calentamiento', duration: wod.warmupDuration, items: wod.warmup },
    { id: 'skill', title: 'Técnica o skill', duration: wod.skillDuration, items: wod.skill },
    { id: 'strength', title: 'Fuerza', duration: wod.strengthDuration, items: wod.strength },
    {
      id: 'wod',
      title: 'WOD',
      duration: wod.timeCap && wod.timeCap !== 'Por definir' ? wod.timeCap : '',
      description: levelPlan?.description ?? '',
      items: workoutItems,
    },
    { id: 'cooldown', title: 'Vuelta a la calma', duration: wod.cooldownDuration, items: wod.cooldown },
    { id: 'notes', title: 'Notas del coach', items: wod.notes },
  ].filter((section) => section.description || section.items?.length > 0)
}

function ResultFields({ draft, onChange }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Tipo de resultado</span>
        <select
          className="mt-2 min-h-12 w-full rounded-xl border border-kupan-border bg-kupan-black/45 px-4 py-3 text-base font-bold text-kupan-bone outline-none transition focus:border-kupan-flame"
          value={draft.type}
          onChange={(event) => onChange({ type: event.target.value })}
        >
          <option className="bg-kupan-black" value="time">Tiempo</option>
          <option className="bg-kupan-black" value="rounds_reps">Rondas y repeticiones</option>
          <option className="bg-kupan-black" value="load">Carga</option>
          <option className="bg-kupan-black" value="distance">Distancia</option>
          <option className="bg-kupan-black" value="calories">Calorías</option>
        </select>
      </label>

      {draft.type === 'time' ? <Input label="Tiempo" value={draft.time} helpText="Ejemplo: 12:35" onChange={(event) => onChange({ time: event.target.value })} /> : null}
      {draft.type === 'rounds_reps' ? (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Rondas" type="number" min="0" value={draft.rounds} onChange={(event) => onChange({ rounds: event.target.value })} />
          <Input label="Repeticiones" type="number" min="0" value={draft.reps} onChange={(event) => onChange({ reps: event.target.value })} />
        </div>
      ) : null}
      {draft.type === 'load' ? <Input label="Carga" type="number" min="0" step="0.5" value={draft.load} helpText="Kilos" onChange={(event) => onChange({ load: event.target.value })} /> : null}
      {draft.type === 'distance' ? <Input label="Distancia" type="number" min="0" value={draft.distance} helpText="Metros" onChange={(event) => onChange({ distance: event.target.value })} /> : null}
      {draft.type === 'calories' ? <Input label="Calorías" type="number" min="0" value={draft.calories} onChange={(event) => onChange({ calories: event.target.value })} /> : null}

      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Notas</span>
        <textarea
          className="mt-2 min-h-24 w-full resize-none rounded-xl border border-kupan-border bg-kupan-black/45 px-4 py-3 text-base font-bold leading-6 text-kupan-bone outline-none transition placeholder:text-white/55 focus:border-kupan-flame"
          value={draft.notes}
          placeholder="Cómo se sintió, escala usada o detalle importante."
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </label>
    </div>
  )
}

function TrainingSection({ description = '', duration = '', items, title }) {
  if (!description && (!items || items.length === 0)) return null

  return (
    <Card as="article" variant="standard" className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-black leading-tight text-text-primary">{title}</h3>
        {duration ? <Badge state="neutral">{duration}</Badge> : null}
      </div>
      {description ? <p className="mt-3 text-sm leading-6 text-text-secondary">{description}</p> : null}
      {items?.length ? (
        <ul className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li key={`${title}-${index}-${item}`} className="flex gap-3 text-base leading-7 text-text-secondary">
              <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-brand-red" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  )
}

function LevelSelector({ selectedLevel, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Seleccionar nivel del WOD">
      {levelOptions.map((level) => {
        const isSelected = selectedLevel === level
        return (
          <button
            key={level}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red ${
              isSelected
                ? 'border-brand-red bg-brand-red text-white shadow-[0_0_0_3px_rgba(240,68,68,.18)]'
                : 'border-border-default bg-bg-card text-text-secondary hover:border-border-strong hover:bg-bg-elevated hover:text-text-primary'
            }`}
            onClick={() => onSelect(level)}
          >
            {level}
            {isSelected ? <span className="mx-auto mt-1 block h-1 w-8 rounded-full bg-white" /> : null}
          </button>
        )
      })}
    </div>
  )
}

function WodSurprise({ today }) {
  return (
    <Card as="section" variant="elevated" className="mx-auto w-full max-w-3xl px-6 py-10 text-center sm:px-10 sm:py-14">
      <span className="inline-flex rounded-lg border border-kupan-border bg-white/[0.04] px-3 py-2 text-sm font-bold normal-case text-kupan-sand">{today}</span>
      <h1 className="mt-6 text-4xl font-black leading-tight text-text-primary sm:text-5xl">WOD sorpresa</h1>
      <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-text-secondary sm:text-lg">
        La programación se revelará al comenzar la clase.
      </p>
    </Card>
  )
}

export function Wod({ appContent, currentUser, setActivePage }) {
  const todayLabel = formatChileDisplayDate()
  const { showToast } = useToast()
  const [state, setState] = useState({ isLoading: true, message: '', wod: null })
  const [selectedLevel, setSelectedLevel] = useState(readSavedLevel)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [isSubmittingResult, setIsSubmittingResult] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [savedResults, setSavedResults] = useState([])
  const [resultDraft, setResultDraft] = useState(emptyResultDraft)

  useEffect(() => {
    let isMounted = true

    loadTodaysWod().then((result) => {
      if (!isMounted) return

      setState({
        isLoading: false,
        message: result.ok ? '' : result.message,
        wod: result.ok ? result.wod : null,
      })
    })

    return () => {
      isMounted = false
    }
  }, [])

  const wod = useMemo(() => normalizeWod(state.wod, appContent?.wod), [appContent?.wod, state.wod])
  const isSurprise = !wodHasContent(wod)
  const sections = useMemo(() => buildWodSections(wod, selectedLevel), [selectedLevel, wod])
  const levelPlan = getLevelPlan(wod, selectedLevel)
  const canUseAdminMode = ['admin', 'coach'].includes(currentUser?.role)

  useEffect(() => {
    let active = true
    if (!wod || !currentUser) return undefined
    getWorkoutResultHistory(resultContext(wod, selectedLevel, resultDraft.type)).then(result => {
      if (active) setSavedResults(result.ok ? result.data ?? [] : [])
    })
    return () => { active = false }
  }, [wod, currentUser, selectedLevel, resultDraft.type, isResultOpen])

  function handleLevelChange(level) {
    setSelectedLevel(level)
    saveLevel(level)
  }

  function updateResultDraft(partial) {
    setResultDraft((current) => ({ ...current, ...partial }))
    setResultMessage('')
  }

  async function handleSubmitResult(event) {
    event.preventDefault()
    if (!currentUser) {
      setActivePage?.('login')
      return
    }

    const input = buildResultInput(wod, selectedLevel, resultDraft)
    if (!input.ok) {
      setResultMessage(input.message)
      return
    }

    setIsSubmittingResult(true)
    input.value.resultContext = resultContext(wod, selectedLevel, resultDraft.type)
    const history = await getWorkoutResultHistory(input.value.resultContext)
    if (!history.ok && history.status !== 'offline') {
      setIsSubmittingResult(false)
      setResultMessage(history.message)
      return
    }

    const previousRecords = history.data ?? []
    const sameUnitRecords = previousRecords.filter((record) => record.unit === input.value.unit)
    const bestRecord = sameUnitRecords.find((record) => sameUnitRecords.every((candidate) => !isBetterResult(candidate, record)))
    const isNewPr = isBetterResult(input.value, bestRecord)
    const result = await createPersonalRecord(input.value)
    setIsSubmittingResult(false)

    if (!result.ok) {
      const isPending = result.status === 'pending'
      setResultMessage(result.message)
      showToast({
        type: isPending ? 'warning' : 'error',
        title: isPending ? 'Resultado pendiente' : 'No pudimos registrar',
        description: result.message,
      })
      return
    }

    showToast({
      type: 'success',
      title: isNewPr && bestRecord ? 'Mejor resultado comparable' : 'Resultado registrado',
      description: isNewPr && bestRecord ? 'Buena. Este resultado supera tu marca anterior del mismo nivel.' : 'Tu resultado quedó guardado.',
    })
    setResultDraft(emptyResultDraft)
    setResultMessage('')
    setIsResultOpen(false)
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {state.isLoading ? <LoadingState label="Cargando WOD de hoy" lines={4} /> : null}

      {state.message ? (
        <ErrorState title="No pudimos cargar el WOD" description={state.message} onAction={() => window.location.reload()} />
      ) : null}

      {!state.isLoading && !state.message && isSurprise ? <WodSurprise today={todayLabel} /> : null}

      {!state.isLoading && wod && !isSurprise ? (
        <>
          <Card as="section" variant="elevated" className="mx-auto w-full max-w-4xl overflow-hidden p-0">
            <div className="border-b border-border-default bg-bg-secondary p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge state="neutral">WOD de hoy</Badge>
                <p className="text-sm font-semibold text-text-muted">{todayLabel}</p>
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight text-text-primary sm:text-4xl">{wod.title}</h1>
              <p className="mt-2 text-base leading-7 text-text-secondary">{wod.type}</p>
              {wod.focus ? <p className="mt-3 text-sm leading-6 text-text-muted">{wod.focus}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-0 border-b border-border-default sm:grid-cols-4">
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Fecha</p>
                <p className="mt-1 font-black text-text-primary">{wod.date}</p>
              </div>
              <div className="border-l border-border-default p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Tipo</p>
                <p className="mt-1 font-black text-text-primary">{wod.type}</p>
              </div>
              <div className="border-t border-border-default p-4 sm:border-l sm:border-t-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Time cap</p>
                <p className="mt-1 font-black text-text-primary">{wod.timeCap}</p>
              </div>
              <div className="border-l border-t border-border-default p-4 sm:border-t-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Nivel</p>
                <p className="mt-1 font-black text-text-primary">{selectedLevel}</p>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <LevelSelector selectedLevel={selectedLevel} onSelect={handleLevelChange} />
              {!levelPlan && wod.scaling?.length ? (
                <p className="rounded-xl border border-border-default bg-bg-secondary p-3 text-sm leading-6 text-text-secondary">
                  Este nivel no tiene una versión específica cargada. Se muestra la pizarra principal.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" size="lg" onClick={() => setIsResultOpen(true)}>
                  Registrar resultado
                </Button>
                {canUseAdminMode ? (
                  <Button type="button" variant="secondary" size="lg" onClick={() => setActivePage?.('admin')}>
                    Editar WOD en admin
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="mx-auto w-full max-w-4xl space-y-3">
            {sections.map((section) => (
              <TrainingSection key={section.id} {...section} />
            ))}
          </div>
        </>
      ) : null}

      {savedResults.length ? <Card className="p-5">
        <h2 className="text-xl font-black text-white">Tus resultados · {selectedLevel}</h2>
        <ul className="mt-3 space-y-2">{savedResults.map(record => <li key={record.id} className="text-white/75">{record.record_date} · {record.rounds !== null ? `${record.rounds} rondas + ${record.reps ?? 0} reps` : record.unit === 'tiempo' ? `${Math.floor(record.value / 60)}:${String(record.value % 60).padStart(2, '0')}` : `${record.value} ${record.unit}`}</li>)}</ul>
      </Card> : null}
      <Dialog
        isOpen={isResultOpen}
        onClose={() => setIsResultOpen(false)}
        title="Registrar resultado"
        description={wod ? `${wod.title} · Nivel ${selectedLevel}` : 'Guarda tu resultado del WOD.'}
      >
        <form className="space-y-4" onSubmit={handleSubmitResult}>
          {!currentUser ? (
            <EmptyState
              title="Inicia sesión para registrar"
              description="Así tu resultado queda asociado a tu perfil y puede detectar nuevos PR."
            />
          ) : (
            <ResultFields draft={resultDraft} onChange={updateResultDraft} />
          )}
          {resultMessage ? <p className="rounded-xl border border-kupan-warning/30 bg-kupan-warning/10 p-3 text-sm font-semibold leading-6 text-text-secondary">{resultMessage}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" fullWidth onClick={() => setIsResultOpen(false)}>
              Cerrar
            </Button>
            <Button type={currentUser ? 'submit' : 'button'} fullWidth isLoading={isSubmittingResult} onClick={!currentUser ? () => setActivePage?.('login') : undefined}>
              {currentUser ? 'Guardar resultado' : 'Iniciar sesión'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
