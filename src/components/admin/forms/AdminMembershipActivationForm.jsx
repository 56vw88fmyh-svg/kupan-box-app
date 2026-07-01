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
  isSubmitting = false,
  disabled = false,
}) {
  const isDisabled = disabled || isSubmitting

  return (
    <form ref={formRef} className="k-panel grid scroll-mt-28 gap-3 p-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <div className="sm:col-span-2">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Activar plan</p>
        <p className="mt-1 text-sm leading-6 text-white/60">Los planes duran 30 dias. Al activar una membresia, cualquier plan activo anterior del alumno pasa a historial como expired.</p>
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
      <Field label="Inicio" type="date" value={draft.start_date} required onChange={(value) => onDraftChange((current) => ({ ...current, start_date: value, end_date: current.end_date || addDays(value, 30) }))} />
      <Field label="Vencimiento" type="date" value={addDays(draft.start_date, 30)} required onChange={() => {}} />
      <Field label="Tokens del plan" type="number" value={draft.classes_total} onChange={(value) => onDraftChange((current) => ({ ...current, classes_total: value }))} />
      <Field label="Tokens ya usados" type="number" value={selectedMembershipPlan?.is_unlimited ? '0' : draft.classes_used} onChange={(value) => onDraftChange((current) => ({ ...current, classes_used: value }))} />
      <Field label="Proveedor pago" value={draft.payment_provider} onChange={(value) => onDraftChange((current) => ({ ...current, payment_provider: value }))} />
      <Field label="Referencia pago" value={draft.payment_reference} onChange={(value) => onDraftChange((current) => ({ ...current, payment_reference: value }))} />
      <Field label="Notas" value={draft.notes} onChange={(value) => onDraftChange((current) => ({ ...current, notes: value }))} />
      <div className="rounded-lg border border-white/10 bg-black/30 p-4 sm:col-span-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Activar con tokens ya usados</p>
        <p className="mt-2 text-sm font-bold leading-6 text-white/70">
          Tokens del plan: {selectedMembershipPlan?.is_unlimited ? 'Ilimitado' : migrationTotalTokens || 0} · Tokens ya usados: {migrationUsedTokens} · Disponibles al activar: {migrationAvailableTokens}
        </p>
        <p className="mt-1 text-xs leading-5 text-white/45">
          Si el alumno venia entrenando antes de usar la app, registra aqui sus clases usadas. Quedara un movimiento en el historial.
        </p>
      </div>
      <button type="submit" className="k-button sm:col-span-2" disabled={isDisabled}>Activar con tokens ya usados</button>
      <button type="button" className="k-button-secondary sm:col-span-2" onClick={onSimulatePayment} disabled={isDisabled}>
        Simular pago aprobado
      </button>
    </form>
  )
}
