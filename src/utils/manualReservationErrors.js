import { getHumanErrorMessage } from './appState.js'

// Return reviewed messages, never database details or arbitrary server text.
const messages = [
  [/clase completa/, 'La clase está completa. Selecciona otro horario con cupos.'],
  [/ya tiene una reserva|ya tienes una reserva/, 'El alumno ya está inscrito en esta clase. Revisa la lista de reservas.'],
  [/no tiene plan activo|membresia activa y pagada|plan activo para reservar/, 'El alumno necesita un plan activo y pagado para esta fecha. Revisa su membresía.'],
  [/no tiene tokens|no tienes tokens/, 'El alumno no tiene tokens disponibles. Revisa o renueva su plan.'],
  [/limite diario|una reserva por dia/, 'El alumno alcanzó el límite diario de su plan Full. Revisa sus reservas de ese día.'],
  [/no esta vigente|plan del alumno esta vencido/, 'El plan del alumno no está vigente para la fecha seleccionada. Revisa las fechas de su membresía.'],
  [/fuera del periodo permitido|fecha debe estar entre hoy/, 'Selecciona una fecha desde hoy y dentro del período de reservas habilitado.'],
  [/fecha no corresponde/, 'La fecha no coincide con el día de la clase. Revisa la fecha y el horario.'],
  [/clase no disponible/, 'La clase ya no está disponible. Actualiza los horarios y selecciona otra clase.'],
  [/alumno no encontrado/, 'El alumno no está disponible o su perfil está inactivo. Revisa su ficha.'],
  [/solo admin puede reservar sin plan/, 'Solo un administrador puede autorizar una reserva sin plan activo.'],
  [/solo admin o coach activo/, 'Necesitas un perfil activo de Coach o administrador para agregar alumnos.'],
  [/debes iniciar sesion/, 'Tu sesión venció. Inicia sesión nuevamente para continuar.'],
]

export function getManualReservationError(error) {
  if (error?.code === 'P0001') {
    const text = String(error.message ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const match = messages.find(([pattern]) => pattern.test(text))
    if (match) return match[1]
  }
  return getHumanErrorMessage(error, 'No pudimos agregar el alumno a la clase. Revisa los datos e intenta nuevamente.')
}
