export const ROSTER_STATES = [
  { id: 'all', label: 'Alumnos activos' },
  { id: 'red', label: 'Requieren renovación' },
  { id: 'yellow', label: 'Próximos a renovar' },
  { id: 'green', label: 'Al día' },
  { id: 'gray', label: 'Sin plan vigente' },
]

function dateNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return null
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null
}

export function getRosterStatus(student, today) {
  const gray = (reason) => ({ color: 'gray', label: 'Sin plan vigente', reasons: [reason], days: null })
  if (!student.membership_id) return gray('Sin plan registrado')
  if (student.membership_status === 'paused') return gray('Plan pausado')
  if (student.membership_status === 'cancelled') return gray('Plan cancelado')
  if (student.payment_status !== 'paid') return gray('Plan sin pago confirmado')
  if (!['active', 'expired'].includes(student.membership_status)) return gray('Plan no activo')

  const start = dateNumber(student.start_date)
  const end = dateNumber(student.end_date)
  const effectiveEnd = dateNumber(student.effective_end_date)
  const now = dateNumber(today)
  if (start === null || end === null || effectiveEnd === null || now === null || end < start) return gray('Fechas por revisar')
  if (start > now) return gray(`Comienza el ${formatRosterDate(student.start_date)}`)
  const days = Math.round((Math.min(end, effectiveEnd) - now) / 86400000)
  const tokens = student.remaining_tokens
  const finiteTokens = Number.isInteger(tokens) && tokens >= 0
  const reasons = []
  if (days < 0 || student.membership_status === 'expired') reasons.push('Plan vencido')
  if (!student.is_unlimited && finiteTokens && tokens === 0) reasons.push('Sin tokens')
  if (reasons.length) return { color: 'red', label: 'Requiere renovación', reasons, days }
  if (!student.is_unlimited && !finiteTokens) return gray('Tokens por revisar')
  if (days <= 7) reasons.push(days === 0 ? 'Vence hoy' : `Vence en ${days} ${days === 1 ? 'día' : 'días'}`)
  if (!student.is_unlimited && tokens <= 2) reasons.push(`Quedan ${tokens} ${tokens === 1 ? 'token' : 'tokens'}`)
  if (reasons.length) return { color: 'yellow', label: 'Atención', reasons, days }
  return { color: 'green', label: 'Al día', reasons: [`${days} días de vigencia`], days }
}

export function formatRosterDate(value) {
  if (dateNumber(value) === null) return '—'
  return value.split('-').reverse().join('/')
}

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
}

export function selectRosterStudents(students, today, query = '', filter = 'all') {
  const priority = { red: 0, yellow: 1, gray: 2, green: 3 }
  return students.map((student) => ({ ...student, signal: getRosterStatus(student, today) }))
    .filter((student) => normalize(student.full_name).includes(normalize(query)))
    .filter((student) => filter === 'all' || student.signal.color === filter)
    .sort((a, b) => priority[a.signal.color] - priority[b.signal.color]
      || (a.signal.days ?? Infinity) - (b.signal.days ?? Infinity)
      || a.full_name.localeCompare(b.full_name, 'es'))
}
