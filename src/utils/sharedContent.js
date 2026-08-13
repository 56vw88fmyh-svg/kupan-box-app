import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { defaultAdminContent, defaultAppText } from './adminContent.js'
import { getPaymentUrlForPlan } from '../data/paymentLinks.js'
import { gymConfig } from '../config/gymConfig.js'

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
  return new Intl.NumberFormat(gymConfig.localization.locale, { style: 'currency', currency: gymConfig.localization.currency, maximumFractionDigits: 0 }).format(Number(price || 0))
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
        coach: item.coach ?? `Coach ${gymConfig.identity.name}`,
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
  if (gymConfig.id !== 'kupan') {
    return plans.map((plan, index) => {
      const configuredPlan = gymConfig.operations.plans.find((item) => item.name.toLowerCase() === String(plan.name).toLowerCase())
      const frequency = configuredPlan?.frequency
        ?? (plan.is_unlimited ? 'Plan Full por 30 días' : `${Number(plan.classes_per_week || 0) * 4} clases al mes`)

      return {
        name: plan.name,
        price: formatPrice(plan.price),
        classes: frequency,
        paymentUrl: '',
        highlight: index === 1,
        benefits: [
          frequency,
          `Reserva hasta ${gymConfig.operations.reservationClosesMinutes} minutos antes de la clase`,
          `Cancelación con ${gymConfig.operations.cancellationWindowMinutes} minutos de anticipación`,
          gymConfig.identity.slogan,
        ],
      }
    })
  }

  function getPublicPlanKey(plan) {
    const name = String(plan?.name ?? '').toLowerCase()
    if (name.includes('pase') && name.includes('diario')) return 'daily'
    if (name.includes('full') || plan?.is_unlimited) return 'full'
    if (name.includes('12')) return '12'
    if (name.includes('8')) return '8'
    return ''
  }

  const publicPlans = plans.filter((plan) => {
    return Boolean(getPublicPlanKey(plan))
  })
  if (!publicPlans.length) return defaultAdminContent.plans

  const mapped = publicPlans.map((plan) => {
    const normalizedName = String(plan.name ?? '').toLowerCase()
    const isDailyPass = normalizedName.includes('pase') && normalizedName.includes('diario')
    const isFull = normalizedName.includes('full') || plan.is_unlimited
    const tokenCount = normalizedName.includes('12') ? 12 : normalizedName.includes('8') ? 8 : isDailyPass ? 1 : null
    return {
      name: plan.name,
      price: formatPrice(plan.price),
      classes: isDailyPass ? '1 clase' : isFull ? 'Plan Full por 30 días' : `${tokenCount ?? ''} clases por 30 días`,
      paymentUrl: getPaymentUrlForPlan(plan.name),
      highlight: tokenCount === 12,
      benefits: isDailyPass
        ? ['Una clase CrossFit', 'Sujeto a cupos disponibles', 'Ideal para visitas o entrenamiento puntual']
        : isFull
          ? ['Una reserva diaria de lunes a viernes', 'Vigencia de 30 días desde la activación', 'No descuenta tokens', 'Entrena fuerte, entrena acompañado']
        : [
          `${tokenCount} tokens no acumulables`,
          'Vigencia de 30 días desde la activación',
          'Reserva tu clase y ven a darlo todo',
          'Somos comunidad, esfuerzo y progreso',
        ],
    }
  })

  const mappedKeys = new Set(publicPlans.map(getPublicPlanKey))
  const missingPublicPlans = defaultAdminContent.plans.filter((plan) => !plan.trial && !mappedKeys.has(getPublicPlanKey(plan)))
  const trialPlan = defaultAdminContent.plans.filter((plan) => plan.trial)
  return [...mapped, ...missingPublicPlans, ...trialPlan]
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
      tag: post.type ?? gymConfig.identity.name,
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
