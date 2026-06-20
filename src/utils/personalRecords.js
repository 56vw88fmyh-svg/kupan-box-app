import { prMovements } from '../data/movements.js'
import {
  createPersonalRecord as createPersistentPersonalRecord,
  deletePersonalRecord as deletePersistentPersonalRecord,
  getPersonalRecords,
  personalRecordUnits,
  retryPendingPersonalRecords,
  updatePersonalRecord as updatePersistentPersonalRecord,
} from '../services/personalRecordsService.ts'

export const suggestedMovements = prMovements
export const recordUnits = personalRecordUnits
export { retryPendingPersonalRecords }

function toLegacyResult(result, successMessage = '') {
  if (!result.ok) return { ok: false, status: result.status, message: result.message }
  return {
    ok: true,
    message: successMessage || result.message,
    records: Array.isArray(result.data) ? result.data : undefined,
    record: Array.isArray(result.data) ? undefined : result.data,
  }
}

export async function loadPersonalRecords() {
  const result = await getPersonalRecords()
  return toLegacyResult(result)
}

export async function createPersonalRecord(_profileId, values) {
  const result = await createPersistentPersonalRecord(values)
  return toLegacyResult(result, result.ok ? 'PR registrado. Ese progreso se celebra en KUPAN.' : '')
}

export async function updatePersonalRecord(recordId, values) {
  const result = await updatePersistentPersonalRecord(recordId, values)
  return toLegacyResult(result, result.ok ? 'PR actualizado. Vamos por el siguiente.' : '')
}

export async function deletePersonalRecord(recordId) {
  const result = await deletePersistentPersonalRecord(recordId)
  return result.ok ? { ok: true, status: result.status, message: 'PR eliminado.' } : { ok: false, status: result.status, message: result.message }
}
