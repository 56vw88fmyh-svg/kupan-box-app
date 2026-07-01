import { Field, SelectField, TextArea, ToggleField } from '../AdminUi.jsx'

export function AdminManualReservationForm({
  formRef,
  draft,
  scheduleItems,
  students,
  selectedProfile,
  selectedMembership,
  selectedTokens,
  isSubmitting = false,
  disabled = false,
  onDraftChange,
  onSubmit,
  toTime,
}) {
  const isDisabled = disabled || isSubmitting

  return (
    <form ref={formRef} className="k-panel grid scroll-mt-28 gap-3 p-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <div className="sm:col-span-2">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Agregar alumno a clase</p>
        <p className="mt-1 text-sm leading-6 text-white/60">
          Toma reserva por un alumno desde el box. Si tiene plan activo se descuenta token; si es Full no descuenta.
        </p>
      </div>
      <Field
        label="Fecha"
        type="date"
        required
        value={draft.reservation_date}
        onChange={(value) => onDraftChange((current) => ({ ...current, reservation_date: value }))}
      />
      <SelectField
        label="Horario / clase"
        value={draft.class_schedule_id}
        onChange={(value) => onDraftChange((current) => ({ ...current, class_schedule_id: value }))}
      >
        <option className="bg-kupan-black" value="">Seleccionar clase</option>
        {scheduleItems.filter((classItem) => classItem.active).map((classItem) => (
          <option key={classItem.id} className="bg-kupan-black" value={classItem.id}>
            Dia {classItem.day_of_week} · {toTime(classItem.time)} · {classItem.class_name}
          </option>
        ))}
      </SelectField>
      <Field
        label="Buscar alumno"
        value={draft.student_query}
        onChange={(value) => onDraftChange((current) => ({ ...current, student_query: value }))}
      />
      <SelectField
        label="Alumno"
        value={draft.profile_id}
        onChange={(value) => onDraftChange((current) => ({ ...current, profile_id: value }))}
      >
        <option className="bg-kupan-black" value="">Seleccionar alumno</option>
        {students.map((profile) => (
          <option key={profile.id} className="bg-kupan-black" value={profile.id}>
            {profile.full_name} · {profile.email}
          </option>
        ))}
      </SelectField>
      <div className="rounded-lg border border-white/10 bg-black/25 p-4 sm:col-span-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Estado del alumno</p>
        {selectedProfile ? (
          <p className="mt-2 text-sm font-bold leading-6 text-white/70">
            {selectedProfile.full_name} · {selectedMembership ? `plan ${selectedMembership.plan?.name ?? 'activo'} · tokens ${selectedTokens?.used}/${selectedTokens?.total} · disponibles ${selectedTokens?.remaining}` : 'sin plan activo'}
          </p>
        ) : (
          <p className="mt-2 text-sm font-bold leading-6 text-white/60">Busca y selecciona un alumno para revisar su plan.</p>
        )}
      </div>
      <div className="sm:col-span-2">
        <TextArea
          label="Nota opcional"
          rows={3}
          value={draft.note}
          onChange={(value) => onDraftChange((current) => ({ ...current, note: value }))}
        />
      </div>
      <ToggleField
        label="Permitir sin plan activo"
        checked={draft.allow_without_membership}
        onChange={(value) => onDraftChange((current) => ({ ...current, allow_without_membership: value }))}
      />
      <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-xs font-bold leading-5 text-white/55">
        Sobrecupo queda desactivado por ahora. Si la clase esta completa, Supabase bloqueara la reserva.
      </div>
      <button type="submit" className="k-button sm:col-span-2" disabled={isDisabled}>
        {isSubmitting ? 'Agregando...' : 'Agregar a clase'}
      </button>
    </form>
  )
}
