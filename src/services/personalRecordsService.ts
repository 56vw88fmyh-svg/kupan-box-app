import { supabase } from '../lib/supabase.js'

export type PersonalRecordUnit = 'kg' | 'reps' | 'tiempo' | 'metros' | 'calorias'
export type ComparisonType = 'higher_is_better' | 'lower_is_better' | 'rounds_reps' | 'distance' | 'calories' | 'custom'
export type PersonalRecordStatus = 'success' | 'empty' | 'error' | 'unauthenticated' | 'offline' | 'pending'

export interface PersonalRecordInput {
  movement: string
  value: string | number
  unit: PersonalRecordUnit | string
  recordDate: string
  resultContext?: { wod_id: string; version: string; level: string; result_type: string }
  notes?: string | null
  rounds?: string | number | null
  reps?: string | number | null
  timeSeconds?: string | number | null
}

export interface PersonalRecord {
  id: string
  profile_id: string
  movement: string
  value: number
  unit: PersonalRecordUnit
  record_date: string
  notes: string | null
  created_at?: string | null
  updated_at?: string | null
  rounds?: number | null
  reps?: number | null
  time_seconds?: number | null
}

export interface PersonalRecordResult<T> {
  ok: boolean
  status: PersonalRecordStatus
  message: string
  data?: T
}

interface AuthUser {
  id: string
}

interface AuthResponse {
  data: { user: AuthUser | null } | null
  error: unknown | null
}

interface QueryResponse<T> {
  data: T | null
  error: unknown | null
}

interface SupabaseQuery<T> extends PromiseLike<QueryResponse<T>> {
  select(columns?: string): SupabaseQuery<T>
  eq(column: string, value: unknown): SupabaseQuery<T>
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery<T>
  insert(payload: unknown): SupabaseQuery<T>
  update(payload: unknown): SupabaseQuery<T>
  delete(): SupabaseQuery<T>
  single(): Promise<QueryResponse<T>>
}

interface SupabaseClientLike {
  auth: {
    getUser(): Promise<AuthResponse>
    getSession?(): Promise<{ data: { session: { user: AuthUser } | null } | null; error: unknown }>
  }
  from<T = unknown>(table: string): SupabaseQuery<T>
}

interface PendingCreate {
  ownerId: string
  type: 'create'
  clientId: string
  payload: PersonalRecordInput
  createdAt: string
}

interface PendingUpdate {
  ownerId: string
  type: 'update'
  clientId: string
  recordId: string
  payload: PersonalRecordInput
  createdAt: string
}

interface PendingDelete {
  ownerId: string
  type: 'delete'
  clientId: string
  recordId: string
  createdAt: string
}

type PendingOperation = PendingCreate | PendingUpdate | PendingDelete

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface StorageHost {
  localStorage?: StorageLike | null
}

const PENDING_PR_KEY = 'kupan_pr_pending_v2'
const TABLE = 'personal_records'
const SELECT_COLUMNS = 'id, profile_id, movement, value, unit, record_date, notes, created_at, updated_at, rounds, reps, time_seconds'
const PUBLIC_MESSAGE = 'No pudimos sincronizar tus récords. Intenta nuevamente.'
const PENDING_MESSAGE = 'Sin conexión. Reintentaremos sincronizar tus récords.'
const UNAUTHENTICATED_MESSAGE = 'Tu sesión expiró. Inicia sesión nuevamente.'
const EMPTY_MESSAGE = 'Aún no tienes PR registrados.'
const SUCCESS_MESSAGE = 'Récords sincronizados.'
const VALID_UNITS: PersonalRecordUnit[] = ['kg', 'reps', 'tiempo', 'metros', 'calorias']

function getClient(client?: SupabaseClientLike | null): SupabaseClientLike | null {
  return client ?? (supabase as SupabaseClientLike | null)
}

function ok<T>(data: T, message = SUCCESS_MESSAGE): PersonalRecordResult<T> {
  return { ok: true, status: Array.isArray(data) && data.length === 0 ? 'empty' : 'success', message, data }
}

function fail<T>(status: PersonalRecordStatus, message = PUBLIC_MESSAGE): PersonalRecordResult<T> {
  return { ok: false, status, message }
}

function isNetworkLikeError(error: unknown): boolean {
  const text = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
  const message = typeof error === 'object' && error ? String((error as { message?: string }).message ?? '') : text
  return /network|fetch|offline|failed to fetch/i.test(message)
}

