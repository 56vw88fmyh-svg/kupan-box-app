export function parsePositiveNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(String(value).replace(',', '.'))
  return Number.isFinite(number) && number > 0 ? number : null
}

export function parseTimeToSeconds(value) {
  const text = String(value ?? '').trim()
  if (/^\d+$/.test(text)) return Number(text) > 0 ? Number(text) : null
  if (!/^\d+:([0-5]\d)(:[0-5]\d)?$/.test(text)) return null
  const parts = text.split(':').map(Number)
  const total = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2]
  return total > 0 && Number.isSafeInteger(total) ? total : null
}

export function buildResultInput(wod, selectedLevel, draft) {
  const movement = `WOD: ${wod.title}`
  const notes = [
    `Resultado WOD ${wod.date}`,
    `Nivel ${selectedLevel}`,
    draft.notes?.trim() ? draft.notes.trim() : '',
  ].filter(Boolean).join(' · ')

  if (draft.type === 'time') {
    const seconds = parseTimeToSeconds(draft.time)
    if (!seconds) return { ok: false, message: 'Ingresa un tiempo válido. Puedes usar 12:35 o segundos.' }
    return { ok: true, value: { movement, value: seconds, unit: 'tiempo', recordDate: wod.date, notes, timeSeconds: seconds } }
  }

  if (draft.type === 'rounds_reps') {
    const rounds = Number(draft.rounds)
    const reps = Number(draft.reps)
    if (draft.rounds === '' || !Number.isSafeInteger(rounds) || !Number.isSafeInteger(reps) || rounds < 0 || reps < 0 || rounds + reps <= 0) return { ok: false, message: 'Ingresa rondas y repeticiones válidas.' }
    return { ok: true, value: { movement, value: rounds, unit: 'reps', recordDate: wod.date, notes, rounds, reps } }
  }

  if (draft.type === 'load') {
    const load = parsePositiveNumber(draft.load)
    if (!load) return { ok: false, message: 'Ingresa una carga válida en kilos.' }
    return { ok: true, value: { movement, value: load, unit: 'kg', recordDate: wod.date, notes } }
  }

  if (draft.type === 'distance') {
    const distance = parsePositiveNumber(draft.distance)
    if (!distance) return { ok: false, message: 'Ingresa una distancia válida en metros.' }
    return { ok: true, value: { movement, value: distance, unit: 'metros', recordDate: wod.date, notes } }
  }

  const calories = parsePositiveNumber(draft.calories)
  if (!calories) return { ok: false, message: 'Ingresa calorías válidas.' }
  return { ok: true, value: { movement, value: calories, unit: 'calorias', recordDate: wod.date, notes } }
}

export function isBetterResult(input, record) {
  if (!record) return true
  if (input.unit === 'tiempo') return Number(input.value) < Number(record.value)
  if (input.rounds != null || input.reps != null) {
    const inputRounds = Number(input.rounds ?? Math.floor(Number(input.value)))
    const recordRounds = Number(record.rounds ?? Math.floor(Number(record.value)))
    if (inputRounds !== recordRounds) return inputRounds > recordRounds
    return Number(input.reps ?? 0) > Number(record.reps ?? 0)
  }
  return Number(input.value) > Number(record.value)
}


export function resultContext(wod, level, resultType) {
  // Store the exact prescription, not a mutable display title or a weak hash.
  const levelPlan = wod.scaling?.find(item => item.level === level)
  const benchmark = String(wod.benchmarkId ?? '').trim().toLowerCase()
  return { wod_id: String(wod.id), version: JSON.stringify([wod.workout, wod.strength, wod.timeCap, wod.scaling]), level, result_type: resultType, ...(benchmark ? { benchmark_id: benchmark, comparison_key: JSON.stringify([levelPlan?.items?.length ? levelPlan.items : wod.workout, wod.strength, wod.timeCap]) } : {}) }
}
