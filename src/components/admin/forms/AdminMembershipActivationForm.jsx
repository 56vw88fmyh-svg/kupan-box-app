import { Field, SelectField } from '../AdminUi.jsx'

export function AdminMembershipActivationForm({
  formRef,
  draft,
  profiles,
  plans,
  selectedMembershipPlan,
  migrationTotalTokens,
  migrationUsedTokens,
  migrationAvailableTokens,
  onDraftChange,
  onSubmit,
  onSimulatePayment,
  addDays,
  getPlanTokenTotal,
  isSavingActivation = false,
  isSimulatingPayment = false,
  disabled = false,
}) {
  const isDisabled = disabled || isSavingActivation || isSimulatingPayment

  return (
    <form ref={formRef} className="k-panel grid scroll-mt-28 gap-3 p-4 outline-none sm:grid-cols-2" onSubmit={onSubmit} tabIndex={-1}>
      <div className="sm:col-span-2">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Activar plan</p>
        <p className="mt-1 text-sm leading-6 text-white/60">Elige alumno, plan e inicio. Antes de guardar verás un resumen completo para confirmar la activación.</p>
      </div>
      <SelectField label="Alumno" value={draft.profile_id} onChange={(value) => onDraftChange((current) => ({ ...current, profile_id: value }))}>
        <option className="bg-kupan-black" value="">Seleccionar alumno</option>
        {profiles.map((profile) => <option key={profile.id} className="bg-kupan-black" value={profile.id}>{profile.full_name}</option>)}
      </SelectField>
      <SelectField label="Plan" value={draft.plan_id} onChange={(value) => {
        const selectedPlan = plans.find((plan) => plan.id === value)
        onDraftChange((current) => ({ ...current, plan_id: value, classes_total: getPlanTokenTotal(selectedPlan), classes_used: '' }))
      }}>
        <option className="bg-kupan-black" value="">Seleccionar plan</option>
        {plans.map((plan) => <option key={plan.id} className="bg-kupan-black" value={plan.id}>{plan.name}</option>)}
      </SelectField>
      <Field label="Fecha de inicio" type="date" value={draft.start_date} required onChange={(value) => onDraftChange((current) => ({ ...current, start_date: value, end_date: addDays(value, 30) }))} />
      <Field label="Fecha de término" type="date" value={addDays(draft.start_date, 30)} required readOnly onChange={() => {}} />
      <div className="rounded-lg border border-white/10 bg-black/30 p-4 sm:col-span-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Resumen del nuevo ciclo</p>
        <p className="mt-2 text-sm font-bold leading-6 text-white/70">
          Tokens del plan: {selectedMembershipPlan?.is_unlimited ? 'Ilimitado' : migrationTotalTokens || 0} · Tokens ya usados: {migrationUsedTokens} · Disponibles al activar: {migrationAvailableTokens}
        </p>
      </div>

      <details className="rounded-xl border border-white/10 bg-white/[0.03] sm:col-span-2">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-xs font-black uppercase text-white/75">
          Opciones avanzadas
          <span aria-hidden="true">›</span>
        </summary>
        <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2">
          <Field label="Tokens del plan" type="number" value={draft.classes_total} onChange={(value) => onDraftChange((current) => ({ ...current, classes_total: value }))} />
          <Field label="Tokens ya usados" type="number" value={selectedMembershipPlan?.is_unlimited ? '0' : draft.classes_used} onChange={(value) => onDraftChange((current) => ({ ...current, classes_used: value }))} />
          <Field label="Proveedor de pago" value={draft.payment_provider} onChange={(value) => onDraftChange((current) => ({ ...current, payment_provider: value }))} />
          <Field label="Referencia de pago" value={draft.payment_reference} onChange={(value) => onDraftChange((current) => ({ ...current, payment_reference: value }))} />
          <div className="sm:col-span-2">
            <Field label="Notas" value={draft.notes} onChange={(value) => onDraftChange((current) => ({ ...current, notes: value }))} />
          </div>
          <p className="text-xs leading-5 text-white/45 sm:col-span-2">
            Usa los tokens ya usados solo al migrar a un alumno que comenzó su ciclo fuera de la app.
          </p>
          <button type="button" className="k-button-secondary sm:col-span-2" onClick={onSimulatePayment} disabled={isDisabled}>
            {isSimulatingPayment ? 'Simulando pago...' : 'Revisar pago aprobado de prueba'}
          </button>
        </div>
      </details>
      <button type="submit" className="k-button sm:col-span-2" disabled={isDisabled}>
        {isSavingActivation ? 'Activando plan...' : 'Revisar y activar plan'}
      </button>
    </form>
  )
}
