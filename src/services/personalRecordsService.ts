import { supabase } from '../lib/supabase.js'

export type PersonalRecordUnit = 'kg' | 'reps' | 'tiempo' | 'metros' | 'calorias'
export type ComparisonType = 'higher_is_better' | 'lower_is_better' | 'rounds_reps' | 'distance' | 'calories' | 'custom'
export type PersonalRecordStatus = 'success' | 'empty' | 'error' | 'unauthenticated' | 'offline' | 'pending'

export interface PersonalRecordInput {
  movement: string
  value: string | number
  unit: PersonalRecordUnit | string
  recordDate: string
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
  }
  from<T = unknown>(table: string): SupabaseQuery<T>
}

interface PendingCreate {
  type: 'create'
  clientId: string
  payload: PersonalRecordInput
  createdAt: string
}

interface PendingUpdate {
  type: 'update'
  clientId: string
  recordId: string
  payload: PersonalRecordInput
  createdAt: string
}

interface PendingDelete {
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

const PENDING_PR_KEY = 'kupan_pr_pending_v1'
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
  return text.includes('network') || text.includes('fetch') || text.includes('offline') || text.includes('failed')
}

async function getAuthenticatedUserId(client?: SupabaseClientLike | null): Promise<PersonalRecordResult<string>> {
  const activeClient = getClient(client)
  if (!activeClient) return fail('offline')

  const { data, error } = await activeClient.auth.getUser()
  if (error || !data?.user?.id) return fail('unauthenticated', UNAUTHENTICATED_MESSAGE)
  return ok(data.user.id)
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

function pendingId(type: string, payload: unknown): string {
  return `${type}:${Date.now()}:${Math.random().toString(36).slice(2)}:${JSON.stringify(payload).length}`
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
  result.data.forEach((record) => {
    const key = groupKey(record)
    const current = bestByExercise.get(key)
    if (!current || compareRecords(record, current) < 0) bestByExercise.set(key, record)
  })

  return ok([...bestByExercise.values()].sort((a, b) => a.movement.localeCompare(b.movement)), SUCCESS_MESSAGE)
}

export async function createPersonalRecord(input: PersonalRecordInput, client?: SupabaseClientLike | null): Promise<PersonalRecordResult<PersonalRecord>> {
  const auth = await getAuthenticatedUserId(client)
  if (!auth.ok || !auth.data) return fail(auth.status, auth.message)
  const normalized = normalizeInput(input)
  if (!normalized.ok || !normalized.data) return fail(normalized.status, normalized.message)
  const activeClient = getClient(client)
  if (!activeClient) return fail('offline')

  const payload = { ...normalized.data, profile_id: auth.data }
  const { data, error } = await activeClient
    .from<unknown>(TABLE)
    .insert(payload)
    .select(SELECT_COLUMNS)
    .single()

  if (error) {
    if (isNetworkLikeError(error)) enqueuePending({ type: 'create', clientId: pendingId('create', payload), payload: input, createdAt: new Date().toISOString() })
    return fail(isNetworkLikeError(error) ? 'pending' : 'error', isNetworkLikeError(error) ? PENDING_MESSAGE : PUBLIC_MESSAGE)
  }

  return ok(mapRecord(data), 'PR registrado.')
}

export async function updatePersonalRecord(recordId: string, input: PersonalRecordInput, client?: SupabaseClientLike | null): Promise<PersonalRecordResult<PersonalRecord>> {
  const auth = await getAuthenticatedUserId(client)
  if (!auth.ok || !auth.data) return fail(auth.status, auth.message)
  const normalized = normalizeInput(input)
  if (!normalized.ok || !normalized.data) return fail(normalized.status, normalized.message)
  const activeClient = getClient(client)
  if (!activeClient) return fail('offline')

  const { data, error } = await activeClient
    .from<unknown>(TABLE)
    .update(normalized.data)
    .eq('id', recordId)
    .eq('profile_id', auth.data)
    .select(SELECT_COLUMNS)
    .single()

  if (error) {
    if (isNetworkLikeError(error)) enqueuePending({ type: 'update', clientId: pendingId('update', { recordId, input }), recordId, payload: input, createdAt: new Date().toISOString() })
    return fail(isNetworkLikeError(error) ? 'pending' : 'error', isNetworkLikeError(error) ? PENDING_MESSAGE : PUBLIC_MESSAGE)
  }

  return ok(mapRecord(data), 'PR actualizado.')
}

export async function deletePersonalRecord(recordId: string, client?: SupabaseClientLike | null): Promise<PersonalRecordResult<{ id: string }>> {
  const auth = await getAuthenticatedUserId(client)
  if (!auth.ok || !auth.data) return fail(auth.status, auth.message)
  const activeClient = getClient(client)
  if (!activeClient) return fail('offline')

  const { error } = await activeClient
    .from<unknown>(TABLE)
    .delete()
    .eq('id', recordId)
    .eq('profile_id', auth.data)

  if (error) {
    if (isNetworkLikeError(error)) enqueuePending({ type: 'delete', clientId: pendingId('delete', recordId), recordId, createdAt: new Date().toISOString() })
    return fail(isNetworkLikeError(error) ? 'pending' : 'error', isNetworkLikeError(error) ? PENDING_MESSAGE : PUBLIC_MESSAGE)
  }

  return ok({ id: recordId }, 'PR eliminado.')
}

export async function retryPendingPersonalRecords(client?: SupabaseClientLike | null, globalObject?: StorageHost): Promise<PersonalRecordResult<{ retried: number; remaining: number }>> {
  const queue = readPending(globalObject)
  if (queue.length === 0) return ok({ retried: 0, remaining: 0 }, SUCCESS_MESSAGE)

  const remaining: PendingOperation[] = []
  let retried = 0

  for (const operation of queue) {
    let result: PersonalRecordResult<unknown>
    if (operation.type === 'create') result = await createPersonalRecord(operation.payload, client)
    else if (operation.type === 'update') result = await updatePersonalRecord(operation.recordId, operation.payload, client)
    else result = await deletePersonalRecord(operation.recordId, client)

    if (result.ok) retried += 1
    else remaining.push(operation)
  }

  writePending(remaining, globalObject)
  return remaining.length > 0
    ? { ok: false, status: 'pending', message: 'Algunos récords siguen pendientes.', data: { retried, remaining: remaining.length } }
    : ok({ retried, remaining: 0 }, SUCCESS_MESSAGE)
}

export const personalRecordUnits = VALID_UNITS
export const personalRecordsPendingKey = PENDING_PR_KEY
export const comparePersonalRecords = compareRecords
