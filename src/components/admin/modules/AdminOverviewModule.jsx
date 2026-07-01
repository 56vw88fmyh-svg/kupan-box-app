import {
  AdminAlertCard,
  AdminClassCard,
  AdminRecentActivity,
  AdminStatCard,
  AdminStudentCard,
} from '../AdminDashboard.jsx'
import { getMembershipTokens } from '../../../utils/adminMetrics.js'

export function AdminOverviewModule({
  dashboardValues,
  dataStatus,
  totals,
  todayClasses,
  pendingAlerts,
  upcomingExpirations,
  recentActivity,
  featuredStudents,
  activeMembershipByProfile,
  onNavigate,
  onDismissAlert,
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard label="Alumnos activos" value={dashboardValues.activeStudents} detail={dashboardValues.totalStudents} status={dataStatus.profiles ? 'attention' : 'normal'} onClick={() => onNavigate({ id: 'students' })} />
        <AdminStatCard label="Reservas de hoy" value={dashboardValues.todayReservations} detail={dashboardValues.todayClasses} status={dataStatus.reservations ? 'attention' : 'normal'} onClick={() => onNavigate({ id: 'reservations' })} />
        <AdminStatCard label="Ocupación semanal" value={dashboardValues.weeklyOccupancy} detail="Según reservas futuras" status={dataStatus.reservations || dataStatus.schedule ? 'attention' : 'normal'} onClick={() => onNavigate({ id: 'reservations' })} />
        <AdminStatCard label="Planes vencidos" value={dashboardValues.expiredMemberships} status={dataStatus.memberships ? 'attention' : totals.expiredMemberships > 0 ? 'critical' : 'normal'} detail="Revisar renovaciones" onClick={() => onNavigate({ id: 'memberships', target: 'membership-history' })} />
        <AdminStatCard label="Próximos vencimientos" value={dashboardValues.upcomingExpirations} status={dataStatus.memberships ? 'attention' : upcomingExpirations.length > 0 ? 'attention' : 'normal'} detail="10 días o menos" onClick={() => onNavigate({ id: 'memberships', target: 'membership-history' })} />
        <AdminStatCard label="Nuevos del mes" value={dashboardValues.newStudentsThisMonth} detail="Alumnos creados" status={dataStatus.profiles ? 'attention' : 'normal'} onClick={() => onNavigate({ id: 'students' })} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="k-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Hoy en KUPAN</p>
              <h3 className="mt-1 text-2xl font-black uppercase text-white">Clases del día</h3>
            </div>
            <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onNavigate({ id: 'reservations' })}>Ver agenda</button>
          </div>
          <div className="grid gap-3">
            {todayClasses?.map((classItem) => (
              <AdminClassCard key={classItem.id} classItem={classItem} onAction={onNavigate} />
            ))}
            {todayClasses === null ? (
              <p className="rounded-xl border border-kupan-warning/35 bg-kupan-warning/10 p-4 text-sm font-bold leading-6 text-white/72">
                No pudimos cargar clases o reservas desde Supabase. Presiona Actualizar datos para reintentar.
              </p>
            ) : null}
            {todayClasses?.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold leading-6 text-white/62">
                No hay clases activas configuradas para hoy. Revisa horarios base si necesitas crear una clase.
              </p>
            ) : null}
          </div>
        </div>

        <div className="k-card p-4">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Pendientes</p>
            <h3 className="mt-1 text-2xl font-black uppercase text-white">Acciones recomendadas</h3>
          </div>
          <div className="grid gap-3">
            {pendingAlerts.map((alert) => (
              <AdminAlertCard
                key={alert.id}
                alert={alert}
                onAction={onNavigate}
                onDismiss={onDismissAlert}
              />
            ))}
            {pendingAlerts.length === 0 ? (
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm font-bold leading-6 text-white/72">
                Sin pendientes urgentes. La jornada se ve ordenada.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="k-card p-4 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Próximos vencimientos</p>
              <h3 className="mt-1 text-2xl font-black uppercase text-white">Planes a revisar</h3>
            </div>
            <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onNavigate({ id: 'memberships', target: 'membership-history' })}>Detalle</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {upcomingExpirations.map((membership) => {
              const tokens = getMembershipTokens(membership)
              return (
                <AdminStudentCard
                  key={membership.id}
                  student={membership.profile ?? { full_name: 'Alumno KUPAN', email: '' }}
                  membership={membership}
                  tokens={tokens}
                  onAction={onNavigate}
                />
              )
            })}
            {upcomingExpirations.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold leading-6 text-white/62 md:col-span-2">
                No hay vencimientos cercanos en los próximos 10 días.
              </p>
            ) : null}
          </div>
        </div>

        <div className="k-card p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Actividad reciente</p>
          <h3 className="mt-1 text-2xl font-black uppercase text-white">Últimos movimientos</h3>
          <div className="mt-4">
            <AdminRecentActivity items={recentActivity} />
          </div>
        </div>
      </section>

      <section className="k-card p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Alumnos</p>
            <h3 className="mt-1 text-2xl font-black uppercase text-white">Acceso rápido</h3>
          </div>
          <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onNavigate({ id: 'students' })}>Ver todos</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {featuredStudents.map((student) => {
            const membership = activeMembershipByProfile.get(student.id)
            return (
              <AdminStudentCard
                key={student.id}
                student={student}
                membership={membership}
                tokens={membership ? getMembershipTokens(membership) : null}
                onAction={onNavigate}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}
