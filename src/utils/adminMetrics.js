export function addDays(dateText, days) {
  const date = dateText ? new Date(`${dateText}T00:00:00`) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function calculateDaysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 999
  return Math.ceil((end.getTime() - start.getTime()) / 86400000)
}

export function getPlanTokenTotal(plan) {
  if (!plan || plan.is_unlimited) return ''
  const match = String(plan.name ?? '').match(/\d+/)
  if (match) return Number(match[0])
  return plan.classes_per_week ? Number(plan.classes_per_week) * 4 : ''
}

export function getMembershipTokens(membership) {
  const isUnlimited = Boolean(membership?.plan?.is_unlimited)
  const total = membership?.classes_total
  const used = Number(membership?.classes_used ?? 0)
  return {
    total: isUnlimited ? 'Ilimitado' : total ?? 0,
    used: isUnlimited ? 'No descuenta' : used,
    remaining: isUnlimited ? 'Ilimitado' : Math.max(Number(total ?? 0) - used, 0),
  }
}

// Día de semana operacional de Chile: lunes=1, ..., domingo=7.
export function getChileDayOfWeek(date = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    weekday: 'short',
  }).format(date)

  return {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  }[weekday] ?? 1
}
