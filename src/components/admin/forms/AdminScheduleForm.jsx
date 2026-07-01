import { Field, ToggleField } from '../AdminUi.jsx'

export function AdminScheduleForm({ draft, onDraftChange, onSubmit, isSubmitting = false, disabled = false }) {
  const isDisabled = disabled || isSubmitting

  return (
    <form className="k-panel grid gap-3 p-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <Field label="Dia 1-7" type="number" value={draft.day_of_week} required onChange={(value) => onDraftChange((current) => ({ ...current, day_of_week: value }))} />
      <Field label="Hora" type="time" value={draft.time} required onChange={(value) => onDraftChange((current) => ({ ...current, time: value }))} />
      <Field label="Clase" value={draft.class_name} required onChange={(value) => onDraftChange((current) => ({ ...current, class_name: value }))} />
      <Field label="Coach" value={draft.coach} onChange={(value) => onDraftChange((current) => ({ ...current, coach: value }))} />
      <Field label="Cupos maximos" type="number" value={draft.max_spots} onChange={(value) => onDraftChange((current) => ({ ...current, max_spots: value }))} />
      <ToggleField label="Activo" checked={draft.active} onChange={(value) => onDraftChange((current) => ({ ...current, active: value }))} />
      <button type="submit" className="k-button sm:col-span-2" disabled={isDisabled}>{draft.id ? 'Guardar horario' : 'Crear horario'}</button>
    </form>
  )
}
