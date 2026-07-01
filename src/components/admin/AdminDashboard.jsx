function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function AdminPageHeader({ dateLabel, greeting, status, onAction }) {
  const actions = [
    { id: 'wod', label: 'Crear WOD', icon: 'WD', target: { id: 'wod' } },
    { id: 'class', label: 'Crear clase', icon: 'CL', target: { id: 'schedule' } },
    { id: 'payment', label: 'Registrar pago', icon: 'PG', target: { id: 'memberships', target: 'membership-activate' } },
    { id: 'student', label: 'Buscar alumno', icon: 'AL', target: { id: 'students' } },
  ]

  return (
    <section className="k-card p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-kupan-flame">Panel KUPAN</p>
          <h2 className="mt-2 text-3xl font-black uppercase leading-none text-white sm:text-4xl">Panel Kupan</h2>
          <p className="mt-3 text-base font-bold leading-7 text-white/72">{greeting}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase text-white">
              {dateLabel}
            </p>
            <p className="rounded-xl border border-kupan-ember/30 bg-kupan-ember/10 px-4 py-3 text-sm font-bold leading-5 text-white">
              {status}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[28rem] lg:grid-cols-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={cn(
                'flex min-h-12 items-center gap-2 rounded-xl px-3 text-left text-xs font-black uppercase tracking-[0.08em] transition active:scale-[0.98]',
                action.id === 'student'
                  ? 'bg-kupan-ember text-white shadow-glow'
                  : 'border border-white/10 bg-white/10 text-white/78 hover:bg-white/15 hover:text-white',
              )}
              onClick={() => onAction(action.target)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/25 text-[0.62rem]">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export function AdminStatCard({ label, value, detail, status = 'normal', onClick }) {
  const statusClass = {
    normal: 'border-white/10 bg-white/[0.04]',
    attention: 'border-kupan-warning/35 bg-kupan-warning/10',
    critical: 'border-kupan-red/40 bg-kupan-red/10',
    success: 'border-emerald-400/30 bg-emerald-400/10',
  }[status] ?? 'border-white/10 bg-white/[0.04]'

  const Component = onClick ? 'button' : 'article'

  return (
    <Component
      type={onClick ? 'button' : undefined}
      className={cn('rounded-xl border p-4 text-left transition', statusClass, onClick ? 'hover:-translate-y-0.5 hover:border-kupan-ember/50' : '')}
      onClick={onClick}
    >
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/70">{label}</p>
      {detail ? <p className="mt-2 text-sm font-bold leading-5 text-white/58">{detail}</p> : null}
    </Component>
  )
}

export function AdminAlertCard({ alert, onAction, onDismiss }) {
  const tone = {
    high: 'border-kupan-red/40 bg-kupan-red/10',
    medium: 'border-kupan-warning/35 bg-kupan-warning/10',
    low: 'border-white/10 bg-white/[0.04]',
  }[alert.priority] ?? 'border-white/10 bg-white/[0.04]'

  return (
    <article className={cn('rounded-xl border p-4', tone)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/58">{alert.label}</p>
          <h4 className="mt-2 text-base font-black uppercase leading-tight text-white">{alert.title}</h4>
          <p className="mt-2 text-sm font-bold leading-6 text-white/68">{alert.description}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[0.62rem] font-black uppercase text-white/70">
          {alert.priorityLabel}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" onClick={() => onAction(alert.target)}>
          Resolver
        </button>
        {onDismiss ? (
          <button type="button" className="min-h-11 rounded-lg px-3 py-2 text-xs font-black uppercase text-white/58" onClick={() => onDismiss(alert.id)}>
            Descartar
          </button>
        ) : null}
      </div>
    </article>
  )
}

export function AdminClassCard({ classItem, onAction }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-white">{classItem.time}</p>
          <h4 className="mt-2 text-lg font-black uppercase leading-tight text-white">{classItem.name}</h4>
          <p className="mt-1 text-sm font-bold leading-5 text-white/62">Coach {classItem.coach}</p>
        </div>
        <span className={cn(
          'rounded-full border px-3 py-1 text-[0.62rem] font-black uppercase',
          classItem.status === 'Completa'
            ? 'border-kupan-red/40 bg-kupan-red/10 text-white'
            : classItem.status === 'Alta ocupación'
              ? 'border-kupan-warning/35 bg-kupan-warning/10 text-white'
              : 'border-emerald-400/30 bg-emerald-400/10 text-white',
        )}
        >
          {classItem.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/10 bg-black/25 p-3">
          <p className="text-[0.62rem] font-black uppercase text-white/50">Reservas</p>
          <p className="mt-1 text-base font-black text-white">{classItem.reserved}/{classItem.maxSpots}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-3">
          <p className="text-[0.62rem] font-black uppercase text-white/50">Asistencia</p>
          <p className="mt-1 text-base font-black text-white">{classItem.attended}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-3">
          <p className="text-[0.62rem] font-black uppercase text-white/50">WOD</p>
          <p className="mt-1 text-base font-black text-white">{classItem.wodStatus}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" className="k-button min-h-11 px-3 py-2 text-xs" onClick={() => onAction({ id: 'reservations' })}>Ver alumnos</button>
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" onClick={() => onAction({ id: 'reservations' })}>Asistencia</button>
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" onClick={() => onAction({ id: 'schedule' })}>Editar</button>
      </div>
    </article>
  )
}

export function AdminStudentCard({ student, membership, tokens, onAction }) {
  const hasActivePlan = Boolean(membership?.status === 'active')
  const remaining = tokens?.remaining ?? 'Sin plan'

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words text-base font-black uppercase text-white">{student.full_name}</h4>
          <p className="mt-1 break-words text-sm font-bold leading-5 text-white/60">{student.email}</p>
          {student.phone ? <p className="mt-1 text-sm font-bold text-white/50">{student.phone}</p> : null}
        </div>
        <span className={cn(
          'shrink-0 rounded-full border px-2 py-1 text-[0.62rem] font-black uppercase',
          hasActivePlan ? 'border-emerald-400/30 bg-emerald-400/10 text-white' : 'border-white/10 bg-white/10 text-white/70',
        )}
        >
          {hasActivePlan ? 'Plan activo' : 'Sin plan'}
        </span>
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3 text-sm font-bold leading-6 text-white/64">
        {membership ? `${membership.plan?.name ?? 'Plan KUPAN'} · vence ${membership.end_date ?? 'sin fecha'} · tokens ${remaining}` : 'Sin membresía activa registrada.'}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" onClick={() => onAction({ id: 'memberships', target: 'membership-activate' })}>Renovar</button>
        <button type="button" className="k-button-secondary min-h-11 px-3 py-2 text-xs" onClick={() => onAction({ id: 'reservations', target: 'manual-reservation' })}>Reservar</button>
      </div>
    </article>
  )
}

export function AdminRecentActivity({ items }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold leading-6 text-white/62">
        Aún no hay actividad reciente para mostrar.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/52">{item.type}</p>
          <h4 className="mt-2 text-sm font-black uppercase leading-tight text-white">{item.title}</h4>
          <p className="mt-1 text-sm font-bold leading-5 text-white/62">{item.detail}</p>
        </article>
      ))}
    </div>
  )
}

