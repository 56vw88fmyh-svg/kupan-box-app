import { Field, SelectField, TextArea } from '../AdminUi.jsx'

export function AdminCreateStudentForm({
  draft,
  plans,
  onDraftChange,
  onSubmit,
  addDays,
  isSubmitting = false,
  disabled = false,
}) {
  const isDisabled = disabled || isSubmitting

  return (
    <form className="k-panel space-y-4 p-4" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre completo" value={draft.full_name} required onChange={(value) => onDraftChange((current) => ({ ...current, full_name: value }))} />
        <Field label="Email" type="email" value={draft.email} required onChange={(value) => onDraftChange((current) => ({ ...current, email: value }))} />
        <Field label="Fecha de nacimiento" type="date" value={draft.birth_date} required onChange={(value) => onDraftChange((current) => ({ ...current, birth_date: value }))} />
        <Field label="Telefono opcional" type="tel" value={draft.phone} onChange={(value) => onDraftChange((current) => ({ ...current, phone: value }))} />
        <SelectField label="Nivel" value={draft.level} onChange={(value) => onDraftChange((current) => ({ ...current, level: value }))}>
          {['Iniciado', 'Rookie', 'Scaled', 'RX'].map((level) => <option key={level} className="bg-kupan-black" value={level}>{level}</option>)}
        </SelectField>
        <SelectField label="Estado" value={draft.status} onChange={(value) => onDraftChange((current) => ({ ...current, status: value }))}>
          {['active', 'inactive'].map((status) => <option key={status} className="bg-kupan-black" value={status}>{status}</option>)}
        </SelectField>
        <Field label="Contraseña temporal opcional" type="text" value={draft.temporary_password} onChange={(value) => onDraftChange((current) => ({ ...current, temporary_password: value }))} />
        <SelectField label="Plan inicial opcional" value={draft.plan_id} onChange={(value) => onDraftChange((current) => ({ ...current, plan_id: value }))}>
          <option className="bg-kupan-black" value="">Sin plan inicial</option>
          {plans.filter((plan) => plan.active).map((plan) => <option key={plan.id} className="bg-kupan-black" value={plan.id}>{plan.name}</option>)}
        </SelectField>
        <Field label="Inicio plan" type="date" value={draft.membership_start_date} onChange={(value) => onDraftChange((current) => ({ ...current, membership_start_date: value }))} />
        <Field label="Vencimiento plan" type="date" value={draft.membership_start_date ? addDays(draft.membership_start_date, 30) : ''} onChange={() => {}} />
      </div>
      <TextArea label="Observaciones internas" value={draft.internal_notes} onChange={(value) => onDraftChange((current) => ({ ...current, internal_notes: value }))} />
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/60">
        Esta accion llama una Edge Function segura. Las credenciales privadas viven solo en Supabase, nunca en el frontend.
      </div>
      <button type="submit" className="k-button w-full" disabled={isDisabled}>
        {isSubmitting ? 'Creando alumno...' : 'Crear alumno'}
      </button>
    </form>
  )
}
