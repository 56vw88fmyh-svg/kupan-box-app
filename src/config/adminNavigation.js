export const adminSectionMeta = {
  overview: { label: 'Inicio', module: 'Panel', icon: 'IN' },
  'create-student': { label: 'Nuevo alumno', module: 'Alumnos', icon: 'NA' },
  students: { label: 'Ver alumnos', module: 'Alumnos', icon: 'AL' },
  plans: { label: 'Planes', module: 'Planes y pagos', icon: 'PL' },
  memberships: { label: 'Membresias', module: 'Alumnos', icon: 'ME' },
  reservations: { label: 'Reservas', module: 'Clases', icon: 'RE' },
  wod: { label: 'WOD', module: 'Entrenamientos', icon: 'WD' },
  schedule: { label: 'Horarios', module: 'Clases', icon: 'HO' },
  community: { label: 'Comunicaciones', module: 'Comunicaciones', icon: 'CO' },
  texts: { label: 'Textos', module: 'Configuracion', icon: 'TX' },
  birthdays: { label: 'Cumpleanos', module: 'Comunicaciones', icon: 'CU' },
  prs: { label: 'PR destacados', module: 'Entrenamientos', icon: 'PR' },
}

export const adminNavigationModules = [
  { id: 'inicio', label: 'Inicio', shortLabel: 'Inicio', icon: 'IN', items: [{ id: 'overview', label: 'Inicio', hint: 'Estado de hoy' }] },
  {
    id: 'clases',
    label: 'Clases',
    shortLabel: 'Clases',
    icon: 'CL',
    items: [
      { id: 'reservations', label: 'Reservas y asistencia', hint: 'Alumnos por clase' },
      { id: 'schedule', label: 'Horarios y cupos', hint: 'Crear y editar clases' },
      { id: 'reservations', label: 'Agregar alumno a clase', target: 'manual-reservation', hint: 'Reserva manual' },
    ],
  },
  {
    id: 'entrenamientos',
    label: 'Entrenamientos',
    shortLabel: 'WOD',
    icon: 'WD',
    items: [
      { id: 'wod', label: 'WOD de hoy', hint: 'Crear o editar WOD' },
      { id: 'prs', label: 'PR destacados', hint: 'Marcas recientes' },
    ],
  },
  {
    id: 'alumnos',
    label: 'Alumnos',
    shortLabel: 'Alumnos',
    icon: 'AL',
    items: [
      { id: 'students', label: 'Alumnos', hint: 'Listado completo' },
      { id: 'create-student', label: 'Nuevo alumno', hint: 'Crear acceso' },
      { id: 'memberships', label: 'Plan actual', hint: 'Planes activos' },
      { id: 'memberships', label: 'Historial', target: 'membership-history', hint: 'Ciclos y tokens' },
    ],
  },
  {
    id: 'planes-pagos',
    label: 'Planes y pagos',
    shortLabel: 'Pagos',
    icon: 'PG',
    items: [
      { id: 'plans', label: 'Configuracion de planes', hint: 'Precios y cupos' },
      { id: 'memberships', label: 'Renovaciones', target: 'membership-activate', hint: 'Activar o renovar' },
      { id: 'memberships', label: 'Historial de pagos', target: 'membership-history', hint: 'Ciclos y pagos' },
      { id: 'memberships', label: 'Movimientos de tokens', target: 'token-movements', hint: 'Ajustes y consumo' },
    ],
  },
  {
    id: 'comunicaciones',
    label: 'Comunicaciones',
    shortLabel: 'Com',
    icon: 'CO',
    items: [
      { id: 'community', label: 'Noticias y eventos', hint: 'Publicaciones activas' },
      { id: 'birthdays', label: 'Cumpleanos', hint: 'Saludo rapido' },
    ],
  },
  {
    id: 'configuracion',
    label: 'Configuracion',
    shortLabel: 'Config',
    icon: 'CF',
    items: [
      { id: 'texts', label: 'Textos generales', hint: 'Copy principal' },
      { id: 'schedule', label: 'Horarios base', hint: 'Plantilla semanal' },
      { id: 'plans', label: 'Planes base', hint: 'Valores y tokens' },
      { id: 'prs', label: 'PR destacados', hint: 'Marcas' },
    ],
  },
]

export function getAdminModuleId(sectionId) {
  return adminNavigationModules.find((module) => module.items.some((item) => item.id === sectionId))?.id ?? 'inicio'
}

export function getAdminNavigationItemIds() {
  return adminNavigationModules.flatMap((module) => module.items.map((item) => `${module.id}:${item.id}:${item.target ?? ''}`))
}
