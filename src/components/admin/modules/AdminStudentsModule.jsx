import { AdminSection, SmallRow } from '../AdminUi.jsx'

export function AdminStudentsModule({ profiles, onManagePassword }) {
  return (
    <AdminSection eyebrow="Alumnos" title="Perfiles registrados">
      {profiles.length === 0 ? (
        <SmallRow title="Sin resultados" meta="Filtro activo" detail="No encontramos alumnos con esa busqueda o filtro." />
      ) : null}
      {profiles.map((student) => (
        <article key={student.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_34px_rgba(0,0,0,0.28)] sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-kupan-flame/30 bg-kupan-flame/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-kupan-flame">
              {student.level ?? 'Sin nivel'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/65">
              {student.status ?? 'Sin estado'}
            </span>
          </div>

          <div className="mt-4 min-w-0">
            <h3 className="text-[clamp(1.16rem,5vw,1.65rem)] font-black uppercase leading-tight text-white [overflow-wrap:anywhere]">
              {student.full_name || 'Alumno KUPAN'}
            </h3>
            <div className="mt-2 space-y-1 text-sm font-semibold leading-5 text-white/60">
              <p className="break-all">{student.email || 'Sin correo registrado'}</p>
              <p>{student.phone || 'Sin teléfono registrado'}</p>
            </div>
          </div>

          {onManagePassword && student.role === 'student' ? (
            <div className="mt-4 flex justify-start sm:justify-end">
              <button
                type="button"
                className="inline-flex min-h-10 w-fit max-w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[0.72rem] font-black uppercase tracking-[0.06em] text-white transition hover:border-kupan-flame/80 hover:bg-kupan-flame/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kupan-flame sm:px-4 sm:text-[0.78rem]"
                onClick={() => onManagePassword(student)}
              >
                Gestionar contraseña
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </AdminSection>
  )
}
