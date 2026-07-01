import { Field, ToggleField } from '../AdminUi.jsx'

export function AdminPlanForm({ draft, onDraftChange, onSubmit, isSubmitting = false, disabled = false }) {
  const isDisabled = disabled || isSubmitting

  return (
    <form className="k-panel grid gap-3 p-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <Field label="Nombre" value={draft.name} required onChange={(value) => onDraftChange((current) => ({ ...current, name: value }))} />
      <Field label="Precio CLP" type="number" value={draft.price} required onChange={(value) => onDraftChange((current) => ({ ...current, price: value }))} />
      <Field label="Clases por semana" type="number" value={draft.classes_per_week} onChange={(value) => onDraftChange((current) => ({ ...current, classes_per_week: value }))} />
      <ToggleField label="Ilimitado" checked={draft.is_unlimited} onChange={(value) => onDraftChange((current) => ({ ...current, is_unlimited: value }))} />
      <ToggleField label="Activo" checked={draft.active} onChange={(value) => onDraftChange((current) => ({ ...current, active: value }))} />
      <button type="submit" className="k-button sm:col-span-2" disabled={isDisabled}>{draft.id ? 'Guardar plan' : 'Crear plan'}</button>
    </form>
  )
}
