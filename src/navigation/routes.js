export const primaryNavItems = [
  { id: 'home', path: '/', label: 'Inicio', title: 'KUPAN', eyebrow: 'Comunidad, esfuerzo y progreso', icon: 'home' },
  { id: 'reservations', path: '/reservas', label: 'Reservas', title: 'Reservas', eyebrow: 'Calendario, horarios y tus clases', icon: 'calendar' },
  { id: 'wod', path: '/wod', label: 'WOD', title: 'WOD', eyebrow: 'WOD, resultados y PR', icon: 'wod' },
  { id: 'community', path: '/comunidad', label: 'Comunidad', title: 'Comunidad', eyebrow: 'Actividad, ranking y noticias', icon: 'community' },
  { id: 'profile', path: '/perfil', label: 'Perfil', title: 'Perfil', eyebrow: 'Plan, datos y configuración', icon: 'profile' },
]

export const secondaryRoutes = [
  { id: 'plans', path: '/planes', label: 'Planes', title: 'Mi plan', eyebrow: 'Información de membresía', parentId: 'profile', hidden: true, redirectTo: '/perfil' },
  { id: 'prs', path: '/mis-pr', label: 'Mis PR', title: 'Mis PR', eyebrow: 'Marcas que se celebran', parentId: 'wod', hidden: true },
  { id: 'wod-prs', path: '/wod/pr', label: 'PR', title: 'Mis PR', eyebrow: 'Marcas que se celebran', parentId: 'wod', hidden: true, aliasOf: 'prs' },
  { id: 'ranking', path: '/ranking', label: 'Ranking', title: 'Ranking KUPAN', eyebrow: 'Mejores marcas del box', parentId: 'community', hidden: true },
  { id: 'community-ranking', path: '/comunidad/ranking', label: 'Ranking', title: 'Ranking KUPAN', eyebrow: 'Mejores marcas del box', parentId: 'community', hidden: true, aliasOf: 'ranking' },
  { id: 'login', path: '/login', label: 'Login', title: 'Acceso KUPAN', eyebrow: 'Entrena acompañado', parentId: 'profile', hidden: true },
  { id: 'admin', path: '/admin', label: 'Admin', title: 'Admin KUPAN', eyebrow: 'Panel Supabase', parentId: 'profile', hidden: true, roles: ['admin'] },
  { id: 'coach', path: '/coach', label: 'Coach', title: 'Modo Coach', eyebrow: 'Asistencia del día', parentId: 'profile', hidden: true, roles: ['admin', 'coach'] },
]

export const routeAliases = [
  { from: '/horarios', to: '/reservas' },
  { from: '/calendario', to: '/reservas' },
  { from: '/mis-reservas', to: '/reservas' },
  { from: '/historial-reservas', to: '/reservas' },
  { from: '/wod-hoy', to: '/wod' },
  { from: '/resultados', to: '/wod' },
  { from: '/actividad', to: '/comunidad' },
  { from: '/eventos', to: '/comunidad' },
  { from: '/noticias', to: '/comunidad' },
  { from: '/cumpleanos', to: '/comunidad' },
  { from: '/configuracion', to: '/perfil' },
  { from: '/ayuda', to: '/perfil' },
]

export const pages = [...primaryNavItems, ...secondaryRoutes]

export function getRouteMeta(pathname) {
  const direct = pages.find((item) => item.path === pathname)
  if (direct) return direct

  const alias = routeAliases.find((item) => item.from === pathname)
  if (alias) return pages.find((item) => item.path === alias.to) ?? primaryNavItems[0]

  return primaryNavItems[0]
}

export function getPrimaryNavItemsForUser() {
  return primaryNavItems
}

export function getActiveNavId(pathname) {
  const route = getRouteMeta(pathname)
  return route.parentId ?? route.id
}

export function getPathForPageId(pageId) {
  const route = pages.find((item) => item.id === pageId || item.aliasOf === pageId)
  return route?.path ?? '/'
}

export function userCanAccessRoute(route, currentUser) {
  if (!route?.roles?.length) return true
  const hasAllowedRole = route.roles.includes(currentUser?.role)
  const isActiveProfile = currentUser?.status === 'active'
  return hasAllowedRole && isActiveProfile
}
