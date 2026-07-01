import assert from 'node:assert/strict'
import {
  adminDataLoaders,
  createEmptyAdminData,
  createEmptySectionLoading,
  loadAdminDataSnapshot,
  mergeAdminDataResult,
  runAdminLoader,
} from './useAdminData.js'

function createSupabaseMock(overrides = {}) {
  const calls = []
  return {
    calls,
    client: {
      async rpc(name) {
        calls.push(name)
        const value = overrides[name]
        if (value instanceof Error) return { data: null, error: value }
        if (typeof value === 'function') return value()
        return { data: value ?? [{ id: name }], error: null }
      },
    },
  }
}

function quietLog() {}

async function testAllLoadersSucceed() {
  const { client, calls } = createSupabaseMock({
    admin_get_profiles: [{ id: 'profile-1' }],
    admin_get_plans: [{ id: 'plan-1' }],
  })
  const result = await loadAdminDataSnapshot({
    configured: true,
    supabaseClient: client,
    loadUpcomingBirthdaysFn: async () => ({ ok: true, birthdays: [{ profile_id: 'birthday-1' }] }),
    logError: quietLog,
  })

  assert.equal(result.success, true)
  assert.equal(result.partial, false)
  assert.equal(result.data.profiles.length, 1)
  assert.equal(result.data.plans.length, 1)
  assert.equal(result.data.upcomingBirthdays.length, 1)
  assert.equal(calls.includes('admin_get_profiles'), true)
  assert.equal(calls.includes('admin_get_token_movements'), true)
  assert.equal(calls.length, adminDataLoaders.filter((loader) => loader.rpcName).length)
}

async function testPartialFailureKeepsSuccessfulSections() {
  const { client } = createSupabaseMock({
    admin_get_profiles: [{ id: 'profile-ok' }],
    admin_get_memberships: new Error('RLS bloqueó memberships'),
    admin_get_reservations: [],
  })
  const result = await loadAdminDataSnapshot({
    configured: true,
    supabaseClient: client,
    loadUpcomingBirthdaysFn: async () => ({ ok: true, birthdays: [] }),
    logError: quietLog,
  })

  assert.equal(result.success, false)
  assert.equal(result.partial, true)
  assert.equal(result.data.profiles[0].id, 'profile-ok')
  assert.deepEqual(result.data.reservations, [])
  assert.equal(result.failedSections.includes('memberships'), true)
  assert.equal(result.sectionErrors.some((error) => error.key === 'memberships'), true)

  const previous = createEmptyAdminData()
  previous.memberships = [{ id: 'old-membership' }]
  const merged = mergeAdminDataResult(previous, result)
  assert.deepEqual(merged.memberships, [{ id: 'old-membership' }])
  assert.deepEqual(merged.profiles, [{ id: 'profile-ok' }])
  assert.deepEqual(merged.reservations, [])
}

async function testMultipleFailuresAndConfigurationFailure() {
  const { client } = createSupabaseMock({
    admin_get_profiles: new Error('profiles failed'),
    admin_get_plans: new Error('plans failed'),
  })
  const result = await loadAdminDataSnapshot({
    configured: true,
    supabaseClient: client,
    loadUpcomingBirthdaysFn: async () => ({ ok: false, message: 'birthdays failed' }),
    logError: quietLog,
  })

  assert.equal(result.success, false)
  assert.equal(result.partial, true)
  assert.equal(result.failedSections.includes('profiles'), true)
  assert.equal(result.failedSections.includes('plans'), true)
  assert.equal(result.failedSections.includes('upcomingBirthdays'), true)

  const configuration = await loadAdminDataSnapshot({
    configured: false,
    supabaseClient: null,
    logError: quietLog,
  })

  assert.equal(configuration.success, false)
  assert.equal(configuration.partial, false)
  assert.equal(configuration.failedSections.length, adminDataLoaders.length)
  assert.equal(configuration.sectionErrors[0].key, 'configuration')
}

async function testRunSingleSectionLoader() {
  const { client, calls } = createSupabaseMock({
    admin_get_wod: [{ id: 'wod-1' }],
  })
  const loader = adminDataLoaders.find((item) => item.key === 'wod')
  const result = await runAdminLoader(loader, {
    supabaseClient: client,
    loadUpcomingBirthdaysFn: async () => ({ ok: true, birthdays: [] }),
    logError: quietLog,
  })

  assert.equal(result.error, null)
  assert.deepEqual(result.data, [{ id: 'wod-1' }])
  assert.deepEqual(calls, ['admin_get_wod'])
}

function testFactoriesAndSectionStateAreIndependent() {
  const first = createEmptyAdminData()
  const second = createEmptyAdminData()
  first.profiles.push({ id: 'mutated' })
  assert.deepEqual(second.profiles, [])

  const loading = createEmptySectionLoading()
  assert.equal(loading.profiles, false)
  assert.equal(loading.tokenMovements, false)
  assert.equal(Object.keys(loading).length, adminDataLoaders.length)
}

function testInvalidSectionShape() {
  const current = createEmptyAdminData()
  current.profiles = [{ id: 'old-profile' }]
  const merged = mergeAdminDataResult(current, {
    success: false,
    partial: false,
    updatedSections: [],
    failedSections: ['profiles'],
    errors: { profiles: new Error('failed') },
  })

  assert.equal(merged, current)
  assert.deepEqual(merged.profiles, [{ id: 'old-profile' }])
}

await testAllLoadersSucceed()
await testPartialFailureKeepsSuccessfulSections()
await testMultipleFailuresAndConfigurationFailure()
await testRunSingleSectionLoader()
testFactoriesAndSectionStateAreIndependent()
testInvalidSectionShape()
