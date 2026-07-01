import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chdir, cwd, env } from 'node:process'
import { getEnvironment, stagingConfirmationValue } from './lib/environment.mjs'
import { createEmptyManifest, validateManifest } from './resource-manifest.mjs'

const originalCwd = cwd()
const originalEnv = { ...env }

function resetEnv(values = {}) {
  for (const key of Object.keys(env)) {
    if (key.startsWith('STAGING_') || key.startsWith('E2E_') || key.startsWith('PRODUCTION_')) delete env[key]
  }
  Object.assign(env, values)
}

function withTempCwd(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'kupan-staging-test-'))
  chdir(dir)
  try {
    fn()
  } finally {
    chdir(originalCwd)
    rmSync(dir, { recursive: true, force: true })
  }
}

resetEnv()
let environment = getEnvironment()
assert.equal(environment.isValid, false)
assert.equal(environment.errors.some((error) => error.includes('STAGING_PROJECT_REF')), true)

resetEnv({
  STAGING_SUPABASE_URL: 'https://prod.supabase.co',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'secret',
  STAGING_PROJECT_REF: 'same',
  PRODUCTION_PROJECT_REF: 'same',
  STAGING_CONFIRMATION: stagingConfirmationValue,
  E2E_TEST_PREFIX: 'kupan-e2e',
})
environment = getEnvironment()
assert.equal(environment.isValid, false)
assert.equal(environment.errors.some((error) => error.includes('diferente')), true)

resetEnv({
  STAGING_SUPABASE_URL: 'https://abcd.supabase.co',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'secret',
  STAGING_PROJECT_REF: 'abcd',
  PRODUCTION_PROJECT_REF: 'wxyz',
  STAGING_CONFIRMATION: 'bad',
  E2E_TEST_PREFIX: 'kupan-e2e',
})
environment = getEnvironment()
assert.equal(environment.isValid, false)
assert.equal(environment.errors.some((error) => error.includes('STAGING_CONFIRMATION')), true)

resetEnv({
  STAGING_SUPABASE_URL: 'https://abcd.supabase.co',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'secret',
  STAGING_PROJECT_REF: 'abcd',
  PRODUCTION_PROJECT_REF: 'wxyz',
  STAGING_CONFIRMATION: stagingConfirmationValue,
  E2E_TEST_PREFIX: 'wrong-prefix',
})
environment = getEnvironment()
assert.equal(environment.isValid, false)
assert.equal(environment.errors.some((error) => error.includes('E2E_TEST_PREFIX')), true)

resetEnv({
  STAGING_SUPABASE_URL: 'https://abcd.supabase.co',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'secret',
  STAGING_PROJECT_REF: 'abcd',
  PRODUCTION_PROJECT_REF: 'wxyz',
  STAGING_CONFIRMATION: stagingConfirmationValue,
  E2E_TEST_PREFIX: 'kupan-e2e',
})
environment = getEnvironment()
const manifest = createEmptyManifest(environment)
manifest.resources.plans.push({ id: 'plan-real', name: 'Plan real', prefix: 'otro' })
assert.equal(validateManifest(manifest, environment).ok, false)

withTempCwd(() => {
  const manifestInTemp = createEmptyManifest(environment)
  assert.equal(manifestInTemp.resources.profiles.length, 0)
})

Object.assign(env, originalEnv)
console.log('staging scripts tests: OK')