export function AdminMobileModuleNav({ modules, activeModuleId, onNavigate }) {
  const primary = modules.slice(0, 4)
  const secondary = modules.slice(4)

  return (
    <div className="fixed inset-x-2 bottom-[calc(5.65rem+env(safe-area-inset-bottom))] z-30 lg:hidden">
      <div className="rounded-2xl border border-white/10 bg-kupan-black/95 p-2 shadow-2xl backdrop-blur-2xl">
        <div className="grid grid-cols-5 gap-1">
          {primary.map((module) => (
            <button
              key={module.id}
              type="button"
              className={cn(
                'min-h-12 rounded-xl px-1 text-[0.58rem] font-black uppercase leading-4 transition',
                activeModuleId === module.id ? 'bg-kupan-ember text-white shadow-glow' : 'bg-white/10 text-white/68',
              )}
              onClick={() => onNavigate(module.items[0])}
            >
              {module.shortLabel ?? module.label}
            </button>
          ))}
          <details className="relative">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center rounded-xl bg-white/10 px-1 text-[0.58rem] font-black uppercase leading-4 text-white/68">
              Más
            </summary>
            <div className="absolute bottom-full right-0 mb-2 grid w-56 gap-1 rounded-xl border border-white/10 bg-kupan-gray p-2 shadow-2xl">
              {secondary.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  className={cn(
                    'min-h-11 rounded-lg px-3 text-left text-xs font-black uppercase',
                    activeModuleId === module.id ? 'bg-kupan-ember text-white' : 'bg-white/10 text-white/75',
                  )}
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open')
                    onNavigate(module.items[0])
                  }}
                >
                  {module.label}
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
