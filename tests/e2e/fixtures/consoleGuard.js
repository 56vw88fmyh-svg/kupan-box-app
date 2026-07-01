import { expect } from '@playwright/test'

const ignoredConsoleFragments = [
  'Download the React DevTools',
]

export function attachConsoleGuard(page, testInfo) {
  const consoleMessages = []
  const pageErrors = []
  const requestFailures = []

  page.on('console', (message) => {
    const text = message.text()
    if (ignoredConsoleFragments.some((fragment) => text.includes(fragment))) return
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text })
    }
  })

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  page.on('requestfailed', (request) => {
    const failure = request.failure()
    const url = request.url()
    if (url.includes('/rest/v1/') || url.includes('/auth/v1/') || url.includes('/functions/v1/')) return
    if (failure?.errorText?.includes('net::ERR_ABORTED')) return
    requestFailures.push(`${request.method()} ${url} ${failure?.errorText ?? ''}`.trim())
  })

  return async function assertCleanConsole() {
    const details = { consoleMessages, pageErrors, requestFailures }
    await testInfo.attach('console-guard.json', {
      body: JSON.stringify(details, null, 2),
      contentType: 'application/json',
    })
    expect(pageErrors, 'No debe haber pageerror').toEqual([])
    expect(consoleMessages, 'No debe haber console error/warning inesperado').toEqual([])
    expect(requestFailures, 'No debe haber requestfailed inesperado').toEqual([])
  }
}
