import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getHumanErrorMessage, logAppError } from './appState.js'

export const notificationTypes = [
  'plan_expiring',
  'low_tokens',
  'reservation_confirmed',
  'class_reminder',
  'birthday',
]

function getNotificationError(message = 'No pudimos cargar notificaciones.') {
  return { ok: false, message }
}

function getSafeNotificationError(scope, error, fallback) {
  logAppError(scope, error)
  return getNotificationError(getHumanErrorMessage(error, fallback))
}

export async function loadNotifications(profileId) {
  if (!isSupabaseConfigured || !supabase) return getNotificationError('Supabase aun no esta configurado.')
  if (!profileId) return { ok: true, notifications: [], unreadCount: 0 }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, profile_id, title, message, type, read, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return getSafeNotificationError('notifications.load', error, 'No fue posible cargar notificaciones. Intenta nuevamente.')

  const notifications = data ?? []
  return {
    ok: true,
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
  }
}

export async function markNotificationRead(notificationId) {
  if (!isSupabaseConfigured || !supabase) return getNotificationError('Supabase aun no esta configurado.')

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) return getSafeNotificationError('notifications.mark_read', error, 'No fue posible marcar la notificación.')
  return { ok: true }
}

export async function markAllNotificationsRead(profileId) {
  if (!isSupabaseConfigured || !supabase) return getNotificationError('Supabase aun no esta configurado.')
  if (!profileId) return { ok: true }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('profile_id', profileId)
    .eq('read', false)

  if (error) return getSafeNotificationError('notifications.mark_all_read', error, 'No fue posible marcar las notificaciones.')
  return { ok: true }
}
