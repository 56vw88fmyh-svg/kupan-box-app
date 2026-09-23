import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatRosterDate, getRosterStatus, selectRosterStudents } from './rosterModel.js'
import { readRosterToken } from './rosterApi.js'

const today = '2026-09-21'
const base = { student_id: 'a', full_name: 'Ángela Soto', membership_id: 'm', membership_status: 'active', payment_status: 'paid', start_date: '2026-09-01', end_date: '2026-10-01', effective_end_date: '2026-10-01', remaining_tokens: 8, is_unlimited: false }
const status = (overrides) => getRosterStatus({ ...base, ...overrides }, today)

test('thresholds are inclusive; expiration today is yellow, yesterday red', () => {
  assert.equal(status({}).color, 'green')
  assert.equal(status({ end_date: '2026-09-28', effective_end_date: '2026-09-28' }).color, 'yellow')
  assert.equal(status({ end_date: '2026-09-29', effective_end_date: '2026-09-29' }).color, 'green')
  assert.deepEqual(status({ end_date: today, effective_end_date: today }).reasons, ['Vence hoy'])
  assert.equal(status({ end_date: '2026-09-20', effective_end_date: '2026-09-20' }).color, 'red')
  assert.equal(status({ effective_end_date: '2026-09-20' }).color, 'red')
  assert.equal(status({ remaining_tokens: 2 }).color, 'yellow')
  assert.equal(status({ remaining_tokens: 3 }).color, 'green')
  assert.equal(status({ remaining_tokens: 0 }).color, 'red')
})

test('unlimited plans use dates; missing or noncurrent plans never turn green', () => {
  assert.equal(status({ is_unlimited: true, remaining_tokens: null }).color, 'green')
  assert.equal(status({ is_unlimited: true, remaining_tokens: 0 }).color, 'green')
  assert.equal(status({ is_unlimited: true, effective_end_date: '2026-09-22' }).color, 'yellow')
  for (const overrides of [{ membership_id: null }, { membership_status: 'paused' }, { membership_status: 'cancelled' }, { payment_status: 'pending' }, { payment_status: 'failed' }, { start_date: '2026-09-25' }, { remaining_tokens: null }, { end_date: null }, { start_date: '2026-02-30' }]) assert.equal(status(overrides).color, 'gray')
  assert.equal(status({ membership_status: 'expired' }).color, 'red')
})

test('red takes precedence, and both reasons remain visible', () => {
  assert.deepEqual(status({ remaining_tokens: 0, effective_end_date: '2026-09-20' }).reasons, ['Plan vencido', 'Sin tokens'])
  assert.equal(status({ remaining_tokens: 0, effective_end_date: '2026-09-22' }).color, 'red')
})

test('search ignores accents; urgent students come first and filters combine', () => {
  const rows = [base, { ...base, student_id: 'b', full_name: 'María Pérez', remaining_tokens: 0 }]
  assert.equal(selectRosterStudents(rows, today)[0].student_id, 'b')
  assert.equal(selectRosterStudents(rows, today, 'angela')[0].student_id, 'a')
  assert.equal(selectRosterStudents(rows, today, 'MARIA', 'red').length, 1)
  assert.equal(selectRosterStudents(rows, today, 'MARIA', 'green').length, 0)
  assert.equal(formatRosterDate('2026-09-21'), '21/09/2026')
  assert.equal(formatRosterDate('2026-02-30'), '—')
})

test('private links require a full 256-bit-shaped token in the fragment', () => {
  const token = 'a'.repeat(64)
  assert.equal(readRosterToken(`#acceso=${token}`), token)
  for (const invalid of ['', '#acceso=abc', `?acceso=${token}`, '#acceso=undefined']) assert.equal(readRosterToken(invalid), '')
})
