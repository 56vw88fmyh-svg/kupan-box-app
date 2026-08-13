import { gymConfig } from '../config/gymConfig.js'

export function formatCoachName(value) {
  const name = String(value ?? '').trim().replace(/^coach\s+/i, '')
  return name || gymConfig.identity.name
}
