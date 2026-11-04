import { Field, TextArea } from '../AdminUi.jsx'

export function AdminWodForm({ draft, onDraftChange, onSubmit, isSubmitting = false, disabled = false }) {
  const isDisabled = disabled || isSubmitting

  return (
    <form className="k-panel space-y-3 p-4" onSubmit={onSubmit}>
      <Field label="Fecha" type="date" value={draft.date} required onChange={(value) => onDraftChange((current) => ({ ...current, date: value }))} />
      <Field label="Titulo" value={draft.title} onChange={(value) => onDraftChange((current) => ({ ...current, title: value }))} />
      <TextArea label="Warm up" value={draft.warmup} onChange={(value) => onDraftChange((current) => ({ ...current, warmup: value }))} />
      <TextArea label="Skill / Strength" value={draft.strength} onChange={(value) => onDraftChange((current) => ({ ...current, strength: value }))} />
      <TextArea label="WOD" value={draft.workout} onChange={(value) => onDraftChange((current) => ({ ...current, workout: value }))} />
      <Field label="Referencia de benchmark (opcional)" value={draft.training_details?.benchmarkId ?? ''} onChange={value=>onDraftChange(current=>({...current,training_details:{...current.training_details,benchmarkId:value.trim().toLowerCase()}}))} />
      <p className="text-sm text-white/70">Usa la misma referencia al repetir un benchmark. Solo se comparan resultados con igual nivel, prescripción y puntuación.</p>
      <Field label="Tipo de entrenamiento" value={draft.training_details?.type ?? ''} onChange={(value) => onDraftChange(current => ({ ...current, training_details: { ...current.training_details, type: value } }))} />
      <TextArea label="Técnica" value={draft.training_details?.skill ?? ''} onChange={(value) => onDraftChange(current => ({ ...current, training_details: { ...current.training_details, skill: value } }))} />
      {['Iniciado', 'Rookie', 'Scaled', 'RX'].map(level => <TextArea key={level} label={`WOD ${level}`} value={draft.training_details?.scaling?.find(item => item.level === level)?.items?.join('\n') ?? ''} onChange={value => onDraftChange(current => ({ ...current, training_details: { ...current.training_details, scaling: [...(current.training_details?.scaling ?? []).filter(item => item.level !== level), { level, items: value.split('\n').filter(Boolean) }] } }))} />)}
      <TextArea label="Vuelta a la calma" value={draft.training_details?.cooldown ?? ''} onChange={(value) => onDraftChange(current => ({ ...current, training_details: { ...current.training_details, cooldown: value } }))} />
      <Field label="Time cap" value={draft.time_cap} onChange={(value) => onDraftChange((current) => ({ ...current, time_cap: value }))} />
      <TextArea label="Notas" value={draft.notes} onChange={(value) => onDraftChange((current) => ({ ...current, notes: value }))} />
      <button type="submit" className="k-button w-full" disabled={isDisabled}>Guardar WOD</button>
    </form>
  )
}
