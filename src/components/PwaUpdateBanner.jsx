import { useEffect, useState } from 'react'

export function PwaUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined

    let mounted = true
    let refreshing = false

    function handleControllerChange() {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    function trackInstallingWorker(worker) {
      if (!worker) return

      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller && mounted) {
          setWaitingWorker(worker)
          setShowBanner(true)
        }
      })
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (!mounted) return

      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        setShowBanner(true)
      }

      registration.addEventListener('updatefound', () => {
        trackInstallingWorker(registration.installing)
      })
    }).catch(() => {})

    return () => {
      mounted = false
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  function updateApp() {
    if (!waitingWorker) {
      window.location.reload()
      return
    }

    setIsRefreshing(true)
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!showBanner) return null

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-5xl rounded-lg border border-kupan-ember/45 bg-kupan-gray/95 p-3 shadow-glow backdrop-blur-2xl sm:bottom-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-white">Nueva versión disponible</p>
          <p className="mt-1 text-xs font-bold leading-5 text-white/60">Actualiza para usar la última versión de KUPAN.</p>
        </div>
        <button type="button" className="k-button min-h-11 shrink-0 px-4 py-2 text-xs" onClick={updateApp} disabled={isRefreshing}>
          {isRefreshing ? 'Actualizando...' : 'Actualizar app'}
        </button>
      </div>
    </div>
  )
}
