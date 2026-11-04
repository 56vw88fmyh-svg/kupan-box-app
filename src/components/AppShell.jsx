import { APP_RELEASE } from '../utils/telemetry.js'
import { ModeSwitcher } from './ModeSwitcher.jsx'
import { useEffect, useState } from 'react'
import { gymConfig } from '../config/gymConfig.js'
import { NotificationBell } from './NotificationBell.jsx'

export function AppShell({ title, eyebrow, children, currentUser, variant = 'app' }) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const isAuthLayout = variant === 'auth'

  useEffect(() => {
    function updateOnlineState() {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)
    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  return (
    <div className={`${isAuthLayout ? 'k-auth-shell' : 'k-app-shell'} text-kupan-bone`}>
      {!isAuthLayout ? <header className="k-app-header sticky top-0 z-20 border-b border-white/10 bg-kupan-black/90 px-4 pb-3 backdrop-blur-2xl">
        <a className="sr-only focus:not-sr-only focus:block focus:p-3 focus:text-white" href="#main-content">Ir al contenido principal</a>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="max-w-[11rem] break-words text-[0.68rem] font-black uppercase leading-4 tracking-[0.18em] text-kupan-sand sm:max-w-none">{eyebrow}</p>
            <h1 className="k-display mt-1 break-words text-3xl font-black uppercase leading-none text-white">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {gymConfig.features.notifications ? <NotificationBell currentUser={currentUser} /> : null}
            <div className="flex h-14 w-24 items-center justify-center overflow-hidden rounded-lg border border-kupan-steel/25 bg-black/45 p-1 shadow-[0_10px_24px_rgba(0,0,0,0.35)] sm:h-[4.5rem] sm:w-32">
              <img className={gymConfig.id === 'fittest' ? 'h-12 w-12 max-w-none shrink-0 scale-[1.14] rounded-full object-cover' : 'h-full w-full object-contain'} style={gymConfig.id === 'fittest' ? { clipPath: 'circle(44% at 50% 50%)' } : undefined} src={gymConfig.assets.logo} alt={`${gymConfig.identity.name} · ${gymConfig.identity.slogan}`} width="128" height="78" decoding="async" />
            </div>
          </div>
        </div>
        <div className="mx-auto mt-2 max-w-5xl"><ModeSwitcher currentUser={currentUser} /></div>
      </header> : null}
      <main id="main-content" tabIndex={-1} className={isAuthLayout ? 'k-auth-main' : 'k-app-main mx-auto max-w-5xl py-4 sm:px-4 sm:py-5'}>
        {!isOnline ? (
          <div className={`${isAuthLayout ? 'k-auth-offline' : 'mb-4'} rounded-xl border border-kupan-warning/40 bg-kupan-warning/10 p-3 text-sm font-bold leading-6 text-white`}>
            Estás sin conexión. Puedes consultar la información ya cargada. Los registros pendientes de entrenamiento se reintentarán al recuperar conexión.
          </div>
        ) : null}
        {children}
        {!isAuthLayout ? <div className="mt-8 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/65">
            {gymConfig.identity.name} App v{APP_RELEASE}
          </p>
          <button type="button" className="min-h-11 px-3 text-xs font-semibold text-kupan-sand" onClick={() => window.dispatchEvent(new window.Event('kupan:check-update'))}>
            Actualizar app
          </button>
        </div> : null}
      </main>
    </div>
  )
}
