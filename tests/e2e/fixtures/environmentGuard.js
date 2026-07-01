/* global process */

const stagingConfirmationValue = 'I_CONFIRM_THIS_IS_NOT_PRODUCTION'
const productionIndicators = ['prod', 'production', 'kupan.cl', 'www.']

export function getE2eEnvironment() {
  const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:5177'
  const testPrefix = process.env.E2E_TEST_PREFIX || 'kupan-e2e'
  const allowMutations = process.env.E2E_ALLOW_MUTATIONS === 'true'
  const stagingConfirmation = process.env.E2E_STAGING_CONFIRMATION || ''
  const resetValidated = process.env.E2E_RESET_VALIDATED === 'true'
  const normalizedBaseUrl = baseUrl.toLowerCase()
  const looksLikeProduction = productionIndicators.some((indicator) => normalizedBaseUrl.includes(indicator))

  return {
    baseUrl,
    testPrefix,
    allowMutations,
    stagingConfirmation,
    stagingConfirmed: stagingConfirmation === stagingConfirmationValue,
    resetValidated,
    looksLikeProduction,
    canRunMutations: allowMutations && stagingConfirmation === stagingConfirmationValue && resetValidated && !looksLikeProduction,
  }
}

export function getMutationSkipReason() {
  const environment = getE2eEnvironment()
  if (!environment.allowMutations) return 'Mutaciones omitidas: E2E_ALLOW_MUTATIONS debe ser true.'
  if (!environment.stagingConfirmed) return `Mutaciones omitidas: E2E_STAGING_CONFIRMATION debe ser ${stagingConfirmationValue}.`
  if (!environment.resetValidated) return 'Mutaciones omitidas: E2E_RESET_VALIDATED debe ser true después de revisar staging:reset:dry.'
  if (environment.looksLikeProduction) return 'Mutaciones omitidas: E2E_BASE_URL parece producción.'
  if (!environment.testPrefix) return 'Mutaciones omitidas: falta E2E_TEST_PREFIX.'
  return ''
}

export function requireSafeMutationEnvironment(test) {
  const reason = getMutationSkipReason()
  test.skip(Boolean(reason), reason)
}

export { stagingConfirmationValue }
