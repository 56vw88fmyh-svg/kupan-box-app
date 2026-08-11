import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/20260811120000_kupan_21_operations.sql', 'utf8')
const webhook = readFileSync('supabase/functions/payment-webhook/index.ts', 'utf8')

for (const requiredFragment of [
  "reservation_closes_minutes', '15'",
  "cancellation_refund_minutes', '45'",
  "reservation_window_days', '7'",
  "full_daily_limit', '1'",
  'for update',
  'token_refunded',
  'cancellation_kind',
  'class_waitlist',
  'promote_class_waitlist',
  'reservation_attendance_audit',
  'coach_private_notes',
  'membership_suspensions',
]) {
  assert.equal(migration.includes(requiredFragment), true, `Falta contrato SQL: ${requiredFragment}`)
}

assert.match(migration, /now\(\)\s*<=\s*cutoff_at/)
assert.match(migration, /reservation_record\.token_refunded\s+is\s+not\s+true/)
assert.match(migration, /status\s*=\s*'waiting'/)
assert.match(webhook, /unique|provider_reference/)
assert.match(webhook, /addDays\(startDate, 29\)/)
assert.doesNotMatch(webhook, /VITE_SUPABASE_SERVICE_ROLE/)
