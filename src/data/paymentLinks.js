export const paymentLinks = Object.freeze({
  eightClasses: 'https://mpago.la/33iSvva',
  twelveClasses: 'https://mpago.la/2V6hM5j',
  full: 'https://mpago.la/2wHbG3j',
  dailyPass: 'https://mpago.la/1Js5uwe',
})

export function getPaymentUrlForPlan(planName = '') {
  const normalizedName = String(planName).trim().toLowerCase()

  if (normalizedName.includes('pase') && normalizedName.includes('diario')) return paymentLinks.dailyPass
  if (normalizedName.includes('full')) return paymentLinks.full
  if (normalizedName.includes('12')) return paymentLinks.twelveClasses
  if (normalizedName.includes('8')) return paymentLinks.eightClasses
  return ''
}
