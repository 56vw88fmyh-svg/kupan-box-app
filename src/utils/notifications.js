import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getHumanErrorMessage, logAppError } from './appState.js'

export const notificationTypes = [
  'plan_expiring',
  'low_tokens',
  'reservation_confirmed',
  'class_reminder',
  'birthday',
  'news',
]

const unavailableReminderFunctionCodes = new Set(['42883', 'PGRST202'])

function getNotificationError(message = 'No pudimos cargar notificaciones.') {
  return { ok: false, message }
}

function getSafeNotificationError(scope, error, fallback) {
  logAppError(scope, error)
  return getNotificationError(getHumanErrorMessage(error, fallback))
}

async function refreshRenewalReminder(reminderDays) {
  const { error } = await supabase.rpc('refresh_my_membership_notifications', {
    reminder_days: reminderDays,
  })

  // Permite desplegar el frontend antes que la migracion SQL sin romper la campana.
  if (error && !unavailableReminderFunctionCodes.has(error.code)) {
    logAppError('notifications.refresh_renewal', error)
  }
}

export async function loadNotifications(profileId, { renewalReminderDays = 3 } = {}) {
  if (!isSupabaseConfigured || !supabase) return getNotificationError('El servicio de datos aún no está configurado.')
  if (!profileId) return { ok: true, notifications: [], unreadCount: 0 }

  await refreshRenewalReminder(renewalReminderDays)

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
  if (!isSupabaseConfigured || !supabase) return getNotificationError('El servicio de datos aún no está configurado.')

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) return getSafeNotificationError('notifications.mark_read', error, 'No fue posible marcar la notificación.')
  return { ok: true }
}

export async function markAllNotificationsRead(profileId) {
  if (!isSupabaseConfigured || !supabase) return getNotificationError('El servicio de datos aún no está configurado.')
  if (!profileId) return { ok: true }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('profile_id', profileId)
    .eq('read', false)

  if (error) return getSafeNotificationError('notifications.mark_all_read', error, 'No fue posible marcar las notificaciones.')
  return { ok: true }
}
