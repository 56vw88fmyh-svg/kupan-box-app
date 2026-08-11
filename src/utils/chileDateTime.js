export const CHILE_TIME_ZONE = 'America/Santiago'

const chileDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHILE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const chileDateTimePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHILE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function getChileDateKey(date = new Date()) {
  return chileDateKeyFormatter.format(date)
}

export function getChileDateTime(dateKey, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey)) || !/^\d{2}:\d{2}/.test(String(time))) return null
  const [year, month, day] = String(dateKey).split('-').map(Number)
  const [hour, minute] = String(time).split(':').map(Number)
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0)

  function getOffset(timestamp) {
    const parts = Object.fromEntries(
      chileDateTimePartsFormatter.formatToParts(new Date(timestamp))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    )
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
    return representedAsUtc - timestamp
  }

  const firstPass = utcGuess - getOffset(utcGuess)
  const resolved = new Date(utcGuess - getOffset(firstPass))
  return Number.isNaN(resolved.getTime()) ? null : resolved
}

export function formatChileNaturalDate(date = new Date()) {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatChileTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}
