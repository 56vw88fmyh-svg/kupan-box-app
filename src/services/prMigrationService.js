import { supabase } from '../lib/supabase.js'

export const PR_MIGRATION_STATE_KEY = 'kupan_pr_migration_v1'
export const PR_MIGRATION_BACKUP_KEY = 'kupan_pr_migration_v1_backup'

export const LEGACY_PR_KEYS = [
  'personalRecords',
  'prs',
  'kupan_prs',
  'personal_records',
  'records',
  'userPRs',
  'kupan_personal_records',
  'kupanPersonalRecords',
  'kupan_records',
  'kupanUserPRs',
]

const KEY_PATTERNS = ['pr', 'prs', 'record', 'records', 'personalrecord', 'personal_records', 'kupan']
const VALID_UNITS = ['kg', 'reps', 'tiempo', 'metros', 'calorias']
const TIME_UNITS = ['tiempo', 'time', 'seconds', 'segundos', 'sec', 'secs']

function safeNowIso() {
  return new Date().toISOString()
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
}

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeExerciseName(value) {
  return normalizeText(value)
}

function parseStoredJson(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') return { ok: false, value: null }

  try {
    return { ok: true, value: JSON.parse(rawValue) }
  } catch {
    return { ok: false, value: null }
  }
}

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function asArray(value) {
  if (Array.isArray(value)) return value
  if (!isObject(value)) return []

  const containers = [
    value.records,
    value.prs,
    value.personalRecords,
    value.personal_records,
    value.userPRs,
    value.items,
    value.data,
  ]

  const firstArray = containers.find(Array.isArray)
  if (firstArray) return firstArray

  return Object.values(value).flatMap((item) => (Array.isArray(item) ? item : []))
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const cleaned = String(value)
    .trim()
    .replace(/,/g, '.')
    .replace(/[^0-9.:-]/g, '')

  if (!cleaned || cleaned.includes(':')) return null

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseTimeToSeconds(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value) : null

  const text = String(value).trim().toLowerCase()
  if (!text) return null

  const colonParts = text.split(':').map((part) => Number(part.replace(/[^0-9.]/g, '')))
  if (colonParts.length === 2 && colonParts.every(Number.isFinite)) {
    return Math.round((colonParts[0] * 60) + colonParts[1])
  }
  if (colonParts.length === 3 && colonParts.every(Number.isFinite)) {
    return Math.round((colonParts[0] * 3600) + (colonParts[1] * 60) + colonParts[2])
  }

  const minutes = text.match(/(\d+(?:[.,]\d+)?)\s*(m|min|mins|minutos)/)
  const seconds = text.match(/(\d+(?:[.,]\d+)?)\s*(s|seg|segs|segundos)/)
  if (minutes || seconds) {
    const minuteValue = minutes ? Number(minutes[1].replace(',', '.')) : 0
    const secondValue = seconds ? Number(seconds[1].replace(',', '.')) : 0
    if (Number.isFinite(minuteValue) && Number.isFinite(secondValue)) return Math.round((minuteValue * 60) + secondValue)
  }

  const numeric = parseNumber(text)
  return numeric !== null && numeric >= 0 ? Math.round(numeric) : null
}

