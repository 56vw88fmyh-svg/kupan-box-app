import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { defaultAdminContent, defaultAppText } from './adminContent.js'

const dayMap = {
  1: { id: 'monday', short: 'Lun', label: 'Lunes' },
  2: { id: 'tuesday', short: 'Mar', label: 'Martes' },
  3: { id: 'wednesday', short: 'Mie', label: 'Miercoles' },
  4: { id: 'thursday', short: 'Jue', label: 'Jueves' },
  5: { id: 'friday', short: 'Vie', label: 'Viernes' },
  6: { id: 'saturday', short: 'Sab', label: 'Sabado' },
  7: { id: 'sunday', short: 'Dom', label: 'Domingo' },
}

function splitLines(value, fallback = []) {
  if (!value) return fallback
  return String(value).split('\n').map((item) => item.trim()).filter(Boolean)
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(price || 0))
}

function buildWeeklySchedule(classes) {
  return Object.entries(dayMap).map(([dayNumber, day]) => {
    const dayClasses = classes.filter((item) => item.day_of_week === Number(dayNumber))
    const blocks = { AM: [], PM: [] }

    dayClasses.forEach((item) => {
      const block = Number(item.time.slice(0, 2)) < 12 ? 'AM' : 'PM'
      blocks[block].push({
        id: item.id,
        time: item.time.slice(0, 5),
        name: item.class_name,
        coach: item.coach ?? 'Coach KUPAN',
        spots: item.max_spots ?? 12,
        maxSpots: item.max_spots ?? 12,
      })
    })

    return {
      ...day,
      note: blocks.AM.length > 0 || blocks.PM.length > 0
        ? 'Reserva tu clase y ven a darlo todo.'
        : 'Horarios por definir.',
      blocks,
    }
  }).filter((day) => day.blocks.AM.length > 0 || day.blocks.PM.length > 0)
}

function flattenSchedule(weeklySchedule) {
  return weeklySchedule.flatMap((day) =>
    ['AM', 'PM'].flatMap((block) =>
      day.blocks[block].map((item) => ({
        ...item,
        level: day.label,
      })),
    ),
  )
}

function mapWod(wod) {
  if (!wod) return defaultAdminContent.wod

  return {
    ...defaultAdminContent.wod,
    title: wod.title || defaultAdminContent.wod.title,
    focus: wod.notes || defaultAdminContent.wod.focus,
    timeCap: wod.time_cap || defaultAdminContent.wod.timeCap,
    warmup: splitLines(wod.warmup, defaultAdminContent.wod.warmup),
    strength: {
      title: 'Skill / Strength',
      details: splitLines(wod.strength, defaultAdminContent.wod.strength.details),
    },
    workout: splitLines(wod.workout, defaultAdminContent.wod.workout),
    notes: splitLines(wod.notes, defaultAdminContent.wod.notes),
  }
}

function mapPlans(plans) {
  const publicPlans = plans.filter((plan) => {
    const name = String(plan.name ?? '').toLowerCase()
    return name.includes('8') || name.includes('12') || name.includes('full')
  })
  if (!publicPlans.length) return defaultAdminContent.plans

  const paymentUrls = {
    '8': 'https://mpago.la/33iSvva',
    '12': 'https://mpago.la/2V6hM5j',
    full: 'https://mpago.la/2wHbG3j',
  }

  const mapped = publicPlans.map((plan) => {
    const normalizedName = String(plan.name ?? '').toLowerCase()
    const tokenCount = normalizedName.includes('12') ? 12 : normalizedName.includes('8') ? 8 : null
    const paymentKey = plan.is_unlimited ? 'full' : String(tokenCount)
    return {
    name: plan.name,
    price: formatPrice(plan.price),
    classes: plan.is_unlimited ? 'Una reserva diaria, lunes a viernes' : `${tokenCount ?? ''} clases por 30 días`,
    paymentUrl: paymentUrls[paymentKey] ?? '',
    highlight: tokenCount === 12,
    benefits: [
      plan.is_unlimited ? 'Una reserva diaria de lunes a viernes' : `${tokenCount} tokens no acumulables`,
      'Vigencia de 30 días desde la activación',
      'Reserva tu clase y ven a darlo todo',
      'Somos comunidad, esfuerzo y progreso',
    ],
    }
  })

  return [...mapped, ...defaultAdminContent.plans.filter((plan) => plan.name === 'Pase diario' || plan.trial)]
}

function mapAppText(settings) {
  const appText = { ...defaultAppText }

  settings.forEach((setting) => {
    if (setting.key === 'home_eyebrow') appText.homeEyebrow = setting.value
    if (setting.key === 'home_title') appText.homeTitle = setting.value
    if (setting.key === 'home_body') appText.homeBody = setting.value
    if (setting.key === 'reservations_title') appText.reservationsTitle = setting.value
    if (setting.key === 'reservations_body') appText.reservationsBody = setting.value
    if (setting.key === 'community_phrase') appText.communityPhrase = setting.value
  })

  return appText
}

export async function loadSharedContent() {
  if (!isSupabaseConfigured || !supabase) return defaultAdminContent

  const [wod, schedule, plans, posts, settings] = await Promise.all([
    supabase.from('wod').select('id, date, title, warmup, strength, workout, time_cap, notes').order('date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('class_schedule').select('id, day_of_week, time, class_name, coach, max_spots, active').eq('active', true).order('day_of_week').order('time'),
    supabase.from('plans').select('id, name, price, classes_per_week, is_unlimited, active').eq('active', true).order('price'),
    supabase.from('community_posts').select('id, type, title, content, event_date, active, created_at').eq('active', true).order('created_at', { ascending: false }),
    supabase.from('app_settings').select('key, value'),
  ])

  const weeklySchedule = schedule.error ? defaultAdminContent.weeklySchedule : buildWeeklySchedule(schedule.data ?? [])
  const schedulePreview = weeklySchedule.length > 0 ? flattenSchedule(weeklySchedule) : defaultAdminContent.schedule
  const communityItems = posts.error ? [] : posts.data ?? []
  const communityEvents = communityItems
    .filter((post) => post.type === 'evento')
    .map((post) => ({
      date: post.event_date ? new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(new Date(`${post.event_date}T00:00:00`)) : 'Pronto',
      title: post.title,
      detail: post.content,
    }))
  const communityPosts = communityItems
    .filter((post) => post.type !== 'evento')
    .map((post) => ({
      tag: post.type ?? 'KUPAN',
      title: post.title,
      text: post.content,
    }))

  return {
    ...defaultAdminContent,
    appText: settings.error ? defaultAppText : mapAppText(settings.data ?? []),
    wod: wod.error ? defaultAdminContent.wod : mapWod(wod.data),
    weeklySchedule: weeklySchedule.length > 0 ? weeklySchedule : defaultAdminContent.weeklySchedule,
    schedule: schedulePreview,
    plans: plans.error ? defaultAdminContent.plans : mapPlans(plans.data ?? []),
    communityEvents: communityEvents.length > 0 ? communityEvents : defaultAdminContent.communityEvents,
    communityPosts: communityPosts.length > 0 ? communityPosts : defaultAdminContent.communityPosts,
  }
}

export async function saveAppSetting(key, value) {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  return { ok: !error, message: error ? 'No pudimos guardar el texto.' : 'Texto guardado correctamente.' }
}
