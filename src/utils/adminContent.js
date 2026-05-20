import {
  communityEvents,
  communityPosts,
  plans,
  schedule,
  todayStats,
  weeklySchedule,
  wod,
} from '../data/mockData.js'

export const defaultAppText = {
  homeEyebrow: 'Entrena fuerte, entrena acompañado',
  homeTitle: 'Reserva tu clase y ven a darlo todo.',
  homeBody: 'Somos comunidad, esfuerzo y progreso: revisa horarios, WOD y cupos para llegar listo al box.',
  reservationsTitle: 'Reserva tu clase y ven a darlo todo.',
  reservationsBody: 'Elige horario, confirma tu cupo y deja tu entrenamiento listo. Somos comunidad, esfuerzo y progreso.',
  communityPhrase: 'El WOD termina cuando termina el último compañero',
}

export const defaultAdminContent = {
  appText: defaultAppText,
  todayStats,
  schedule,
  weeklySchedule,
  wod,
  plans,
  communityEvents,
  communityPosts,
}

function normalizeAdminContent(content) {
  return {
    ...defaultAdminContent,
    ...content,
    appText: content?.appText ? { ...defaultAppText, ...content.appText } : defaultAppText,
    todayStats: Array.isArray(content?.todayStats) ? content.todayStats : defaultAdminContent.todayStats,
    schedule: Array.isArray(content?.schedule) ? content.schedule : defaultAdminContent.schedule,
    weeklySchedule: Array.isArray(content?.weeklySchedule) && content.weeklySchedule.length > 0
      ? content.weeklySchedule
      : defaultAdminContent.weeklySchedule,
    wod: content?.wod ? { ...defaultAdminContent.wod, ...content.wod } : defaultAdminContent.wod,
    plans: Array.isArray(content?.plans) && content.plans.length > 0 ? content.plans : defaultAdminContent.plans,
    communityEvents: Array.isArray(content?.communityEvents) ? content.communityEvents : defaultAdminContent.communityEvents,
    communityPosts: Array.isArray(content?.communityPosts) ? content.communityPosts : defaultAdminContent.communityPosts,
  }
}

export function getDefaultAdminContent() {
  return normalizeAdminContent(defaultAdminContent)
}
