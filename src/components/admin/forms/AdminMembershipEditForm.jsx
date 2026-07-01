import { Field, SelectField } from '../AdminUi.jsx'

export function AdminMembershipEditForm({
  formRef,
  draft,
  plans,
  onDraftChange,
  onSubmit,
  onClose,
  addDays,
  getPlanTokenTotal,
  isSubmitting = false,
  disabled = false,
}) {
  const isDisabled = disabled || isSubmitting

  return (
    <form ref={formRef} className="k-panel grid scroll-mt-28 gap-3 border-kupan-ember/40 bg-kupan-ember/10 p-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <div className="sm:col-span-2">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Editar membresia</p>
        <p className="mt-1 text-sm leading-6 text-white/60">Cambia plan, pausa, cancela, reactiva, extiende vencimiento o actualiza observaciones.</p>
      </div>
      <SelectField label="Plan" value={draft.plan_id} onChange={(value) => {
        const nextPlan = plans.find((plan) => plan.id === value)
        onDraftChange((current) => ({
          ...current,
          plan_id: value,
          classes_total: nextPlan?.is_unlimited ? '' : getPlanTokenTotal(nextPlan),
          classes_used: nextPlan?.is_unlimited ? 0 : current.classes_used,
        }))
      }}>
        {plans.map((plan) => <option key={plan.id} className="bg-kupan-black" value={plan.id}>{plan.name}</option>)}
      </SelectField>
      <SelectField label="Estado" value={draft.status} onChange={(value) => onDraftChange((current) => ({ ...current, status: value }))}>
        {['active', 'expired', 'paused', 'cancelled'].map((status) => <option key={status} className="bg-kupan-black" value={status}>{status}</option>)}
      </SelectField>
      <Field label="Inicio" type="date" value={draft.start_date} required onChange={(value) => onDraftChange((current) => ({ ...current, start_date: value }))} />
      <Field label="Vencimiento" type="date" value={addDays(draft.start_date, 30)} required onChange={() => {}} />
      <Field label="Tokens totales" type="number" value={draft.classes_total} onChange={(value) => onDraftChange((current) => ({ ...current, classes_total: value }))} />
      <Field label="Tokens usados" type="number" value={draft.classes_used} onChange={(value) => onDraftChange((current) => ({ ...current, classes_used: value }))} />
      <SelectField label="Pago" value={draft.payment_status} onChange={(value) => onDraftChange((current) => ({ ...current, payment_status: value }))}>
        {['pending', 'paid', 'failed', 'refunded'].map((status) => <option key={status} className="bg-kupan-black" value={status}>{status}</option>)}
      </SelectField>
      <Field label="Proveedor pago" value={draft.payment_provider} onChange={(value) => onDraftChange((current) => ({ ...current, payment_provider: value }))} />
      <Field label="Referencia pago" value={draft.payment_reference} onChange={(value) => onDraftChange((current) => ({ ...current, payment_reference: value }))} />
      <div className="sm:col-span-2">
        <Field label="Observaciones" value={draft.notes} onChange={(value) => onDraftChange((current) => ({ ...current, notes: value }))} />
      </div>
      <button type="submit" className="k-button" disabled={isDisabled}>Guardar cambios</button>
      <button type="button" className="k-button-secondary" onClick={onClose} disabled={isDisabled}>Cerrar edicion</button>
    </form>
  )
}
