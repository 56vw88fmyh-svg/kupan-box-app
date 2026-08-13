import { paymentLinks } from './paymentLinks.js'
import { gymConfig } from '../config/gymConfig.js'

export const todayStats = [
  { label: 'Cupos para hoy', value: '12' },
  { label: 'WOD para darlo todo', value: 'AMRAP' },
  { label: 'Días apareciendo', value: '7' },
]

export const schedule = [
  { time: '19:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12, level: 'Lunes a viernes' },
  { time: '20:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12, level: 'Lunes a viernes' },
]

export const weeklySchedule = [
  {
    id: 'monday',
    short: 'Lun',
    label: 'Lunes',
    note: 'Reserva tu clase y ven a darlo todo. AM por definir.',
    blocks: {
      AM: [],
      PM: [
        { time: '19:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
        { time: '20:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
      ],
    },
  },
  {
    id: 'tuesday',
    short: 'Mar',
    label: 'Martes',
    note: 'Entrena fuerte, entrena acompañado. AM por definir.',
    blocks: {
      AM: [],
      PM: [
        { time: '19:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
        { time: '20:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
      ],
    },
  },
  {
    id: 'wednesday',
    short: 'Mié',
    label: 'Miércoles',
    note: 'Mitad de semana para empujar con la comunidad. AM por definir.',
    blocks: {
      AM: [],
      PM: [
        { time: '19:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
        { time: '20:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
      ],
    },
  },
  {
    id: 'thursday',
    short: 'Jue',
    label: 'Jueves',
    note: 'No se afloja: técnica, actitud y buen ritmo. AM por definir.',
    blocks: {
      AM: [],
      PM: [
        { time: '19:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
        { time: '20:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
      ],
    },
  },
  {
    id: 'friday',
    short: 'Vie',
    label: 'Viernes',
    note: 'Cierra la semana con esfuerzo, progreso y buena energía. AM por definir.',
    blocks: {
      AM: [],
      PM: [
        { time: '19:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
        { time: '20:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
      ],
    },
  },
  {
    id: 'saturday',
    short: 'Sáb',
    label: 'Sábado',
    note: 'Sin clases regulares programadas.',
    blocks: {
      AM: [],
      PM: [],
    },
  },
]

export const reservations = [
]

export const wod = {
  type: 'Entrenamiento del día',
  title: 'WOD sorpresa',
  focus: 'El coach aún no ha cargado el WOD de hoy.',
  timeCap: 'Por definir',
  warmup: [],
  strength: {
    title: 'Skill / Strength',
    details: [],
  },
  workout: [],
  notes: [],
  scaling: [],
}

const kupanPlans = [
  {
    name: '8 clases',
    price: '$40.000',
    classes: '8 clases por 30 días',
    paymentUrl: paymentLinks.eightClasses,
    highlight: false,
    benefits: ['Dos entrenamientos por semana', 'Técnica, constancia y comunidad', 'Acceso al WOD diario', 'Perfecto para crear hábito'],
  },
  {
    name: '12 clases',
    price: '$45.000',
    classes: '12 clases por 30 días',
    paymentUrl: paymentLinks.twelveClasses,
    highlight: true,
    benefits: ['Tres entrenamientos por semana', 'Buen equilibrio entre ritmo y recuperación', 'Somos comunidad, esfuerzo y progreso', 'Recomendado para avanzar constante'],
  },
  {
    name: 'Full CrossFit',
    price: '$55.000',
    classes: 'Plan Full por 30 días',
    paymentUrl: paymentLinks.full,
    highlight: false,
    benefits: ['Una reserva diaria de lunes a viernes', 'Vigencia de 30 días corridos', 'No descuenta tokens', 'Entrena fuerte, entrena acompañado'],
  },
  {
    name: 'Pase diario',
    price: '$7.000',
    classes: '1 clase',
    paymentUrl: paymentLinks.dailyPass,
    highlight: false,
    benefits: ['Una clase CrossFit', 'Sujeto a cupos disponibles', 'Ideal para visitas o entrenamiento puntual'],
  },
  {
    name: 'Primera clase de prueba',
    price: 'Gratis',
    classes: 'Una vez por persona',
    paymentUrl: '',
    highlight: false,
    trial: true,
    benefits: ['Conoce el box y nuestra metodología', 'No necesitas definir tu nivel', 'Te acompañamos desde el primer día'],
  },
]

function formatConfiguredPrice(price) {
  return new Intl.NumberFormat(gymConfig.localization.locale, {
    style: 'currency',
    currency: gymConfig.localization.currency,
    maximumFractionDigits: 0,
  }).format(price)
}

export const plans = gymConfig.id === 'kupan' ? kupanPlans : gymConfig.operations.plans.map((plan, index) => ({
  name: plan.name,
  price: formatConfiguredPrice(plan.price),
  classes: plan.frequency,
  paymentUrl: '',
  highlight: index === 1,
  benefits: [
    plan.frequency,
    `Reserva hasta ${gymConfig.operations.reservationClosesMinutes} minutos antes de la clase`,
    `Cancelación con ${gymConfig.operations.cancellationWindowMinutes} minutos de anticipación`,
    gymConfig.identity.slogan,
  ],
}))

export const transferInfo = gymConfig.id === 'kupan' ? {
  name: 'Víctor Arismendi',
  rut: '16.906.330-3',
  bank: 'Cuenta Vista Mercado Pago',
  account: '1079164642',
  email: 'pagoskupanbox@gmail.com',
} : null

export const communityPosts = []

export const communityEvents = []

export const communityRanking = []

export const communityBirthdays = []

export const profile = {
  name: '',
  plan: '',
  attendance: 0,
  prs: [],
}
