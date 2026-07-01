import { AdminSettingsForm } from '../forms/AdminSettingsForm.jsx'
import { AdminSection } from '../AdminUi.jsx'

export function AdminSettingsModule({ textDraft, onTextChange, onSave, isSaving = false }) {
  return (
    <AdminSection eyebrow="Textos principales" title="Copy compartido">
      <AdminSettingsForm draft={textDraft} onTextChange={onTextChange} onSubmit={onSave} isSubmitting={isSaving} />
    </AdminSection>
  )
}
