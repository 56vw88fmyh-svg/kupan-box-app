import { AdminWodForm } from '../forms/AdminWodForm.jsx'
import { AdminSection, SmallRow } from '../AdminUi.jsx'

function formatStoredDraftTime(savedAt) {
  if (!savedAt) return 'hora no disponible'

  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(savedAt))
  } catch {
    return 'hora no disponible'
  }
}

export function AdminWodModule({
  draft,
  wodItems,
  onDraftChange,
  onSave,
  formatDate,
  isSaving = false,
  draftRecovery = null,
}) {
  const recoveryStatusLabel = draftRecovery?.status === 'potentially_old'
    ? 'Puede ser anterior al WOD remoto.'
    : draftRecovery?.status === 'potentially_newer'
      ? 'Puede tener cambios más recientes que el WOD remoto.'
      : 'Está guardado solo en este dispositivo.'

  return (
    <AdminSection eyebrow="WOD" title="Programacion diaria">
      {draftRecovery?.hasStoredDraft ? (
        <div className="rounded-xl border border-kupan-flame/30 bg-kupan-flame/10 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Borrador local disponible</p>
              <p className="mt-1 text-sm font-bold leading-6 text-white/70">
                Hay un WOD no publicado guardado en este dispositivo para {formatDate(draftRecovery.metadata?.date)}.
                Último respaldo: {formatStoredDraftTime(draftRecovery.metadata?.savedAt)}.
                {' '}{recoveryStatusLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="k-button-secondary min-h-11 px-4" onClick={draftRecovery.onRecover}>
                Recuperar
              </button>
              <button type="button" className="k-button-secondary min-h-11 px-4" onClick={draftRecovery.onDiscard}>
                Descartar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {draftRecovery?.isDirty ? (
        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold leading-5 text-white/60">
            Tienes cambios locales sin publicar. Se respaldan en este dispositivo para evitar pérdida accidental.
          </p>
          <button type="button" className="k-button-secondary min-h-10 shrink-0 px-4 text-xs" onClick={draftRecovery.onSaveLocal}>
            Guardar borrador local
          </button>
        </div>
      ) : null}
      {draftRecovery?.storageError ? (
        <p className="rounded-xl border border-kupan-warning/30 bg-kupan-warning/10 p-3 text-xs font-bold leading-5 text-white/70">
          No pudimos guardar el borrador local en este dispositivo. Puedes seguir editando y guardar el WOD en Supabase.
        </p>
      ) : null}
      <AdminWodForm draft={draft} onDraftChange={onDraftChange} onSubmit={onSave} isSubmitting={isSaving} />
      {wodItems.map((item) => (
        <SmallRow key={item.id} title={item.title || 'WOD KUPAN'} meta={formatDate(item.date)} detail={item.time_cap || item.workout} />
      ))}
    </AdminSection>
  )
}
