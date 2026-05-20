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
  { date: 'Hoy', time: '18:00', className: 'CrossFit', status: 'Reservado' },
  { date: 'Mañana', time: '19:00', className: 'CrossFit', status: 'Con cupos' },
  { date: 'Sáb', time: '10:00', className: 'Team WOD', status: 'Con cupos' },
]

export const wod = {
  type: 'For time',
  title: 'Piernas firmes, cabeza fuerte',
  focus: 'Trabajo intenso, escalable y pensado para que nadie entrene solo.',
  timeCap: '22 minutos',
  warmup: [
    '2 rondas suaves: 200 m trote o 12 cal bike',
    '10 good mornings con PVC',
    '10 air squats con pausa',
    '8 scap push-ups',
    '6 inchworms controlados',
  ],
  strength: {
    title: 'Back squat técnico',
    details: [
      '12 minutos para completar 5 sets de 5 reps',
      'RPE 7: pesado, pero con técnica limpia',
      'Descanso 90 segundos entre sets',
    ],
  },
  workout: [
    '3 rondas por tiempo',
    '400 m run',
    '21 wall balls',
    '15 kettlebell swings',
    '9 burpees over line',
  ],
  notes: [
    'Parte inteligente y termina fuerte.',
    'El objetivo es moverte bien y empujar hasta el final.',
    'Escalar también es entrenar con cabeza: cuida la técnica y suma progreso.',
  ],
  scaling: [
    {
      level: 'Iniciado',
      description: 'Para partir con confianza, moverte seguro y sentirte parte del box.',
      items: ['3 rondas sin reloj', '200 m caminata rápida o 8 cal bike', '12 wall balls livianos', '10 deadlifts con KB', '6 burpees step-down'],
    },
    {
      level: 'Rookie',
      description: 'Para seguir el ritmo del grupo cuidando volumen y técnica.',
      items: ['3 rondas', '300 m run', '15 wall balls', '12 russian KB swings', '8 burpees over line'],
    },
    {
      level: 'Scaled',
      description: 'Para darlo todo con cargas moderadas y ritmo firme.',
      items: ['3 rondas', '400 m run', '18 wall balls', '15 russian o american KB swings', '9 burpees over line'],
    },
    {
      level: 'RX',
      description: 'Versión completa para quienes vienen entrenando constante.',
      items: ['3 rondas por tiempo', '400 m run', '21 wall balls 9/6 kg', '15 american KB swings 24/16 kg', '9 burpees over line'],
    },
  ],
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

export const communityPosts = [
  { title: 'Horarios para entrenar en serio', text: 'PM fuerte de lunes a viernes y Team WOD el sábado. Reserva tu clase y ven a darlo todo.', tag: 'Horarios' },
  { title: 'PR que se celebra en comunidad', text: 'Camila subió su clean a 62 kg. Acá cada avance se aplaude, porque el progreso también se entrena.', tag: 'Logros' },
  { title: 'Desafío KUPAN', text: '30 días apareciendo por ti y por tu equipo. Somos comunidad, esfuerzo y progreso.', tag: 'Comunidad' },
]

export const communityEvents = [
  { date: 'Sáb 25', title: 'Team WOD + cafecito', detail: 'Entrenamiento por parejas a las 10:00. Si vienes solo, acá armamos dupla.' },
  { date: 'Vie 31', title: 'Cierre de mes KUPAN', detail: 'WOD especial, música fuerte y una buena excusa para celebrar el esfuerzo de todos.' },
  { date: 'Dom 09', title: 'Trote suave de comunidad', detail: 'Salida grupal para soltar piernas. Ritmo conversado, nadie se queda atrás.' },
]

export const communityRanking = [
  { name: 'Vale R.', score: '18 clases', badge: 'Aparece siempre' },
  { name: 'Nico P.', score: '14 clases', badge: 'Motor prendido' },
  { name: 'Cami M.', score: '3 PRs', badge: 'Progreso real' },
  { name: 'Fran A.', score: '5 team WODs', badge: 'Compañero de fierro' },
]

export const communityBirthdays = [
  { name: 'Cata', date: '06 mayo' },
  { name: 'Rafa', date: '14 mayo' },
  { name: 'Benja', date: '22 mayo' },
  { name: 'Antonia', date: '29 mayo' },
]

export const profile = {
  name: 'Ari',
  plan: 'Full KUPAN',
  attendance: 16,
  prs: [
    { lift: 'Back Squat', value: '120 kg' },
    { lift: 'Clean', value: '82 kg' },
    { lift: 'Fran', value: '5:48' },
  ],
}
