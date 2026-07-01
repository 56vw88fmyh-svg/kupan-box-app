import { AdminSection, SmallRow } from '../AdminUi.jsx'

export function AdminBirthdaysModule({ birthdays, upcomingBirthdays, formatBirthdayDayMonth, onCopyGreeting }) {
  return (
    <AdminSection eyebrow="Cumpleanos" title="Celebraciones KUPAN">
      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Cumpleanos del mes</p>
        <div className="space-y-3">
          {birthdays.map((birthday) => (
            <SmallRow
              key={birthday.profile_id}
              title={birthday.full_name}
              meta={formatBirthdayDayMonth(birthday.birth_day, birthday.birth_month ?? new Date().getMonth() + 1)}
              detail={`${birthday.turning_age ? `Cumple ${birthday.turning_age} · ` : ''}Nivel ${birthday.level}`}
              action={<button type="button" className="k-button-secondary shrink-0 px-3 py-2 text-xs" onClick={() => onCopyGreeting(birthday)}>Copiar saludo</button>}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Proximos 30 dias</p>
        <div className="space-y-3">
          {upcomingBirthdays.map((birthday) => (
            <SmallRow
              key={birthday.profile_id}
              title={birthday.full_name}
              meta={`${formatBirthdayDayMonth(birthday.birth_day, birthday.birth_month)} · faltan ${birthday.days_until} dias`}
              detail={`${birthday.turning_age ? `Cumple ${birthday.turning_age} · ` : ''}${birthday.phone ? `Telefono ${birthday.phone}` : 'Sin telefono registrado'}`}
              action={<button type="button" className="k-button-secondary shrink-0 px-3 py-2 text-xs" onClick={() => onCopyGreeting(birthday)}>Copiar saludo</button>}
            />
          ))}
          {upcomingBirthdays.length === 0 ? (
            <p className="k-panel p-4 text-sm font-bold text-white/60">No hay cumpleanos en los proximos 30 dias.</p>
          ) : null}
        </div>
      </div>
    </AdminSection>
  )
}
