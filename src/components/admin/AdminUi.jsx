import { SectionTitle } from '../SectionTitle.jsx'

export function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-white/60">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
        type={type}
        value={value ?? ''}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function TextArea({ label, value, onChange, rows = 4 }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-white/60">{label}</span>
      <textarea
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold leading-6 text-white outline-none transition focus:border-kupan-ember"
        rows={rows}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-white/60">{label}</span>
      <select
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

export function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2">
      <span className="text-xs font-black uppercase text-white/60">{label}</span>
      <input
        className="h-5 w-5 accent-kupan-ember"
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

export function AdminSection({ title, eyebrow, children }) {
  return (
    <section className="k-card p-5">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function SmallRow({ title, meta, detail, action }) {
  return (
    <article className="k-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">{meta}</p>
          <h3 className="mt-2 break-words text-lg font-black uppercase text-white">{title}</h3>
          {detail ? <p className="mt-1 text-sm leading-6 text-white/60">{detail}</p> : null}
        </div>
        {action}
      </div>
    </article>
  )
}

export function AdminSidebar({ modules, openModules, onToggleModule, activeSection, activeModuleId, onNavigate, isCollapsed, onToggleCollapse }) {
  return (
    <aside className={`k-card sticky top-[calc(4.75rem+env(safe-area-inset-top))] z-10 max-h-[calc(100dvh-7rem)] overflow-hidden p-3 transition-all duration-300 lg:self-start ${
      isCollapsed ? 'lg:w-20' : 'lg:w-72'
    }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className={isCollapsed ? 'lg:sr-only' : ''}>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-kupan-flame">Menu admin</p>
          <p className="mt-1 text-sm font-black uppercase text-white">Accesos rapidos</p>
        </div>
        <button
          type="button"
          className="hidden h-10 w-10 shrink-0 rounded-lg border border-white/10 bg-white/10 text-xs font-black text-white transition hover:bg-white/15 lg:block"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expandir menu admin' : 'Colapsar menu admin'}
        >
          {isCollapsed ? '>>' : '<<'}
        </button>
      </div>

      <div className="max-h-[calc(100dvh-12rem)] space-y-2 overflow-y-auto pr-1">
        {modules.map((module) => {
          const isOpen = openModules.includes(module.id)
          const moduleHasActive = module.id === activeModuleId

          return (
            <div key={module.id} className="rounded-lg border border-white/10 bg-white/[0.03]">
              <button
                type="button"
                className={`flex min-h-12 w-full items-center gap-3 px-3 text-left transition ${moduleHasActive ? 'text-white' : 'text-white/70 hover:text-white'}`}
                onClick={() => onToggleModule(module.id)}
                aria-expanded={isOpen}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[0.62rem] font-black ${moduleHasActive ? 'bg-kupan-ember text-white' : 'bg-white/10 text-white/70'}`}>
                  {module.icon}
                </span>
                <span className={`min-w-0 flex-1 text-sm font-black uppercase ${isCollapsed ? 'lg:hidden' : ''}`}>{module.label}</span>
                <span className={`text-xs font-black transition ${isOpen ? 'rotate-90' : ''} ${isCollapsed ? 'lg:hidden' : ''}`}>{'>'}</span>
              </button>

              {isOpen ? (
                <div className={`space-y-1 px-2 pb-2 ${isCollapsed ? 'lg:hidden' : ''}`}>
                  {module.items.map((item) => {
                    const isActive = item.id === activeSection
                    return (
                      <button
                        key={`${module.id}-${item.label}-${item.target ?? item.id}`}
                        type="button"
                        className={`w-full rounded-md px-3 py-2 text-left transition ${
                          isActive ? 'bg-kupan-ember/95 text-white shadow-glow' : 'text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                        onClick={() => onNavigate(item)}
                      >
                        <span className="block text-xs font-black uppercase">{item.label}</span>
                        <span className="mt-0.5 block text-[0.68rem] font-bold text-white/45">{item.hint}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export function QuickActionButton({ label, icon, onClick, primary = false }) {
  return (
    <button
      type="button"
      className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-black uppercase tracking-[0.08em] transition ${
        primary ? 'bg-kupan-ember text-white shadow-glow' : 'border border-white/10 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
      }`}
      onClick={onClick}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[0.62rem]">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
