import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/20260813120000_notification_automation.sql', 'utf8')
const notificationsSql = readFileSync('supabase/sql/notifications.sql', 'utf8')

for (const sql of [migration, notificationsSql]) {
  assert.match(sql, /create table if not exists public\.notifications/)
  assert.match(sql, /'news'/)
  assert.match(sql, /notifications_dedupe_key_idx/)
  assert.match(sql, /refresh_my_membership_notifications/)
  assert.match(sql, /m\.profile_id\s*=\s*auth\.uid\(\)/)
  assert.match(sql, /m\.status\s*=\s*'active'/)
  assert.match(sql, /m\.payment_status\s*=\s*'paid'/)
  assert.match(sql, /notify_active_users_about_news_trigger/)
  assert.match(sql, /p\.status\s*=\s*'active'/)
  assert.match(sql, /on conflict \(dedupe_key\)/)
  assert.doesNotMatch(sql, /service_role/i)
  assert.doesNotMatch(sql, /truncate/i)
}

console.log('notification automation tests: OK')
