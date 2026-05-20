import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

const monthFormatter = new Intl.DateTimeFormat('es-CL', { month: 'long' })

function getBirthdayThisYear(birthDate, baseDate = new Date()) {
  const birthday = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(birthday.getTime())) return null

  return new Date(baseDate.getFullYear(), birthday.getMonth(), birthday.getDate())
}

export function formatBirthdayDayMonth(day, month) {
  if (!day || !month) return 'Sin fecha'
  const birthday = new Date(new Date().getFullYear(), Number(month) - 1, Number(day))
  return `${Number(day)} de ${monthFormatter.format(birthday)}`
}

export function getTurningAge(birthDate) {
  if (!birthDate) return null

  const birthday = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(birthday.getTime())) return null

  return new Date().getFullYear() - birthday.getFullYear()
}

export function getDaysUntilBirthday(birthDate) {
  const today = new Date()
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let birthdayThisYear = getBirthdayThisYear(birthDate, todayDate)

  if (!birthdayThisYear) return null

  if (birthdayThisYear < todayDate) {
    birthdayThisYear = new Date(todayDate.getFullYear() + 1, birthdayThisYear.getMonth(), birthdayThisYear.getDate())
  }

  return Math.ceil((birthdayThisYear.getTime() - todayDate.getTime()) / 86400000)
}

export function mapBirthdayFromProfile(profile) {
  const birthday = new Date(`${profile.birth_date}T00:00:00`)

  return {
    profile_id: profile.id,
    full_name: profile.full_name,
    phone: profile.phone,
    birth_day: birthday.getDate(),
    birth_month: birthday.getMonth() + 1,
    turning_age: getTurningAge(profile.birth_date),
    days_until: getDaysUntilBirthday(profile.birth_date),
    level: profile.level,
  }
}

export async function loadCommunityBirthdays() {
  if (!isSupabaseConfigured || !supabase) return { ok: false, birthdays: [] }

  const { data, error } = await supabase.rpc('birthdays_this_month')
  if (error) return { ok: false, birthdays: [] }

  const currentMonth = new Date().getMonth() + 1

  return {
    ok: true,
    birthdays: (data ?? []).map((birthday) => ({
      ...birthday,
      birth_month: birthday.birth_month ?? currentMonth,
      turning_age: birthday.turning_age ?? null,
    })),
  }
}

export async function loadUpcomingBirthdays(daysAhead = 30) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, birthdays: [] }

  const rpcResult = await supabase.rpc('upcoming_birthdays', { days_ahead: daysAhead })
  if (!rpcResult.error) {
    return { ok: true, birthdays: rpcResult.data ?? [] }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, birth_date, level, status')
    .eq('status', 'active')

  if (error) return { ok: false, birthdays: [] }

  return {
    ok: true,
    birthdays: (data ?? [])
      .filter((profile) => profile.birth_date)
      .map(mapBirthdayFromProfile)
      .filter((birthday) => birthday.days_until !== null && birthday.days_until <= daysAhead)
      .sort((a, b) => a.days_until - b.days_until),
  }
}

export function buildBirthdayGreeting(birthday) {
  return [
    `Hola ${birthday.full_name}, de parte de KUPAN queremos desearte un muy feliz cumpleaños.`,
    'Que sea un gran día, con energía, comunidad y mucho progreso.',
    'Nos vemos en el box para celebrarlo entrenando fuerte y acompañado.',
  ].join('\n')
}
