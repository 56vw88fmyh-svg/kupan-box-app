import { AdminScheduleForm } from '../forms/AdminScheduleForm.jsx'
import { AdminSection, SmallRow } from '../AdminUi.jsx'

export function AdminScheduleModule({ draft, scheduleItems, onDraftChange, onSave, onEdit, onToggle, toTime, isSaving = false }) {
  return (
    <AdminSection eyebrow="Horarios" title="Clases del box">
      <AdminScheduleForm draft={draft} onDraftChange={onDraftChange} onSubmit={onSave} isSubmitting={isSaving} />
      {scheduleItems.map((item) => (
        <SmallRow
          key={item.id}
          title={`${item.class_name} · ${toTime(item.time)}`}
          meta={`Dia ${item.day_of_week} · ${item.active ? 'Activo' : 'Inactivo'}`}
          detail={`Coach ${item.coach ?? 'KUPAN'} · ${item.max_spots} cupos`}
          action={(
            <div className="grid shrink-0 gap-2">
              <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onEdit(item)}>Editar</button>
              <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onToggle(item)}>{item.active ? 'Pausar' : 'Activar'}</button>
            </div>
          )}
        />
      ))}
    </AdminSection>
  )
}
