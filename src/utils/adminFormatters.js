export function formatDate(date) {
  if (!date) return 'Sin fecha'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

// Fecha calendario en Chile. Se usa para evitar cambios de día por UTC en vistas operativas.
export function getChileDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatMoney(value) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0))
}

export function toTime(value) {
  return value ? String(value).slice(0, 5) : ''
}

export function getDateTimeValue(date, time) {
  return `${date ?? ''}T${String(time ?? '00:00').slice(0, 5)}`
}
