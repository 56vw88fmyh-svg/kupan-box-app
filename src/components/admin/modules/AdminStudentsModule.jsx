import { AdminSection, SmallRow } from '../AdminUi.jsx'
import { Button } from '../../ui/index.js'

export function AdminStudentsModule({ profiles, onManagePassword }) {
  return (
    <AdminSection eyebrow="Alumnos" title="Perfiles registrados">
      {profiles.length === 0 ? (
        <SmallRow title="Sin resultados" meta="Filtro activo" detail="No encontramos alumnos con esa busqueda o filtro." />
      ) : null}
      {profiles.map((student) => (
        <SmallRow
          key={student.id}
          title={student.full_name}
          meta={`${student.level} · ${student.status}`}
          detail={`${student.email}${student.phone ? ` · ${student.phone}` : ''}`}
          action={onManagePassword ? (
            <Button size="sm" type="button" variant="secondary" onClick={() => onManagePassword(student)}>
              Gestionar contraseña
            </Button>
          ) : null}
        />
      ))}
    </AdminSection>
  )
}
