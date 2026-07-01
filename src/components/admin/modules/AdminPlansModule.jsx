import { AdminPlanForm } from '../forms/AdminPlanForm.jsx'
import { AdminSection, SmallRow } from '../AdminUi.jsx'

export function AdminPlansModule({ draft, plans, onDraftChange, onSave, onEdit, onToggle, formatMoney, isSaving = false }) {
  return (
    <AdminSection eyebrow="Planes" title="Planes y precios">
      <AdminPlanForm draft={draft} onDraftChange={onDraftChange} onSubmit={onSave} isSubmitting={isSaving} />
      {plans.map((plan) => (
        <SmallRow
          key={plan.id}
          title={`${plan.name} · ${formatMoney(plan.price)}`}
          meta={plan.active ? 'Activo' : 'Inactivo'}
          detail={plan.is_unlimited ? 'Clases ilimitadas' : `${plan.classes_per_week ?? 'Sin'} clases por semana`}
          action={(
            <div className="grid shrink-0 gap-2">
              <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onEdit(plan)}>Editar</button>
              <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onToggle(plan)}>{plan.active ? 'Desactivar' : 'Activar'}</button>
            </div>
          )}
        />
      ))}
    </AdminSection>
  )
}
