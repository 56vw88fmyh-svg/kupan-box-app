import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { prMovements } from '../data/movements.js'

export const suggestedMovements = prMovements

export const recordUnits = ['kg', 'reps', 'tiempo', 'metros', 'calorias']

function getPrError(message = 'No pudimos guardar tu PR. Intenta nuevamente.') {
  return { ok: false, message }
}

function normalizeRecordForm(values) {
  return {
    movement: (values.movement ?? '').trim(),
    value: Number(values.value),
    unit: recordUnits.includes(values.unit) ? values.unit : 'kg',
    record_date: (values.recordDate ?? '').trim(),
    notes: (values.notes ?? '').trim() || null,
  }
}

function validateRecord(record) {
  if (!record.movement || !record.record_date || !record.unit) {
    return 'Selecciona movimiento, unidad y fecha para registrar tu PR.'
  }

  if (!suggestedMovements.includes(record.movement)) {
    return 'Selecciona un movimiento valido desde la lista KUPAN.'
  }

  if (!Number.isFinite(record.value) || record.value <= 0) {
    return 'El valor debe ser un numero mayor a cero.'
  }

  return ''
}

export async function loadPersonalRecords(profileId) {
  if (!isSupabaseConfigured || !supabase) {
    return getPrError('Supabase aun no esta configurado. Agrega tus variables en .env.local.')
  }

  const { data, error } = await supabase
    .from('personal_records')
    .select('id, profile_id, movement, value, unit, record_date, notes, created_at, updated_at')
    .eq('profile_id', profileId)
    .order('record_date', { ascending: false })

  if (error) return getPrError('No pudimos cargar tus PR desde Supabase.')

  return { ok: true, records: data ?? [] }
}

export async function createPersonalRecord(profileId, values) {
  if (!isSupabaseConfigured || !supabase) {
    return getPrError('Supabase aun no esta configurado. Agrega tus variables en .env.local.')
  }

  const record = normalizeRecordForm(values)
  const validationMessage = validateRecord(record)
  if (validationMessage) return getPrError(validationMessage)

  const { data, error } = await supabase
    .from('personal_records')
    .insert({ ...record, profile_id: profileId })
    .select('id, profile_id, movement, value, unit, record_date, notes, created_at, updated_at')
    .single()

  if (error) return getPrError('No pudimos crear tu PR. Revisa los datos e intenta nuevamente.')

  return { ok: true, record: data, message: 'PR registrado. Ese progreso se celebra en KUPAN.' }
}

export async function updatePersonalRecord(recordId, values) {
  if (!isSupabaseConfigured || !supabase) {
    return getPrError('Supabase aun no esta configurado. Agrega tus variables en .env.local.')
  }

  const record = normalizeRecordForm(values)
  const validationMessage = validateRecord(record)
  if (validationMessage) return getPrError(validationMessage)

  const { data, error } = await supabase
    .from('personal_records')
    .update(record)
    .eq('id', recordId)
    .select('id, profile_id, movement, value, unit, record_date, notes, created_at, updated_at')
    .single()

  if (error) return getPrError('No pudimos actualizar tu PR. Intenta nuevamente.')

  return { ok: true, record: data, message: 'PR actualizado. Vamos por el siguiente.' }
}

export async function deletePersonalRecord(recordId) {
  if (!isSupabaseConfigured || !supabase) {
    return getPrError('Supabase aun no esta configurado. Agrega tus variables en .env.local.')
  }

  const { error } = await supabase
    .from('personal_records')
    .delete()
    .eq('id', recordId)

  if (error) return getPrError('No pudimos eliminar este PR. Intenta nuevamente.')

  return { ok: true, message: 'PR eliminado.' }
}
