/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from './Button.jsx'
import { cn } from './utils.js'

const ToastContext = createContext(null)

const toastClasses = {
  success: 'border-kupan-success/45 bg-kupan-success/15',
  warning: 'border-kupan-warning/45 bg-kupan-warning/15',
  error: 'border-kupan-red/45 bg-kupan-red/15',
  info: 'border-kupan-info/45 bg-kupan-info/15',
  neutral: 'border-kupan-border bg-kupan-gray/95',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timeoutIds = useRef(new Set())

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(({ description = '', duration = 4200, title, type = 'neutral' }) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => {
      const duplicate = current.some((toast) => (
        toast.type === type && toast.title === title && toast.description === description
      ))
      if (duplicate) return current
      return [...current, { description, id, title, type }]
    })
    if (duration > 0) {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.current.delete(timeoutId)
        dismissToast(id)
      }, duration)
      timeoutIds.current.add(timeoutId)
    }
    return id
  }, [dismissToast])

  const value = useMemo(() => ({ dismissToast, showToast }), [dismissToast, showToast])

  useEffect(() => () => {
    timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    timeoutIds.current.clear()
  }, [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider')
  return context
}

export function ToastViewport({ onDismiss, toasts }) {
  if (!toasts.length) return null

  return (
    <div className="fixed inset-x-3 top-[calc(1rem+env(safe-area-inset-top))] z-[60] mx-auto flex max-w-md flex-col gap-2" role="region" aria-label="Notificaciones">
      {toasts.map((toast) => (
        <div key={toast.id} className={cn('rounded-xl border p-3 shadow-2xl backdrop-blur-2xl', toastClasses[toast.type] ?? toastClasses.neutral)} role="status">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase text-white">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-sm leading-5 text-white/70">{toast.description}</p> : null}
            </div>
            <Button aria-label="Cerrar notificación" size="sm" variant="icon" onClick={() => onDismiss(toast.id)}>x</Button>
          </div>
        </div>
      ))}
    </div>
  )
}