function normalizeDate(value) {
  if (!value) return null
  const candidate = String(value).trim()
  if (!candidate) return null

  const date = new Date(candidate.includes('T') ? candidate : `${candidate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  const dateText = date.toISOString().slice(0, 10)
  if (dateText < '1900-01-01') return null

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date > tomorrow) return null

  return dateText
}

function inferUnit(record, timeSeconds) {
  const rawUnit = normalizeText(record.unit ?? record.units ?? record.default_unit ?? record.measurementUnit).toLowerCase()
  if (TIME_UNITS.includes(rawUnit) || timeSeconds !== null) return 'tiempo'
  if (rawUnit === 'calories') return 'calorias'
  if (rawUnit === 'meters') return 'metros'
  if (VALID_UNITS.includes(rawUnit)) return rawUnit
  return 'kg'
}

function inferRecordType(unit, record) {
  const rawType = normalizeText(record.record_type ?? record.recordType ?? record.type).toLowerCase()
  if (rawType) return rawType
  if (unit === 'tiempo') return 'time'
  if (unit === 'reps') return 'reps'
  if (unit === 'metros') return 'distance'
  if (unit === 'calorias') return 'calories'
  return 'weight'
}

export function buildPrFingerprint({ userId, movement, value, unit, recordDate, recordType }) {
  return [
    userId,
    normalizeExerciseName(movement).toLowerCase(),
    value === null || value === undefined ? '' : String(Number(value)),
    normalizeText(unit).toLowerCase(),
    recordDate,
    normalizeText(recordType).toLowerCase(),
  ].join('|')
}

export function normalizeLegacyPrRecord(record, userId, sourceKey = '') {
  if (!isObject(record)) return { ok: false, reason: 'not_object', record: null }

  const movement = normalizeExerciseName(
    record.movement
    ?? record.exercise
    ?? record.exerciseName
    ?? record.exercise_name
    ?? record.name
    ?? record.lift
    ?? record.workout,
  )
  if (!movement) return { ok: false, reason: 'missing_movement', record: null }

  const date = normalizeDate(
    record.record_date
    ?? record.recordDate
    ?? record.achieved_at
    ?? record.achievedAt
    ?? record.date
    ?? record.created_at
    ?? record.createdAt,
  )
  if (!date) return { ok: false, reason: 'invalid_date', record: null }

  const timeSeconds = parseTimeToSeconds(record.time_seconds ?? record.timeSeconds ?? record.time ?? record.duration)
  const unit = inferUnit(record, timeSeconds)
  const rawValue = unit === 'tiempo'
    ? timeSeconds
    : parseNumber(record.value ?? record.weight ?? record.load ?? record.score ?? record.result)

  const rounds = parseNumber(record.rounds)
  const reps = parseNumber(record.reps)
  const hasCompoundScore = rounds !== null || reps !== null
  const value = rawValue !== null ? rawValue : hasCompoundScore ? Number(`${Math.max(rounds ?? 0, 0)}.${String(Math.max(reps ?? 0, 0)).padStart(2, '0')}`) : null

  if (value === null || value < 0) return { ok: false, reason: 'invalid_value', record: null }

  const recordType = inferRecordType(unit, record)
  const notes = normalizeText(record.notes ?? record.note ?? record.comment ?? record.comments)

  return {
    ok: true,
    reason: '',
    record: {
      profile_id: userId,
      movement,
      value,
      unit,
      record_date: date,
      notes: notes || null,
      record_type: recordType,
      source_key: sourceKey,
      fingerprint: buildPrFingerprint({ userId, movement, value, unit, recordDate: date, recordType }),
    },
  }
}

function shouldInspectKey(key) {
  const normalized = normalizeKey(key)
  return LEGACY_PR_KEYS.map(normalizeKey).includes(normalized)
    || KEY_PATTERNS.some((pattern) => normalized.includes(pattern))
}

function collectStorageEntries(storage, storageType) {
  if (!storage) return []

  const entries = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key || !shouldInspectKey(key)) continue
    const parsed = parseStoredJson(storage.getItem(key))
    if (!parsed.ok) continue
    entries.push({ storageType, key, value: parsed.value })
  }
  return entries
}

async function collectIndexedDbEntries(globalObject) {
  const indexedDb = globalObject?.indexedDB
  if (!indexedDb?.databases) return []

  try {
    const databases = await indexedDb.databases()
    return (databases ?? [])
      .filter((db) => db?.name && shouldInspectKey(db.name))
      .map((db) => ({ storageType: 'indexedDB', key: db.name, value: null, unsupported: true }))
  } catch {
    return []
  }
}

export async function discoverLegacyPrEntries(globalObject = globalThis) {
  const entries = [
    ...collectStorageEntries(globalObject?.localStorage, 'localStorage'),
    ...collectStorageEntries(globalObject?.sessionStorage, 'sessionStorage'),
    ...await collectIndexedDbEntries(globalObject),
  ]

  return entries.flatMap((entry) => {
    if (entry.unsupported) return [{ ...entry, records: [], unsupported: true }]
    const records = asArray(entry.value)
    return records.length > 0 ? [{ ...entry, records }] : []
  })
}

function readMigrationState(globalObject, userId) {
  const parsed = parseStoredJson(globalObject?.localStorage?.getItem(PR_MIGRATION_STATE_KEY))
  if (!parsed.ok || !isObject(parsed.value)) return null
  return parsed.value[userId] ?? null
}

function writeMigrationState(globalObject, userId, state) {
  const storage = globalObject?.localStorage
  if (!storage) return
  const parsed = parseStoredJson(storage.getItem(PR_MIGRATION_STATE_KEY))
  const current = parsed.ok && isObject(parsed.value) ? parsed.value : {}
  storage.setItem(PR_MIGRATION_STATE_KEY, JSON.stringify({
    ...current,
    [userId]: {
      ...state,
      updatedAt: safeNowIso(),
    },
  }))
}

function writeBackup(globalObject, userId, payload) {
  const storage = globalObject?.localStorage
  if (!storage) return
  const parsed = parseStoredJson(storage.getItem(PR_MIGRATION_BACKUP_KEY))
  const current = parsed.ok && isObject(parsed.value) ? parsed.value : {}
  storage.setItem(PR_MIGRATION_BACKUP_KEY, JSON.stringify({
    ...current,
    [userId]: {
      createdAt: safeNowIso(),
      ...payload,
    },
  }))
}

async function confirmAuthenticatedUser(client, expectedUserId) {
  if (!client?.auth?.getUser) return { ok: false, reason: 'missing_client' }
  const { data, error } = await client.auth.getUser()
  if (error || !data?.user?.id) return { ok: false, reason: 'expired_session' }
  if (data.user.id !== expectedUserId) return { ok: false, reason: 'user_mismatch' }
  return { ok: true, reason: '' }
}

async function fetchExistingFingerprints(client, userId) {
  const { data, error } = await client
    .from('personal_records')
    .select('id, movement, value, unit, record_date')
    .eq('profile_id', userId)

  if (error) return { ok: false, fingerprints: new Set(), records: [] }

  const fingerprints = new Set((data ?? []).map((record) => buildPrFingerprint({
    userId,
    movement: record.movement,
    value: record.value,
    unit: record.unit,
    recordDate: record.record_date,
    recordType: inferRecordType(record.unit, record),
  })))

  return { ok: true, fingerprints, records: data ?? [] }
}

function countCriticalMatches(insertedRecords, expectedRecords) {
  const inserted = new Set(insertedRecords.map((record) => buildPrFingerprint({
    userId: record.profile_id,
    movement: record.movement,
    value: record.value,
    unit: record.unit,
    recordDate: record.record_date,
    recordType: inferRecordType(record.unit, record),
  })))

  return expectedRecords.filter((record) => inserted.has(record.fingerprint)).length
}

export async function migrateLegacyPrs({ currentUser, client = supabase, globalObject = globalThis, force = false } = {}) {
  const userId = currentUser?.id
  if (!userId) return { status: 'idle', message: 'Sin usuario autenticado.', migrated: 0, skipped: 0, invalid: 0 }

  const previousState = readMigrationState(globalObject, userId)
  if (!force && previousState?.status === 'completed') {
    return { status: 'completed', message: 'Récords sincronizados.', migrated: 0, skipped: 0, invalid: 0 }
  }

  const authCheck = await confirmAuthenticatedUser(client, userId)
  if (!authCheck.ok) {
    return { status: 'error', message: 'No fue posible sincronizar tus récords.', reason: authCheck.reason, migrated: 0, skipped: 0, invalid: 0 }
  }

  const entries = await discoverLegacyPrEntries(globalObject)
  const unsupportedStores = entries.filter((entry) => entry.unsupported)
  const normalizedResults = entries.flatMap((entry) => (
    entry.records ?? []
  ).map((record) => normalizeLegacyPrRecord(record, userId, `${entry.storageType}:${entry.key}`)))

  const validRecords = normalizedResults.filter((result) => result.ok).map((result) => result.record)
  const invalid = normalizedResults.length - validRecords.length
  const uniqueRecords = [...new Map(validRecords.map((record) => [record.fingerprint, record])).values()]

  writeBackup(globalObject, userId, {
    entries: entries.map((entry) => ({ storageType: entry.storageType, key: entry.key, unsupported: Boolean(entry.unsupported), count: entry.records?.length ?? 0 })),
    candidateCount: normalizedResults.length,
    validCount: validRecords.length,
    uniqueCount: uniqueRecords.length,
    invalidCount: invalid,
  })

  if (unsupportedStores.length > 0) {
    return {
      status: 'warning',
      message: 'No fue posible sincronizar algunos récords.',
      reason: 'indexeddb_manual_review_required',
      migrated: 0,
      skipped: 0,
      invalid,
      unsupportedStores: unsupportedStores.map((entry) => entry.key),
    }
  }

  if (uniqueRecords.length === 0) {
    writeMigrationState(globalObject, userId, { status: 'completed', migrated: 0, skipped: 0, invalid: 0 })
    return { status: 'completed', message: 'Récords sincronizados.', migrated: 0, skipped: 0, invalid: 0 }
  }

  const existing = await fetchExistingFingerprints(client, userId)
  if (!existing.ok) {
    writeMigrationState(globalObject, userId, { status: 'error', reason: 'fetch_existing_failed' })
    return { status: 'error', message: 'No fue posible sincronizar tus récords.', reason: 'fetch_existing_failed', migrated: 0, skipped: 0, invalid }
  }

  const pendingRecords = uniqueRecords.filter((record) => !existing.fingerprints.has(record.fingerprint))
  const skipped = uniqueRecords.length - pendingRecords.length

  if (pendingRecords.length > 0) {
    const payload = pendingRecords.map((record) => {
      const payloadRecord = { ...record }
      delete payloadRecord.fingerprint
      delete payloadRecord.record_type
      delete payloadRecord.source_key
      return payloadRecord
    })
    const { error } = await client.from('personal_records').insert(payload)
    if (error) {
      writeMigrationState(globalObject, userId, { status: 'error', reason: 'insert_failed' })
      return { status: 'error', message: 'No fue posible sincronizar tus récords.', reason: 'insert_failed', migrated: 0, skipped, invalid }
    }
  }

  const confirmation = await fetchExistingFingerprints(client, userId)
  if (!confirmation.ok) {
    writeMigrationState(globalObject, userId, { status: 'error', reason: 'confirmation_failed' })
    return { status: 'error', message: 'No fue posible sincronizar tus récords.', reason: 'confirmation_failed', migrated: 0, skipped, invalid }
  }

  const confirmedCount = countCriticalMatches(confirmation.records, uniqueRecords)
  if (confirmedCount !== uniqueRecords.length || invalid > 0) {
    writeMigrationState(globalObject, userId, { status: 'warning', reason: 'partial_confirmation', confirmedCount, expectedCount: uniqueRecords.length, invalid })
    return {
      status: 'warning',
      message: 'No fue posible sincronizar algunos récords.',
      reason: 'partial_confirmation',
      migrated: pendingRecords.length,
      skipped,
      invalid,
    }
  }

  writeMigrationState(globalObject, userId, {
    status: 'completed',
    migrated: pendingRecords.length,
    skipped,
    invalid: 0,
    confirmedCount,
  })

  return {
    status: 'completed',
    message: pendingRecords.length > 0 ? 'Récords sincronizados.' : 'Récords sincronizados.',
    migrated: pendingRecords.length,
    skipped,
    invalid: 0,
  }
}
