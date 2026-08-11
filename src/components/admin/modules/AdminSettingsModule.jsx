import { AdminSettingsForm } from '../forms/AdminSettingsForm.jsx'
import { AdminSection } from '../AdminUi.jsx'

const policyFields = [
  ['membershipDurationDays', 'Duración del plan', 'días'],
  ['reservationWindowDays', 'Ventana de reservas', 'días'],
  ['reservationClosesMinutes', 'Cierre de reservas', 'minutos antes'],
  ['cancellationRefundMinutes', 'Cancelación con devolución', 'minutos antes'],
  ['arrivalToleranceMinutes', 'Tolerancia de llegada', 'minutos'],
  ['defaultClassCapacity', 'Cupo predeterminado', 'alumnos'],
  ['fullDailyLimit', 'Reservas diarias Full', 'por día'],
]

export function AdminSettingsModule({ textDraft, onTextChange, onSave, policyDraft, onPolicyChange, onSavePolicies, isSaving = false }) {
  return (
    <div className="space-y-5">
      <AdminSection eyebrow="Textos principales" title="Copy compartido">
        <AdminSettingsForm draft={textDraft} onTextChange={onTextChange} onSubmit={onSave} isSubmitting={isSaving} />
      </AdminSection>
      <AdminSection eyebrow="Reglas operativas" title="Políticas configurables">
        <form className="k-panel space-y-4 p-4" onSubmit={onSavePolicies}>
          <p className="text-sm leading-6 text-text-secondary">Estos valores se aplican del lado servidor a reservas, cancelaciones y operación diaria.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {policyFields.map(([key, label, suffix]) => (
              <label key={key} className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-text-muted">{label}</span>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-kupan-border bg-black/30 px-3">
                  <input className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-black text-white outline-none" type="number" min="1" value={policyDraft[key]} onChange={(event) => onPolicyChange(key, event.target.value)} />
                  <span className="text-xs font-bold text-text-muted">{suffix}</span>
                </div>
              </label>
            ))}
          </div>
          <button type="submit" className="k-button w-full" disabled={isSaving}>Guardar políticas</button>
        </form>
      </AdminSection>
    </div>
  )
}
