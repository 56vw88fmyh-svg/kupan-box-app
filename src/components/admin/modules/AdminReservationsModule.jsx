import { AdminManualReservationForm } from '../forms/AdminManualReservationForm.jsx'
import { AdminSection, SmallRow } from '../AdminUi.jsx'

export function AdminReservationsModule({
  formRef,
  draft,
  scheduleItems,
  reservations,
  students,
  selectedProfile,
  selectedMembership,
  selectedTokens,
  isSaving,
  onDraftChange,
  onSave,
  onUpdateStatus,
  formatDate,
  toTime,
}) {
  return (
    <AdminSection eyebrow="Reservas" title="Reservas activas">
      <AdminManualReservationForm
        formRef={formRef}
        draft={draft}
        scheduleItems={scheduleItems}
        students={students}
        selectedProfile={selectedProfile}
        selectedMembership={selectedMembership}
        selectedTokens={selectedTokens}
        isSubmitting={isSaving}
        onDraftChange={onDraftChange}
        onSubmit={onSave}
        toTime={toTime}
      />

      {reservations.map((reservation) => {
        const isAttended = reservation.status === 'attended'
        const isNoShow = reservation.status === 'no_show'
        const isCancelled = reservation.status === 'cancelled'

        return (
          <SmallRow
            key={reservation.id}
            title={`${reservation.class_schedule?.class_name ?? 'Clase'} · ${toTime(reservation.class_schedule?.time)}`}
            meta={`${formatDate(reservation.reservation_date)} · ${reservation.status}`}
            detail={`${reservation.profile?.full_name ?? 'Alumno'} · Coach ${reservation.class_schedule?.coach ?? 'KUPAN'} · token ${reservation.token_charged ? 'cobrado' : 'no descuenta'}${reservation.notes ? ` · ${reservation.notes}` : ''}`}
            action={(
              <div className="grid shrink-0 gap-2">
                <button
                  type="button"
                  className={`k-button-secondary px-3 py-2 text-xs ${isAttended ? 'border-emerald-400/40 bg-emerald-400/15 text-white' : ''}`}
                  disabled={isAttended || isCancelled}
                  onClick={() => onUpdateStatus(reservation.id, 'attended')}
                >
                  {isAttended ? 'Asistencia OK' : 'Asistio'}
                </button>
                <button
                  type="button"
                  className={`k-button-secondary px-3 py-2 text-xs ${isNoShow ? 'border-kupan-flame/40 bg-kupan-flame/15 text-white' : ''}`}
                  disabled={isNoShow || isCancelled}
                  onClick={() => onUpdateStatus(reservation.id, 'no_show')}
                >
                  {isNoShow ? 'No show OK' : 'No show'}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-kupan-red/40 bg-kupan-red/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"
                  disabled={isAttended || isNoShow || isCancelled}
                  onClick={() => onUpdateStatus(reservation.id, 'cancelled')}
                >
                  Cancelar
                </button>
              </div>
            )}
          />
        )
      })}
    </AdminSection>
  )
}