async function getAuthenticatedUserId(client?: SupabaseClientLike | null): Promise<PersonalRecordResult<string>> {
  const activeClient = getClient(client)
  if (!activeClient) return fail('offline')

  try {
    const { data, error } = await activeClient.auth.getUser()
    if (!error && data?.user?.id) return ok(data.user.id)
    if (!isNetworkLikeError(error)) return fail('unauthenticated', UNAUTHENTICATED_MESSAGE)
  } catch {
    // Offline intent can use the cached owner; server RLS still verifies every write.
  }
  const session = await activeClient.auth.getSession?.()
  const owner = session?.data?.session?.user?.id
  return owner ? ok(owner) : fail('unauthenticated', UNAUTHENTICATED_MESSAGE)
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeDate(value: unknown): string | null {
  const text = normalizeText(value)
  if (!text) return null
  const date = new Date(text.includes('T') ? text : `${text}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const dateText = date.toISOString().slice(0, 10)
  if (dateText < '1900-01-01') return null
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date > tomorrow) return null
  return dateText
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(String(value).replace(',', '.').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeUnit(value: unknown): PersonalRecordUnit {
  const unit = normalizeText(value).toLowerCase()
  if (unit === 'time' || unit === 'seconds' || unit === 'segundos') return 'tiempo'
  if (unit === 'meters') return 'metros'
  if (unit === 'calories') return 'calorias'
  return VALID_UNITS.includes(unit as PersonalRecordUnit) ? unit as PersonalRecordUnit : 'kg'
}

function getComparisonType(record: Pick<PersonalRecord, 'unit' | 'movement'> & Partial<Pick<PersonalRecord, 'rounds' | 'reps'>>): ComparisonType {
  if (record.rounds !== null && record.rounds !== undefined) return 'rounds_reps'
  if (record.unit === 'tiempo') return 'lower_is_better'
  if (record.unit === 'metros') return 'distance'
  if (record.unit === 'calorias') return 'calories'
  return 'higher_is_better'
}

function normalizeInput(input: PersonalRecordInput): PersonalRecordResult<Omit<PersonalRecord, 'id' | 'profile_id' | 'created_at' | 'updated_at'>> {
  const movement = normalizeText(input.movement)
  const unit = normalizeUnit(input.unit)
  const value = toNumber(input.value)
  const recordDate = normalizeDate(input.recordDate)
  const rounds = toNumber(input.rounds)
  const reps = toNumber(input.reps)
  const timeSeconds = toNumber(input.timeSeconds)
  const notes = normalizeText(input.notes)

  if (!movement || !recordDate || value === null || value < 0) return fail('error', 'Revisa los datos del récord.')
  if ((rounds !== null && rounds < 0) || (reps !== null && reps < 0) || (timeSeconds !== null && timeSeconds < 0)) return fail('error', 'Revisa los datos del récord.')

  return ok({
    ...(input.resultContext ? { result_context: input.resultContext } : {}),
    movement,
    value,
    unit,
    record_date: recordDate,
    notes: notes || null,
    rounds: rounds === null ? null : Math.round(rounds),
    reps: reps === null ? null : Math.round(reps),
    time_seconds: timeSeconds === null ? unit === 'tiempo' ? Math.round(value) : null : Math.round(timeSeconds),
  })
}

function mapRecord(row: unknown): PersonalRecord {
  const record = row as Record<string, unknown>
  return {
    id: String(record.id),
    profile_id: String(record.profile_id ?? record.user_id ?? ''),
    movement: normalizeText(record.movement ?? record.exercise_name),
    value: Number(record.value ?? 0),
    unit: normalizeUnit(record.unit),
    record_date: String(record.record_date ?? record.achieved_at ?? ''),
    notes: record.notes ? String(record.notes) : null,
    created_at: record.created_at ? String(record.created_at) : null,
    updated_at: record.updated_at ? String(record.updated_at) : null,
    rounds: record.rounds === null || record.rounds === undefined ? null : Number(record.rounds),
    reps: record.reps === null || record.reps === undefined ? null : Number(record.reps),
    ...(record.result_context ? { result_context: record.result_context } : {}),
    time_seconds: record.time_seconds === null || record.time_seconds === undefined ? null : Number(record.time_seconds),
  }
}

function compareRecords(a: PersonalRecord, b: PersonalRecord): number {
  const comparisonType = getComparisonType(a)
  if (comparisonType === 'lower_is_better') return a.value - b.value
  if (comparisonType === 'rounds_reps') {
    const roundDiff = Number(b.rounds ?? Math.floor(b.value)) - Number(a.rounds ?? Math.floor(a.value))
    if (roundDiff !== 0) return roundDiff
    return Number(b.reps ?? 0) - Number(a.reps ?? 0)
  }
  return b.value - a.value
}

function groupKey(record: PersonalRecord): string {
  return `${record.movement.trim().toLowerCase()}|${record.unit}`
}

function getStorage(globalObject?: StorageHost): StorageLike | null {
  if (globalObject) return globalObject.localStorage ?? null
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function readPending(globalObject?: StorageHost): PendingOperation[] {
  try {
    const raw = getStorage(globalObject)?.getItem(PENDING_PR_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is PendingOperation => Boolean(item && typeof item === 'object' && 'type' in item)) : []
  } catch {
    return []
  }
}

function writePending(queue: PendingOperation[], globalObject?: StorageHost): void {
  getStorage(globalObject)?.setItem(PENDING_PR_KEY, JSON.stringify(queue))
}

function enqueuePending(operation: PendingOperation, globalObject?: StorageHost): void {
  const queue = readPending(globalObject)
  if (queue.some((item) => item.clientId === operation.clientId)) return
  writePending([...queue, operation], globalObject)
}

function tableFor(input?: PersonalRecordInput): string {
  return input?.resultContext ? 'workout_results' : TABLE
}

function columnsFor(input?: PersonalRecordInput): string {
  return SELECT_COLUMNS + (input?.resultContext ? ', result_context' : '')
}

export async function getPersonalRecords(client?: SupabaseClientLike | null): Promise<PersonalRecordResult<PersonalRecord[]>> {
  const auth = await getAuthenticatedUserId(client)
  if (!auth.ok || !auth.data) return fail(auth.status, auth.message)
  const activeClient = getClient(client)
  if (!activeClient) return fail('offline')

  const { data, error } = await activeClient
    .from<unknown[]>(TABLE)
    .select(SELECT_COLUMNS)
    .eq('profile_id', auth.data)
    .order('record_date', { ascending: false })

  if (error) return fail(isNetworkLikeError(error) ? 'offline' : 'error')
  const records = (data ?? []).map(mapRecord)
  return ok(records, records.length === 0 ? EMPTY_MESSAGE : SUCCESS_MESSAGE)
}

export async function getPersonalRecordHistory(movement?: string, client?: SupabaseClientLike | null): Promise<PersonalRecordResult<PersonalRecord[]>> {
  const result = await getPersonalRecords(client)
  if (!result.ok || !result.data) return result
  const normalizedMovement = normalizeText(movement).toLowerCase()
  const records = normalizedMovement
    ? result.data.filter((record) => record.movement.toLowerCase() === normalizedMovement)
    : result.data
  return ok(records, records.length === 0 ? EMPTY_MESSAGE : SUCCESS_MESSAGE)
}

export async function getCurrentPersonalRecords(client?: SupabaseClientLike | null): Promise<PersonalRecordResult<PersonalRecord[]>> {
  const result = await getPersonalRecords(client)
  if (!result.ok || !result.data) return result

  const bestByExercise = new Map<string, PersonalRecord>()
  result.data.filter(record => !/^WOD:/i.test(record.movement)).forEach((record) => {
    const key = groupKey(record)
    const current = bestByExercise.get(key)
    if (!current || compareRecords(record, current) < 0) bestByExercise.set(key, record)
  })

  return ok([...bestByExercise.values()].sort((a, b) => a.movement.localeCompare(b.movement)), SUCCESS_MESSAGE)
}

// Save intent before transmission. The same UUID is reused after a lost response.
async function performOperation(operation: PendingOperation, client?: SupabaseClientLike | null): Promise<PersonalRecordResult<unknown>> {
  const auth = await getAuthenticatedUserId(client)
  if (!auth.ok || auth.data !== operation.ownerId) return fail('unauthenticated', UNAUTHENTICATED_MESSAGE)
  const activeClient = getClient(client)
  if (!activeClient) return fail('offline')
  try {
    if (operation.type === 'delete') {
      const { error } = await activeClient.from(TABLE).delete().eq('id', operation.recordId).eq('profile_id', operation.ownerId)
      return error ? fail('pending', PENDING_MESSAGE) : ok({ id: operation.recordId })
    }
    const normalized = normalizeInput(operation.payload)
    if (!normalized.ok || !normalized.data) return normalized
    const table = tableFor(operation.payload)
    const columns = columnsFor(operation.payload)
    const query = activeClient.from(table)
    const response = operation.type === 'create'
      ? await query.insert({ ...normalized.data, id: operation.clientId, profile_id: operation.ownerId }).select(columns).single()
      : await query.update(normalized.data).eq('id', operation.recordId).eq('profile_id', operation.ownerId).select(columns).single()
    if (response.error) {
      // A committed insert whose response was lost is safe to acknowledge on retry.
      if (operation.type === 'create' && (response.error as { code?: string }).code === '23505') {
        const existing = await activeClient.from(table).select(columns).eq('id', operation.clientId).eq('profile_id', operation.ownerId).single()
        if (!existing.error && existing.data) return ok(mapRecord(existing.data))
      }
      return fail(isNetworkLikeError(response.error) ? 'pending' : 'error', isNetworkLikeError(response.error) ? PENDING_MESSAGE : PUBLIC_MESSAGE)
    }
    return ok(mapRecord(response.data))
  } catch {
    return fail('pending', PENDING_MESSAGE)
  }
}

async function saveOperation(operation: PendingOperation, client?: SupabaseClientLike | null): Promise<PersonalRecordResult<unknown>> {
  try { enqueuePending(operation) } catch { return fail('error', 'No pudimos guardar el cambio de forma segura en este dispositivo.') }
  const result = await performOperation(operation, client)
  if (result.ok || result.status === 'error') writePending(readPending().filter(item => item.clientId !== operation.clientId))
  return result
}

export async function createPersonalRecord(input: PersonalRecordInput, client?: SupabaseClientLike | null): Promise<PersonalRecordResult<PersonalRecord>> {
  const auth = await getAuthenticatedUserId(client)
  if (!auth.ok || !auth.data) return fail(auth.status, auth.message)
  const normalized = normalizeInput(input)
  if (!normalized.ok) return fail(normalized.status, normalized.message)
  // Repeated taps/retries of an unresolved form reuse its original operation.
  const existing = readPending().find(item => item.type === 'create' && item.ownerId === auth.data && JSON.stringify(item.payload) === JSON.stringify(input))
  const operation: PendingCreate = existing as PendingCreate ?? { type: 'create', ownerId: auth.data, clientId: crypto.randomUUID(), payload: input, createdAt: new Date().toISOString() }
  return saveOperation(operation, client) as Promise<PersonalRecordResult<PersonalRecord>>
}

export async function updatePersonalRecord(recordId: string, input: PersonalRecordInput, client?: SupabaseClientLike | null): Promise<PersonalRecordResult<PersonalRecord>> {
  const auth = await getAuthenticatedUserId(client)
  if (!auth.ok || !auth.data) return fail(auth.status, auth.message)
  return saveOperation({ type: 'update', ownerId: auth.data, clientId: crypto.randomUUID(), recordId, payload: input, createdAt: new Date().toISOString() }, client) as Promise<PersonalRecordResult<PersonalRecord>>
}

export async function deletePersonalRecord(recordId: string, client?: SupabaseClientLike | null): Promise<PersonalRecordResult<{ id: string }>> {
  const auth = await getAuthenticatedUserId(client)
  if (!auth.ok || !auth.data) return fail(auth.status, auth.message)
  return saveOperation({ type: 'delete', ownerId: auth.data, clientId: crypto.randomUUID(), recordId, createdAt: new Date().toISOString() }, client) as Promise<PersonalRecordResult<{ id: string }>>
}

let retryInFlight: Promise<PersonalRecordResult<{ retried: number; remaining: number }>> | null = null
export function retryPendingPersonalRecords(client?: SupabaseClientLike | null, globalObject?: StorageHost): Promise<PersonalRecordResult<{ retried: number; remaining: number }>> {
  if (retryInFlight) return retryInFlight
  retryInFlight = (async () => {
    const auth = await getAuthenticatedUserId(client)
    if (!auth.ok || !auth.data) return fail<{ retried: number; remaining: number }>(auth.status, auth.message)
    const queue = readPending(globalObject).filter(item => item.ownerId === auth.data)
    let retried = 0
    for (const operation of queue) {
      const result = await performOperation(operation, client)
      if (result.ok) {
        retried++
        // Re-read to preserve work added while the request was in flight.
        writePending(readPending(globalObject).filter(item => item.clientId !== operation.clientId), globalObject)
      }
      if (result.status === 'unauthenticated') break
    }
    const remaining = readPending(globalObject).filter(item => item.ownerId === auth.data).length
    return { ok: remaining === 0, status: remaining ? 'pending' as const : 'success' as const, message: remaining ? PENDING_MESSAGE : SUCCESS_MESSAGE, data: { retried, remaining } }
  })().finally(() => { retryInFlight = null })
  return retryInFlight
}

export async function getWorkoutResultHistory(context: NonNullable<PersonalRecordInput['resultContext']>, client?: SupabaseClientLike | null) {
  const auth = await getAuthenticatedUserId(client)
  if (!auth.ok || !auth.data) return fail<PersonalRecord[]>(auth.status, auth.message)
  const { data, error } = await getClient(client)!.from<unknown[]>('workout_results').select(SELECT_COLUMNS + ', result_context').eq('profile_id', auth.data).order('record_date', { ascending: false })
  if (error) return fail<PersonalRecord[]>(isNetworkLikeError(error) ? 'offline' : 'error', PUBLIC_MESSAGE)
  return ok((data ?? []).filter(row => {
    const saved = (row as { result_context: typeof context }).result_context
    return saved && saved.wod_id === context.wod_id && saved.version === context.version && saved.level === context.level && saved.result_type === context.result_type
  }).map(mapRecord))
}

export const personalRecordUnits = VALID_UNITS
export const personalRecordsPendingKey = PENDING_PR_KEY
export const comparePersonalRecords = compareRecords
