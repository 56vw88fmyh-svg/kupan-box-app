import { useEffect, useState } from 'react'
import { Button, Card } from './ui/index.js'

export function PwaUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
    }

    function handleOffline() {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined

    let mounted = true
    let hasReloadedForThisUpdate = false
    let updateInterval = null
    let activeRegistration = null
    let installingWorker = null

    function handleControllerChange() {
      if (hasReloadedForThisUpdate) return
      hasReloadedForThisUpdate = true
      window.location.reload()
    }

    function handleInstallingStateChange() {
      if (installingWorker?.state === 'installed' && navigator.serviceWorker.controller && mounted) {
        setWaitingWorker(installingWorker)
        setShowBanner(true)
      }
    }

    function trackInstallingWorker(worker) {
      if (!worker) return

      if (installingWorker) installingWorker.removeEventListener('statechange', handleInstallingStateChange)
      installingWorker = worker
      installingWorker.addEventListener('statechange', handleInstallingStateChange)
    }

    function handleUpdateFound() {
      trackInstallingWorker(activeRegistration?.installing)
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (!mounted) return
      activeRegistration = registration

      registration.update().catch(() => {})

      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        setShowBanner(true)
      }

      registration.addEventListener('updatefound', handleUpdateFound)

      updateInterval = window.setInterval(() => {
        if (!document.hidden && navigator.onLine) registration.update().catch(() => {})
      }, 60 * 1000)
    }).catch(() => {})

    return () => {
      mounted = false
      if (updateInterval) window.clearInterval(updateInterval)
      if (installingWorker) installingWorker.removeEventListener('statechange', handleInstallingStateChange)
      if (activeRegistration) activeRegistration.removeEventListener('updatefound', handleUpdateFound)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  function updateApp() {
    if (isRefreshing) return
    setIsRefreshing(true)

    if (!waitingWorker) {
      window.location.reload()
      return
    }

    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!showBanner && !isOffline) return null

  return (
    <Card className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-5xl p-3 backdrop-blur-2xl sm:bottom-5" variant="elevated">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-white">
            {showBanner ? 'Nueva versión disponible' : 'Estás sin conexión'}
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-white/60">
            {showBanner
              ? 'Actualiza cuando estés listo para usar la última versión de KUPAN.'
              : 'Algunas acciones se sincronizarán cuando vuelva internet.'}
          </p>
        </div>
        {showBanner ? (
          <Button className="shrink-0" isLoading={isRefreshing} loadingLabel="Actualizando" size="sm" onClick={updateApp}>
            Actualizar ahora
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
