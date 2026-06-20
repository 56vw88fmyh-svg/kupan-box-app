import assert from 'node:assert/strict'
import {
  comparePersonalRecords,
  createPersonalRecord,
  deletePersonalRecord,
  getCurrentPersonalRecords,
  getPersonalRecordHistory,
  getPersonalRecords,
  retryPendingPersonalRecords,
  updatePersonalRecord,
  type PersonalRecord,
} from './personalRecordsService.ts'

type Row = PersonalRecord

type Operation = 'select' | 'insert' | 'update' | 'delete'

interface MockOptions {
  userId?: string | null
  authError?: Error | null
  networkError?: Error | null
  rows?: Row[]
}

function createStorage() {
  const data = new Map<string, string>()
  return {
    getItem(key: string) { return data.get(key) ?? null },
    setItem(key: string, value: string) { data.set(key, value) },
    removeItem(key: string) { data.delete(key) },
    clear() { data.clear() },
  }
}

class Query<T> implements PromiseLike<{ data: T | null; error: Error | null }> {
  private operation: Operation = 'select'
  private filters: Array<{ column: string; value: unknown }> = []
  private payload: unknown = null
  private singleResult = false
  private rows: Row[]
  private networkError: Error | null

  constructor(rows: Row[], networkError: Error | null) {
    this.rows = rows
    this.networkError = networkError
  }

  select(): Query<T> { return this }
  order(): Query<T> { return this }

  eq(column: string, value: unknown): Query<T> {
    this.filters.push({ column, value })
    return this
  }

  insert(payload: unknown): Query<T> {
    this.operation = 'insert'
    this.payload = payload
    return this
  }

  update(payload: unknown): Query<T> {
    this.operation = 'update'
    this.payload = payload
    return this
  }

  delete(): Query<T> {
    this.operation = 'delete'
    return this
  }

  async single(): Promise<{ data: T | null; error: Error | null }> {
    this.singleResult = true
    return this.execute()
  }

  then<TResult1 = { data: T | null; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T | null; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => String(row[filter.column as keyof Row]) === String(filter.value))
  }

  private async execute(): Promise<{ data: T | null; error: Error | null }> {
    if (this.networkError) return { data: null, error: this.networkError }

    if (this.operation === 'insert') {
      const payload = this.payload as Partial<Row>
      const row: Row = {
        id: `rec-${this.rows.length + 1}`,
        profile_id: String(payload.profile_id),
        movement: String(payload.movement),
        value: Number(payload.value),
        unit: payload.unit as Row['unit'],
        record_date: String(payload.record_date),
        notes: payload.notes === undefined ? null : payload.notes as string | null,
        rounds: payload.rounds ?? null,
        reps: payload.reps ?? null,
        time_seconds: payload.time_seconds ?? null,
      }
      this.rows.push(row)
      return { data: (this.singleResult ? row : [row]) as T, error: null }
    }

    if (this.operation === 'update') {
      const payload = this.payload as Partial<Row>
      const index = this.rows.findIndex((row) => this.matches(row))
      if (index === -1) return { data: null, error: new Error('not found') }
      this.rows[index] = { ...this.rows[index], ...payload }
      return { data: this.rows[index] as T, error: null }
    }

    if (this.operation === 'delete') {
      const before = this.rows.length
      for (let index = this.rows.length - 1; index >= 0; index -= 1) {
        if (this.matches(this.rows[index])) this.rows.splice(index, 1)
      }
      return { data: null, error: before === this.rows.length ? new Error('not found') : null }
    }

    const result = this.rows.filter((row) => this.matches(row))
    return { data: result as T, error: null }
  }
}

function createClient(options: MockOptions = {}) {
  const rows = options.rows ? [...options.rows] : []
  return {
    rows,
    auth: {
      async getUser() {
        if (options.authError) return { data: null, error: options.authError }
        return { data: { user: options.userId === null ? null : { id: options.userId ?? 'user-1' } }, error: null }
      },
    },
    from<T>() {
      return new Query<T>(rows, options.networkError ?? null)
    },
  }
}

const baseRecord: Row = {
  id: 'rec-1',
  profile_id: 'user-1',
  movement: 'Back Squat',
  value: 100,
  unit: 'kg',
  record_date: '2026-06-01',
  notes: null,
}

