import { formatRecordValue } from '../../../utils/displayFormats.js'
import { AdminSection, SmallRow } from '../AdminUi.jsx'

export function AdminPersonalRecordsModule({ records, formatDate }) {
  return (
    <AdminSection eyebrow="PR destacados" title="Marcas de la comunidad">
      {records.map((record) => (
        <SmallRow
          key={record.id}
          title={`${record.movement} · ${formatRecordValue(record)}`}
          meta={formatDate(record.record_date)}
          detail={`${record.profile?.full_name ?? 'Atleta KUPAN'}${record.notes ? ` · ${record.notes}` : ''}`}
        />
      ))}
    </AdminSection>
  )
}
