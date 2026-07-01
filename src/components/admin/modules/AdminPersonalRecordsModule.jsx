import { AdminSection, SmallRow } from '../AdminUi.jsx'

export function AdminPersonalRecordsModule({ records, formatDate }) {
  return (
    <AdminSection eyebrow="PR destacados" title="Marcas de la comunidad">
      {records.map((record) => (
        <SmallRow
          key={record.id}
          title={`${record.movement} · ${record.value} ${record.unit}`}
          meta={formatDate(record.record_date)}
          detail={`${record.profile?.full_name ?? 'Atleta KUPAN'}${record.notes ? ` · ${record.notes}` : ''}`}
        />
      ))}
    </AdminSection>
  )
}
