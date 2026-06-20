import assert from 'node:assert/strict'
import {
  PR_MIGRATION_BACKUP_KEY,
  PR_MIGRATION_STATE_KEY,
  buildPrFingerprint,
  discoverLegacyPrEntries,
  migrateLegacyPrs,
  normalizeLegacyPrRecord,
  parseTimeToSeconds,
} from './prMigrationService.js'

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed))
  return {
    get length() {
      return data.size
    },
    key(index) {
      return [...data.keys()][index] ?? null
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      data.set(key, String(value))
    },
    removeItem(key) {
      data.delete(key)
    },
    dump() {
      return Object.fromEntries(data.entries())
    },
  }
}

function createGlobal(seed = {}) {
  return {
    localStorage: createStorage(seed.localStorage),
    sessionStorage: createStorage(seed.sessionStorage),
  }
}

function createClient({ userId = 'user-1', records = [], authError = null, fetchError = null, insertError = null } = {}) {
  const db = [...records]
  return {
    db,
    auth: {
      async getUser() {
        if (authError) return { data: null, error: authError }
        return { data: { user: { id: userId } }, error: null }
      },
    },
    from(table) {
      assert.equal(table, 'personal_records')
      return {
        select() {
          return {
            async eq(field, value) {
              assert.equal(field, 'profile_id')
              if (fetchError) return { data: null, error: fetchError }
              return { data: db.filter((record) => record.profile_id === value), error: null }
            },
          }
        },
        async insert(payload) {
          if (insertError) return { error: insertError }
          db.push(...payload)
          return { error: null }
        },
      }
    },
  }
}

async function testNoLocalPrs() {
  const globalObject = createGlobal()
  const client = createClient()
  const result = await migrateLegacyPrs({ currentUser: { id: 'user-1' }, client, globalObject })
  assert.equal(result.status, 'completed')
  assert.equal(result.migrated, 0)
  assert.equal(client.db.length, 0)
}

async function testSinglePrMigration() {
  const globalObject = createGlobal({
    localStorage: {
      personalRecords: JSON.stringify([{ movement: 'Back Squat', value: '120', unit: 'kg', recordDate: '2026-06-01', notes: 'solido' }]),
    },
  })
  const client = createClient()
  const result = await migrateLegacyPrs({ currentUser: { id: 'user-1' }, client, globalObject })
  assert.equal(result.status, 'completed')
  assert.equal(result.migrated, 1)
  assert.equal(client.db.length, 1)
  assert.equal(client.db[0].movement, 'Back Squat')
  assert.equal(client.db[0].profile_id, 'user-1')
  assert.ok(globalObject.localStorage.getItem(PR_MIGRATION_BACKUP_KEY))
}

async function testMultiplePrsAndDuplicate() {
  const duplicate = { movement: 'Deadlift', value: 180, unit: 'kg', date: '2026-06-02' }
  const globalObject = createGlobal({
    localStorage: {
      kupan_prs: JSON.stringify([duplicate, duplicate, { exercise: 'Fran', time: '4:32', unit: 'time', date: '2026-06-03' }]),
    },
  })
  const client = createClient()
  const result = await migrateLegacyPrs({ currentUser: { id: 'user-1' }, client, globalObject })
  assert.equal(result.status, 'completed')
  assert.equal(result.migrated, 2)
  assert.equal(client.db.length, 2)
  assert.equal(client.db.find((record) => record.movement === 'Fran').value, 272)
}

async function testCorruptDataDoesNotComplete() {
  const globalObject = createGlobal({
    localStorage: {
      prs: JSON.stringify([{ movement: 'Clean', value: 100, unit: 'kg', date: '2026-06-01' }, { movement: '', value: -1 }]),
    },
  })
  const client = createClient()
  const result = await migrateLegacyPrs({ currentUser: { id: 'user-1' }, client, globalObject })
  assert.equal(result.status, 'warning')
  assert.equal(result.migrated, 1)
  assert.equal(result.invalid, 1)
  const state = JSON.parse(globalObject.localStorage.getItem(PR_MIGRATION_STATE_KEY))
  assert.notEqual(state['user-1'].status, 'completed')
}

