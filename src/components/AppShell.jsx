import isotipoKupan from '../assets/brand/isotipo-kupan.png'
import { NotificationBell } from './NotificationBell.jsx'

export function AppShell({ title, eyebrow, children, currentUser }) {
  return (
    <div className="k-app-shell overflow-x-hidden text-kupan-bone">
      <header className="k-app-header sticky top-0 z-20 border-b border-white/10 bg-kupan-black/90 px-4 pb-3 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.24em] text-kupan-flame">{eyebrow}</p>
            <h1 className="mt-1 truncate text-2xl font-black uppercase leading-none text-white">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell currentUser={currentUser} />
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-kupan-ember/50 bg-black/45 p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
              <img className="h-full w-full object-contain" src={isotipoKupan} alt="KUPAN" />
            </div>
          </div>
        </div>
      </header>
      <main className="k-app-main mx-auto max-w-5xl py-4 sm:px-4 sm:py-5">
        {children}
        <p className="mt-8 text-center text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/30">
          KUPAN App v1.0.4
        </p>
      </main>
    </div>
  )
}
