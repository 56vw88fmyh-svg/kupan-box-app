/**
 * Public, versioned configuration for each isolated deployment.
 *
 * Secrets and Supabase credentials never belong in this model. Each gym uses
 * its own deployment environment and its own Supabase project.
 *
 * @typedef {Object} GymConfig
 * @property {string} id
 * @property {{name: string, legalName?: string, taxId?: string, slogan: string, tagline?: string, descriptor: string}} identity
 * @property {{email: string, phone?: string, whatsapp?: string, address?: string, city?: string, instagram?: string, website?: string}} contact
 * @property {{locale: string, timezone: string, currency: string}} localization
 * @property {{defaultClassDurationMinutes: number, classDurations: Record<string, number>, defaultClassCapacity: number|null, reservationClosesMinutes: number, cancellationWindowMinutes: number, membershipRenewalReminderDays: number, classTypes: string[], generalHours: string[], plans: Array<{name: string, price: number, frequency: string, classLimit: number|null, unlimited?: boolean}>}} operations
 * @property {{reservations: boolean, wod: boolean, community: boolean, studentManagement: boolean, coachManagement: boolean, onlinePayments: boolean, attendance: boolean, notifications: boolean}} features
 * @property {{production?: string, staging?: string, aliases?: string[]}} domains
 * @property {{logo: string, icon: string, pwaIcon: string, socialImage: string}} assets
 * @property {{background: string, surface: string, card: string, elevated: string, text: string, textSecondary: string, accent: string, accentHover: string, accentSoft: string, sand: string, steel: string, border: string, borderStrong: string}} theme
 * @property {{whatsappNumber?: string, paymentLinks?: Record<string, string>, emailSenderName: string}} integrations
 * @property {{cacheNamespace: string, legacyCacheNamespaces?: string[]}} infrastructure
 */

