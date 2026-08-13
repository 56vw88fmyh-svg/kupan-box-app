import { gymConfig } from '../config/gymConfig.js'

export const KUPAN_WHATSAPP_NUMBER = gymConfig.integrations.whatsappNumber ?? ''

export function createWhatsAppUrl(message) {
  return `https://wa.me/${KUPAN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export const whatsappMessages = {
  reservation: `Hola ${gymConfig.identity.name}, quiero reservar una clase.`,
  dropIn: `Hola ${gymConfig.identity.name}, quiero agendar una clase de prueba.`,
  plan: (planName) => `Hola ${gymConfig.identity.name}, quiero información sobre el plan ${planName}.`,
}