async function testReadPr() {
  const client = createClient({ rows: [baseRecord, { ...baseRecord, id: 'other', profile_id: 'user-2' }] })
  const result = await getPersonalRecords(client)
  assert.equal(result.ok, true)
  assert.equal(result.data?.length, 1)
}

async function testCreatePr() {
  const client = createClient()
  const result = await createPersonalRecord({ movement: 'Clean', value: '90', unit: 'kg', recordDate: '2026-06-02' }, client)
  assert.equal(result.ok, true)
  assert.equal(client.rows.length, 1)
  assert.equal(client.rows[0].profile_id, 'user-1')
}

async function testUpdatePr() {
  const client = createClient({ rows: [baseRecord] })
  const result = await updatePersonalRecord('rec-1', { movement: 'Back Squat', value: 120, unit: 'kg', recordDate: '2026-06-01' }, client)
  assert.equal(result.ok, true)
  assert.equal(client.rows[0].value, 120)
}

async function testDeletePr() {
  const client = createClient({ rows: [baseRecord] })
  const result = await deletePersonalRecord('rec-1', client)
  assert.equal(result.ok, true)
  assert.equal(client.rows.length, 0)
}

async function testHistory() {
  const client = createClient({ rows: [baseRecord, { ...baseRecord, id: 'rec-2', movement: 'Clean' }] })
  const result = await getPersonalRecordHistory('Clean', client)
  assert.equal(result.ok, true)
  assert.equal(result.data?.length, 1)
  assert.equal(result.data?.[0].movement, 'Clean')
}

async function testCurrentHigherIsBetter() {
  const client = createClient({ rows: [baseRecord, { ...baseRecord, id: 'rec-2', value: 130 }] })
  const result = await getCurrentPersonalRecords(client)
  assert.equal(result.data?.[0].value, 130)
}

async function testCurrentLowerIsBetter() {
  const client = createClient({ rows: [
    { ...baseRecord, id: 't1', movement: 'Fran', unit: 'tiempo', value: 300 },
    { ...baseRecord, id: 't2', movement: 'Fran', unit: 'tiempo', value: 250 },
  ] })
  const result = await getCurrentPersonalRecords(client)
  assert.equal(result.data?.[0].value, 250)
}

async function testRoundsRepsComparison() {
  const a: Row = { ...baseRecord, movement: 'Cindy', unit: 'reps', value: 10.05, rounds: 10, reps: 5 }
  const b: Row = { ...baseRecord, movement: 'Cindy', unit: 'reps', value: 11.01, rounds: 11, reps: 1 }
  assert.ok(comparePersonalRecords(b, a) < 0)
}

async function testNetworkFailureQueuesPending() {
  const storage = createStorage()
  const client = createClient({ networkError: new Error('network failed') })
  const result = await createPersonalRecord({ movement: 'Clean', value: 90, unit: 'kg', recordDate: '2026-06-02' }, client)
  assert.equal(result.status, 'pending')
  assert.ok(storage)
}

async function testExpiredSession() {
  const client = createClient({ authError: new Error('expired') })
  const result = await getPersonalRecords(client)
  assert.equal(result.status, 'unauthenticated')
}

async function testEmptyUser() {
  const client = createClient()
  const result = await getPersonalRecords(client)
  assert.equal(result.status, 'empty')
  assert.deepEqual(result.data, [])
}

async function testHundredsOfRecords() {
  const rows = Array.from({ length: 300 }, (_, index): Row => ({
    ...baseRecord,
    id: `rec-${index}`,
    movement: index % 2 === 0 ? 'Back Squat' : 'Clean',
    value: index,
  }))
  const client = createClient({ rows })
  const result = await getCurrentPersonalRecords(client)
  assert.equal(result.ok, true)
  assert.equal(result.data?.length, 2)
}

async function testRetryPendingNoop() {
  const storage = createStorage()
  const result = await retryPendingPersonalRecords(createClient(), { localStorage: storage })
  assert.equal(result.ok, true)
  assert.equal(result.data?.remaining, 0)
}

await testReadPr()
await testCreatePr()
await testUpdatePr()
await testDeletePr()
await testHistory()
await testCurrentHigherIsBetter()
await testCurrentLowerIsBetter()
await testRoundsRepsComparison()
await testNetworkFailureQueuesPending()
await testExpiredSession()
await testEmptyUser()
await testHundredsOfRecords()
await testRetryPendingNoop()
