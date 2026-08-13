import { gymConfig } from '../config/gymConfig.js'

export const paymentLinks = Object.freeze(gymConfig.features.onlinePayments ? gymConfig.integrations.paymentLinks : {})

export function getPaymentUrlForPlan(planName = '') {
  if (!gymConfig.features.onlinePayments) return ''
  const normalizedName = String(planName).trim().toLowerCase()

  if (normalizedName.includes('pase') && normalizedName.includes('diario')) return paymentLinks.dailyPass
  if (normalizedName.includes('full')) return paymentLinks.full
  if (normalizedName.includes('12')) return paymentLinks.twelveClasses
  if (normalizedName.includes('8')) return paymentLinks.eightClasses
  return ''
}
