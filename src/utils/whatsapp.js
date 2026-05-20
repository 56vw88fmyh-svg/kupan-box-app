export const KUPAN_WHATSAPP_NUMBER = '56978275417'

export function createWhatsAppUrl(message) {
  return `https://wa.me/${KUPAN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export const whatsappMessages = {
  reservation: 'Hola KUPAN, quiero reservar una clase de CrossFit.',
  dropIn: 'Hola KUPAN, quiero agendar una clase de prueba.',
  plan: (planName) => `Hola KUPAN, quiero información sobre el plan ${planName}.`,
}
