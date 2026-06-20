export const todayStats = [
  { label: 'Cupos para hoy', value: '12' },
  { label: 'WOD para darlo todo', value: 'AMRAP' },
  { label: 'Días apareciendo', value: '7' },
]

export const schedule = [
  { time: '18:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12, level: 'Lun · Mié · Vie' },
  { time: '19:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12, level: 'Lunes a viernes' },
  { time: '20:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12, level: 'Lunes a viernes' },
  { time: '10:00', name: 'Team WOD', coach: 'Por definir', spots: 12, maxSpots: 12, level: 'Sábado' },
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
        { time: '18:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
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
        { time: '18:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
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
        { time: '18:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
        { time: '19:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
        { time: '20:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 },
      ],
    },
  },
  {
    id: 'saturday',
    short: 'Sáb',
    label: 'Sábado',
    note: 'El WOD termina cuando termina el último compañero.',
    blocks: {
      AM: [
        { time: '10:00', name: 'Team WOD', coach: 'Por definir', spots: 12, maxSpots: 12 },
      ],
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

export const plans = [
  {
    name: '4 clases',
    price: '$30.000',
    classes: '4 clases al mes',
    paymentUrl: 'https://mpago.la/17R3xsM',
    highlight: false,
    benefits: ['Ideal para empezar sin presión', 'Acceso a clases CrossFit', 'Reserva tu clase y ven a darlo todo', 'Un mes para conocer la energía KUPAN'],
  },
  {
    name: '8 clases',
    price: '$40.000',
    classes: '8 clases al mes',
    paymentUrl: 'https://mpago.la/33iSvva',
    highlight: false,
    benefits: ['Dos entrenamientos por semana', 'Técnica, constancia y comunidad', 'Acceso al WOD diario', 'Perfecto para crear hábito'],
  },
  {
    name: '12 clases',
    price: '$45.000',
    classes: '12 clases al mes',
    paymentUrl: 'https://mpago.la/2V6hM5j',
    highlight: true,
    benefits: ['Tres entrenamientos por semana', 'Buen equilibrio entre ritmo y recuperación', 'Somos comunidad, esfuerzo y progreso', 'Recomendado para avanzar constante'],
  },
  {
    name: '16 clases',
    price: '$50.000',
    classes: '16 clases al mes',
    paymentUrl: 'https://mpago.la/1JjJ1dA',
    highlight: false,
    benefits: ['Cuatro entrenamientos por semana', 'Más continuidad y mejor técnica', 'Ideal para fuerza, motor y disciplina', 'Reserva tu clase y ven a darlo todo'],
  },
  {
    name: 'Full',
    price: '$55.000',
    classes: 'Clases ilimitadas',
    paymentUrl: 'https://mpago.la/2wHbG3j',
    highlight: false,
    benefits: ['Entrena sin límite mensual', 'Acceso completo a clases', 'Para quienes hacen del box su rutina', 'Entrena fuerte, entrena acompañado'],
  },
]

export const transferInfo = {
  name: 'Víctor Arismendi',
  rut: '16.906.330-3',
  bank: 'Cuenta Vista Mercado Pago',
  account: '1079164642',
  email: 'pagoskupanbox@gmail.com',
}

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
