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
      <Field label="Time cap" value={draft.time_cap} onChange={(value) => onDraftChange((current) => ({ ...current, time_cap: value }))} />
      <TextArea label="Notas" value={draft.notes} onChange={(value) => onDraftChange((current) => ({ ...current, notes: value }))} />
      <button type="submit" className="k-button w-full" disabled={isDisabled}>Guardar WOD</button>
    </form>
  )
}
