import { Field, SelectField, TextArea, ToggleField } from '../AdminUi.jsx'

export function AdminCommunityPostForm({ draft, onDraftChange, onSubmit, isSubmitting = false, disabled = false }) {
  const isDisabled = disabled || isSubmitting

  return (
    <form className="k-panel grid gap-3 p-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <SelectField label="Tipo" value={draft.type} onChange={(value) => onDraftChange((current) => ({ ...current, type: value }))}>
        {['noticia', 'evento', 'ranking', 'comunidad'].map((type) => <option key={type} className="bg-kupan-black" value={type}>{type}</option>)}
      </SelectField>
      <Field label="Fecha evento" type="date" value={draft.event_date} onChange={(value) => onDraftChange((current) => ({ ...current, event_date: value }))} />
      <Field label="Titulo" value={draft.title} required onChange={(value) => onDraftChange((current) => ({ ...current, title: value }))} />
      <ToggleField label="Activo" checked={draft.active} onChange={(value) => onDraftChange((current) => ({ ...current, active: value }))} />
      <div className="sm:col-span-2">
        <TextArea label="Contenido" value={draft.content} onChange={(value) => onDraftChange((current) => ({ ...current, content: value }))} />
      </div>
      <button type="submit" className="k-button sm:col-span-2" disabled={isDisabled}>{draft.id ? 'Guardar publicacion' : 'Crear publicacion'}</button>
    </form>
  )
}
