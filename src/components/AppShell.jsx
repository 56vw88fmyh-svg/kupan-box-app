import { useEffect, useState } from 'react'
import isotipoKupan from '../assets/brand/isotipo-kupan.png'
import { NotificationBell } from './NotificationBell.jsx'

async function forceAppUpdate() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }

  if ('caches' in window) {
    const cacheKeys = await window.caches.keys()
    await Promise.all(cacheKeys.filter((key) => key.startsWith('kupan-')).map((key) => window.caches.delete(key)))
  }

  window.location.reload()
}

export function AppShell({ title, eyebrow, children, currentUser }) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

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
    <div className="k-app-shell overflow-x-hidden text-kupan-bone">
      <header className="k-app-header sticky top-0 z-20 border-b border-white/10 bg-kupan-black/90 px-4 pb-3 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="max-w-[13rem] break-words text-[0.68rem] font-black uppercase leading-4 tracking-[0.24em] text-kupan-flame sm:max-w-none">{eyebrow}</p>
            <h1 className="mt-1 break-words text-2xl font-black uppercase leading-none text-white">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell currentUser={currentUser} />
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-kupan-ember/50 bg-black/45 p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
              <img className="h-full w-full object-contain" src={isotipoKupan} alt="KUPAN" width="44" height="44" decoding="async" />
            </div>
          </div>
        </div>
      </header>
      <main className="k-app-main mx-auto max-w-5xl py-4 sm:px-4 sm:py-5">
        {!isOnline ? (
          <div className="mb-4 rounded-xl border border-kupan-warning/40 bg-kupan-warning/10 p-3 text-sm font-bold leading-6 text-white">
            Estás sin conexión. Puedes seguir revisando lo visible; los cambios se sincronizarán cuando vuelva internet.
          </div>
        ) : null}
        {children}
        <div className="mt-8 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/30">
            KUPAN App v1.0.10
          </p>
          <button type="button" className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-kupan-flame" onClick={forceAppUpdate}>
            Actualizar app
          </button>
        </div>
      </main>
    </div>
  )
}
