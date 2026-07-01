import { Field, TextArea } from '../AdminUi.jsx'

export function AdminSettingsForm({ draft, onTextChange, onSubmit, isSubmitting = false, disabled = false }) {
  const isDisabled = disabled || isSubmitting

  return (
    <form className="k-panel space-y-4 p-4" onSubmit={onSubmit}>
      <Field label="Inicio · etiqueta" value={draft.homeEyebrow} onChange={(value) => onTextChange('homeEyebrow', value)} />
      <Field label="Inicio · titulo" value={draft.homeTitle} onChange={(value) => onTextChange('homeTitle', value)} />
      <TextArea label="Inicio · bajada" value={draft.homeBody} onChange={(value) => onTextChange('homeBody', value)} />
      <Field label="Reservas · titulo" value={draft.reservationsTitle} onChange={(value) => onTextChange('reservationsTitle', value)} />
      <TextArea label="Reservas · bajada" value={draft.reservationsBody} onChange={(value) => onTextChange('reservationsBody', value)} />
      <Field label="Comunidad · frase" value={draft.communityPhrase} onChange={(value) => onTextChange('communityPhrase', value)} />
      <button type="submit" className="k-button w-full" disabled={isDisabled}>Guardar textos en Supabase</button>
    </form>
  )
}
