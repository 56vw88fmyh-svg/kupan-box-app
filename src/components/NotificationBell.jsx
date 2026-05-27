import { useEffect, useState } from 'react'
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../utils/notifications.js'

const typeLabels = {
  plan_expiring: 'Plan por vencer',
  low_tokens: 'Tokens bajos',
  reservation_confirmed: 'Reserva confirmada',
  class_reminder: 'Recordatorio',
  birthday: 'Cumpleaños',
}

function formatNotificationDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function NotificationBell({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [notifications, setNotifications] = useState([])
  const unreadCount = notifications.filter((notification) => !notification.read).length

  async function refreshNotifications() {
    if (!currentUser?.id) {
      setNotifications([])
      return
    }

    setIsLoading(true)
    const result = await loadNotifications(currentUser.id)
    setIsLoading(false)

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setNotifications(result.notifications)
    setMessage('')
  }

  useEffect(() => {
    refreshNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  async function handleOpen() {
    setIsOpen((current) => !current)
    if (!isOpen) refreshNotifications()
  }

  async function handleMarkRead(notificationId) {
    const result = await markNotificationRead(notificationId)
    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setNotifications((current) => current.map((notification) => (
      notification.id === notificationId ? { ...notification, read: true } : notification
    )))
  }

  async function handleMarkAllRead() {
    const result = await markAllNotificationsRead(currentUser?.id)
    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
  }

  if (!currentUser) return null

  return (
    <div className="relative">
      <button
        type="button"
        className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/45 text-lg font-black text-white transition hover:border-kupan-ember/60 hover:bg-kupan-ember/10"
        aria-label="Notificaciones KUPAN"
        aria-expanded={isOpen}
        onClick={handleOpen}
      >
        !
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-kupan-ember px-1 text-[0.62rem] font-black text-white shadow-glow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[min(88vw,22rem)] overflow-hidden rounded-lg border border-white/10 bg-kupan-gray shadow-2xl">
          <div className="border-b border-white/10 bg-black/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">Notificaciones</p>
                <h2 className="mt-1 text-lg font-black uppercase text-white">KUPAN al día</h2>
              </div>
              <button type="button" className="text-xs font-black uppercase text-white/55 hover:text-white" onClick={handleMarkAllRead}>
                Leer todo
              </button>
            </div>
          </div>

          <div className="max-h-[24rem] overflow-y-auto p-3">
            {isLoading ? <p className="p-3 text-sm font-bold text-white/60">Cargando...</p> : null}
            {message ? <p className="mb-2 rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-xs font-bold text-white">{message}</p> : null}
            {!isLoading && notifications.length === 0 ? (
              <p className="p-3 text-sm font-bold leading-6 text-white/60">No tienes notificaciones por ahora.</p>
            ) : null}
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    notification.read
                      ? 'border-white/10 bg-white/[0.03] text-white/65'
                      : 'border-kupan-ember/35 bg-kupan-ember/10 text-white'
                  }`}
                  onClick={() => handleMarkRead(notification.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-kupan-flame">{typeLabels[notification.type] ?? notification.type}</p>
                    <span className="text-[0.62rem] font-bold uppercase text-white/40">{formatNotificationDate(notification.created_at)}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-black uppercase text-white">{notification.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-white/60">{notification.message}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