/** @type {Readonly<Record<string, GymConfig>>} */
export const gymConfigs = Object.freeze({
  kupan: Object.freeze({
    id: 'kupan',
    identity: {
      name: 'KUPAN',
      slogan: 'Fuerza, raices y espiritu',
      tagline: 'Comunidad, esfuerzo y progreso',
      descriptor: 'CrossFit Box',
    },
    contact: {
      email: 'pagoskupanbox@gmail.com',
      whatsapp: '+56 9 7827 5417',
    },
    localization: { locale: 'es-CL', timezone: 'America/Santiago', currency: 'CLP' },
    operations: {
      defaultClassDurationMinutes: 60,
      classDurations: { CrossFit: 60 },
      defaultClassCapacity: 12,
      reservationClosesMinutes: 15,
      cancellationWindowMinutes: 45,
      membershipRenewalReminderDays: 3,
      classTypes: ['CrossFit'],
      generalHours: ['Lunes a viernes, horarios publicados en la app'],
      plans: [
        { name: '8 clases', price: 40000, frequency: '8 clases por 30 dias', classLimit: 8 },
        { name: '12 clases', price: 45000, frequency: '12 clases por 30 dias', classLimit: 12 },
        { name: 'Full CrossFit', price: 55000, frequency: 'Plan Full por 30 dias', classLimit: null, unlimited: true },
        { name: 'Pase diario', price: 7000, frequency: '1 clase', classLimit: 1 },
      ],
    },
    features: {
      reservations: true,
      wod: true,
      community: true,
      studentManagement: true,
      coachManagement: true,
      onlinePayments: true,
      attendance: true,
      notifications: true,
    },
    domains: {
      production: 'kupan-box-app.vercel.app',
      staging: 'localhost',
      aliases: ['127.0.0.1'],
    },
    assets: {
      logo: '/brand/logo-kupan.png',
      icon: '/brand/isotipo-kupan.png',
      pwaIcon: '/icons/icon-192.png',
      socialImage: '/brand/logo-kupan.png',
    },
    theme: {
      background: '#0E1011',
      surface: '#151817',
      card: '#1B1F1D',
      elevated: '#242926',
      text: '#EBECE7',
      textSecondary: '#BDC3C3',
      accent: '#9B2A31',
      accentHover: '#B43A42',
      accentSoft: 'rgba(155, 42, 49, 0.16)',
      sand: '#D9CAB3',
      steel: '#BDC3C3',
      border: '#3C4341',
      borderStrong: '#68706D',
    },
    integrations: {
      whatsappNumber: '56978275417',
      paymentLinks: {
        eightClasses: 'https://mpago.la/33iSvva',
        twelveClasses: 'https://mpago.la/2V6hM5j',
        full: 'https://mpago.la/2wHbG3j',
        dailyPass: 'https://mpago.la/1Js5uwe',
      },
      emailSenderName: 'KUPAN',
    },
    infrastructure: { cacheNamespace: 'kupan', legacyCacheNamespaces: ['kupan'] },
  }),
  fittest: Object.freeze({
    id: 'fittest',
    identity: {
      name: 'FITTEST',
      legalName: 'FITTEST SPA',
      slogan: 'CrossFit & Hyrox',
      tagline: 'CrossFit & Hyrox',
      descriptor: 'BOX/GYM',
    },
    contact: {
      email: 'fittestchile8@gmail.com',
      phone: '+56 9 4964 4148',
      whatsapp: '+56 9 4964 4148',
      address: 'Av. Vicuna Mackenna 4205, local 14',
      city: 'Penaflor',
      instagram: 'Fittest_box',
      website: 'https://fittest.cl',
    },
    localization: { locale: 'es-CL', timezone: 'America/Santiago', currency: 'CLP' },
    operations: {
      defaultClassDurationMinutes: 60,
      classDurations: { 'Open Box CrossFit': 120, 'Entrenamiento personalizado': 90, Hyrox: 60 },
      defaultClassCapacity: 15,
      reservationClosesMinutes: 30,
      cancellationWindowMinutes: 30,
      membershipRenewalReminderDays: 3,
      classTypes: ['Open Box', 'Hyrox', 'Entrenamiento personalizado'],
      generalHours: ['Lunes a viernes, 09:00-22:00', 'Sabado y domingo, 09:00-13:00'],
      plans: [
        { name: '2 veces a la semana', price: 30000, frequency: '8-9 clases al mes', classLimit: 9 },
        { name: '3 veces a la semana', price: 40000, frequency: '12 clases al mes', classLimit: 12 },
        { name: 'Plan full', price: 50000, frequency: 'Full', classLimit: null, unlimited: true },
      ],
    },
    features: {
      reservations: true,
      wod: false,
      community: true,
      studentManagement: false,
      coachManagement: false,
      onlinePayments: false,
      attendance: true,
      notifications: true,
    },
    domains: {
      production: 'fittest.cl',
      staging: 'fittest-staging.vercel.app',
      aliases: ['www.fittest.cl'],
    },
    assets: {
      logo: '/brand/fittest/logo-fittest-red.png',
      icon: '/brand/fittest/logo-fittest-red.png',
      pwaIcon: '/brand/fittest/logo-fittest-red.png',
      socialImage: '/brand/fittest/logo-fittest-red.png',
    },
    theme: {
      background: '#000000',
      surface: '#090909',
      card: '#111111',
      elevated: '#181818',
      text: '#FFFFFF',
      textSecondary: '#E8E8E8',
      accent: '#E31B23',
      accentHover: '#FF3038',
      accentSoft: 'rgba(227, 27, 35, 0.18)',
      sand: '#FFFFFF',
      steel: '#E8E8E8',
      border: '#E31B23',
      borderStrong: '#FF3038',
    },
    integrations: {
      whatsappNumber: '56949644148',
      paymentLinks: {},
      emailSenderName: 'FITTEST',
    },
    infrastructure: { cacheNamespace: 'fittest' },
  }),
})

export const DEFAULT_GYM_ID = 'kupan'

export function normalizeHostname(hostname = '') {
  return String(hostname).trim().toLowerCase().replace(/:\d+$/, '')
}

export function findGymIdByHostname(hostname = '') {
  const normalized = normalizeHostname(hostname)
  if (!normalized) return ''

  return Object.values(gymConfigs).find((config) => (
    [config.domains.production, config.domains.staging, ...(config.domains.aliases ?? [])]
      .filter(Boolean)
      .map(normalizeHostname)
      .includes(normalized)
  ))?.id ?? ''
}

export function resolveGymId({ explicitId = '', hostname = '' } = {}) {
  const normalizedId = String(explicitId).trim().toLowerCase()
  if (normalizedId) return normalizedId
  return findGymIdByHostname(hostname) || DEFAULT_GYM_ID
}

export function getGymConfig(id) {
  const config = gymConfigs[id]
  if (!config) throw new Error(`Configuracion de gimnasio desconocida: ${id}`)
  return config
}
