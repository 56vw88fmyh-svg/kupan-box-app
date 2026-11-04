import assert from 'node:assert/strict'
import { createPersonalRecord, retryPendingPersonalRecords, personalRecordsPendingKey } from './personalRecordsService.ts'
const memory = new Map<string, string>()
const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v) } }
Object.assign(globalThis, { window: { localStorage: storage } })
const rows = new Map<string, any>()
let user = 'a', mode = 'offline', insertCalls = 0
const client: any = {
  auth: { getUser: async () => ({ data: { user: { id: user } }, error: null }) },
  from() {
    let id = '', owner = '', payload: any
    return {
      insert(p: any) { payload = p; return this }, select() { return this },
      eq(k: string, v: string) { if (k === 'id') id = v; if (k === 'profile_id') owner = v; return this },
      async single() {
        if (!payload) return { data: rows.get(id)?.profile_id === owner ? rows.get(id) : null, error: null }
        insertCalls++
        if (mode === 'offline') return { data: null, error: { message: 'Failed to fetch' } }
        if (rows.has(payload.id)) return { data: null, error: { code: '23505' } }
        rows.set(payload.id, payload)
        if (mode === 'lost-response') return { data: null, error: { message: 'Failed to fetch' } }
        return { data: payload, error: null }
      },
    }
  },
}
const input = { movement: 'Clean', value: 50, unit: 'kg', recordDate: '2026-11-04' }
assert.equal((await createPersonalRecord(input, client)).status, 'pending')
const queued = JSON.parse(storage.getItem(personalRecordsPendingKey)!)
assert.equal(queued[0].ownerId, 'a')
user = 'b'; mode = 'online'
assert.equal((await retryPendingPersonalRecords(client)).data?.retried, 0)
assert.equal(rows.size, 0)
user = 'a'; mode = 'lost-response'
await retryPendingPersonalRecords(client)
assert.equal(rows.size, 1)
mode = 'online'
const [one, two] = await Promise.all([retryPendingPersonalRecords(client), retryPendingPersonalRecords(client)])
assert.equal(one.ok, true); assert.equal(two.ok, true)
assert.equal(rows.size, 1)
assert.equal(JSON.parse(storage.getItem(personalRecordsPendingKey)!).length, 0)
assert.equal(insertCalls, 3)
// Legacy ownerless data is preserved and never assigned to the current account.
storage.setItem('kupan_pr_pending_v1', JSON.stringify([{ type: 'create', payload: input }]))
assert.equal((await retryPendingPersonalRecords(client)).data?.retried, 0)
assert.ok(storage.getItem('kupan_pr_pending_v1'))
console.log('Owner isolation, lost response, concurrent retries, legacy quarantine: OK')