async function testExpiredSession() {
  const globalObject = createGlobal({
    localStorage: {
      prs: JSON.stringify([{ movement: 'Clean', value: 100, unit: 'kg', date: '2026-06-01' }]),
    },
  })
  const client = createClient({ authError: new Error('expired') })
  const result = await migrateLegacyPrs({ currentUser: { id: 'user-1' }, client, globalObject })
  assert.equal(result.status, 'error')
  assert.equal(result.reason, 'expired_session')
}

async function testSupabaseUnavailableIsRetryable() {
  const globalObject = createGlobal({
    localStorage: {
      prs: JSON.stringify([{ movement: 'Clean', value: 100, unit: 'kg', date: '2026-06-01' }]),
    },
  })
  const client = createClient({ fetchError: new Error('offline') })
  const result = await migrateLegacyPrs({ currentUser: { id: 'user-1' }, client, globalObject })
  assert.equal(result.status, 'error')
  assert.equal(result.reason, 'fetch_existing_failed')
}

async function testRepeatedMigrationSkipsExisting() {
  const existing = { profile_id: 'user-1', movement: 'Clean', value: 100, unit: 'kg', record_date: '2026-06-01' }
  const globalObject = createGlobal({
    localStorage: {
      prs: JSON.stringify([{ movement: 'Clean', value: 100, unit: 'kg', date: '2026-06-01' }]),
    },
  })
  const client = createClient({ records: [existing] })
  const result = await migrateLegacyPrs({ currentUser: { id: 'user-1' }, client, globalObject })
  assert.equal(result.status, 'completed')
  assert.equal(result.migrated, 0)
  assert.equal(result.skipped, 1)
  assert.equal(client.db.length, 1)
}

async function testChangeDeviceNoLocalBackup() {
  const globalObject = createGlobal()
  const client = createClient({ records: [{ profile_id: 'user-1', movement: 'Snatch', value: 80, unit: 'kg', record_date: '2026-06-04' }] })
  const result = await migrateLegacyPrs({ currentUser: { id: 'user-1' }, client, globalObject })
  assert.equal(result.status, 'completed')
  assert.equal(result.migrated, 0)
  assert.equal(client.db.length, 1)
}

async function testNewVersionDoesNotReinsertCompleted() {
  const globalObject = createGlobal({
    localStorage: {
      prs: JSON.stringify([{ movement: 'Clean', value: 100, unit: 'kg', date: '2026-06-01' }]),
      [PR_MIGRATION_STATE_KEY]: JSON.stringify({ 'user-1': { status: 'completed' } }),
    },
  })
  const client = createClient()
  const result = await migrateLegacyPrs({ currentUser: { id: 'user-1' }, client, globalObject })
  assert.equal(result.status, 'completed')
  assert.equal(client.db.length, 0)
}

async function testDiscoveryAndNormalizationHelpers() {
  const globalObject = createGlobal({ localStorage: { userPRs: JSON.stringify({ records: [{ lift: 'Back Squat', value: '100', unit: 'kg', date: '2026-06-01' }] }) } })
  const entries = await discoverLegacyPrEntries(globalObject)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].records.length, 1)
  assert.equal(parseTimeToSeconds('5:30'), 330)
  const normalized = normalizeLegacyPrRecord(entries[0].records[0], 'user-1', 'localStorage:userPRs')
  assert.equal(normalized.ok, true)
  assert.equal(normalized.record.fingerprint, buildPrFingerprint({
    userId: 'user-1',
    movement: 'Back Squat',
    value: 100,
    unit: 'kg',
    recordDate: '2026-06-01',
    recordType: 'weight',
  }))
}

await testNoLocalPrs()
await testSinglePrMigration()
await testMultiplePrsAndDuplicate()
await testCorruptDataDoesNotComplete()
await testExpiredSession()
await testSupabaseUnavailableIsRetryable()
await testRepeatedMigrationSkipsExisting()
await testChangeDeviceNoLocalBackup()
await testNewVersionDoesNotReinsertCompleted()
await testDiscoveryAndNormalizationHelpers()
