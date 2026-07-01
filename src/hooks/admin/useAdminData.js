import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase.js'
import { loadUpcomingBirthdays } from '../../utils/birthdays.js'
import { getHumanErrorMessage, logAppError } from '../../utils/appState.js'

export const adminDataLoaders = [
  { label: 'alumnos', key: 'profiles', rpcName: 'admin_get_profiles' },
  { label: 'planes', key: 'plans', rpcName: 'admin_get_plans' },
  { label: 'membresias', key: 'memberships', rpcName: 'admin_get_memberships' },
  { label: 'reservas', key: 'reservations', rpcName: 'admin_get_reservations' },
  { label: 'WOD', key: 'wod', rpcName: 'admin_get_wod' },
  { label: 'horarios', key: 'schedule', rpcName: 'admin_get_schedule' },
  { label: 'comunidad', key: 'posts', rpcName: 'admin_get_community_posts' },
  { label: 'textos', key: 'settings', rpcName: 'admin_get_app_settings' },
  { label: 'cumpleanos', key: 'birthdays', rpcName: 'birthdays_this_month' },
  { label: 'PR destacados', key: 'prs', rpcName: 'admin_get_personal_records' },
  { label: 'movimientos de tokens', key: 'tokenMovements', rpcName: 'admin_get_token_movements' },
  { label: 'proximos cumpleanos', key: 'upcomingBirthdays', loaderName: 'loadUpcomingBirthdays' },
]

const loaderByKey = new Map(adminDataLoaders.map((loader) => [loader.key, loader]))

function getCurrentDate() {
  return new Date()
}

export function createEmptyAdminData() {
  return {
    profiles: [],
    plans: [],
    memberships: [],
    reservations: [],
    wod: [],
    schedule: [],
    posts: [],
    settings: [],
    birthdays: [],
    upcomingBirthdays: [],
    prs: [],
    tokenMovements: [],
  }
}

export function createEmptySectionLoading() {
  return Object.fromEntries(adminDataLoaders.map((loader) => [loader.key, false]))
}

function createSectionError(key, label, error, fallback) {
  return {
    key,
    label,
    error,
    message: `No pudimos cargar ${label}. ${getHumanErrorMessage(error, fallback)}`,
  }
}

export async function runAdminLoader(loader, dependencies = {}) {
  const {
    supabaseClient = supabase,
    loadUpcomingBirthdaysFn = loadUpcomingBirthdays,
    logError = logAppError,
  } = dependencies

  try {
    if (loader.loaderName === 'loadUpcomingBirthdays') {
      const result = await loadUpcomingBirthdaysFn(30)
      if (!result.ok) {
        const error = new Error(result.message || `No fue posible cargar ${loader.label}.`)
        logError(`admin.load_${loader.key}`, error, { section: loader.key })
        return {
          key: loader.key,
          label: loader.label,
          data: createEmptyAdminData()[loader.key],
          error: createSectionError(loader.key, loader.label, error, `No fue posible cargar ${loader.label}.`),
        }
      }

      return { key: loader.key, label: loader.label, data: result.birthdays ?? [], error: null }
    }

    const { data, error } = await supabaseClient.rpc(loader.rpcName)
    if (error) {
      logError(`admin.load_${loader.key}`, error, { section: loader.key, rpc: loader.rpcName })
      return {
        key: loader.key,
        label: loader.label,
        data: createEmptyAdminData()[loader.key],
        error: createSectionError(loader.key, loader.label, error, `No fue posible cargar ${loader.label}.`),
      }
    }

    return { key: loader.key, label: loader.label, data: data ?? createEmptyAdminData()[loader.key], error: null }
  } catch (error) {
    logError(`admin.load_${loader.key}`, error, { section: loader.key, rpc: loader.rpcName ?? loader.loaderName })
    return {
      key: loader.key,
      label: loader.label,
      data: createEmptyAdminData()[loader.key],
      error: createSectionError(loader.key, loader.label, error, `No fue posible cargar ${loader.label}.`),
    }
  }
}

export async function loadAdminDataSnapshot(dependencies = {}) {
  const { configured = isSupabaseConfigured, supabaseClient = supabase } = dependencies

  if (!configured || !supabaseClient) {
    const message = 'Supabase aun no esta configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    return {
      success: false,
      partial: false,
      data: createEmptyAdminData(),
      updatedSections: [],
      failedSections: adminDataLoaders.map((loader) => loader.key),
      errors: {
        configuration: { key: 'configuration', label: 'Supabase', message },
      },
      sectionErrors: [{ key: 'configuration', label: 'Supabase', message }],
      message,
    }
  }

  const settledResults = await Promise.allSettled(adminDataLoaders.map((loader) => runAdminLoader(loader, dependencies)))
  const data = createEmptyAdminData()
  const errors = {}
  const updatedSections = []
  const failedSections = []

  settledResults.forEach((result, index) => {
    const loader = adminDataLoaders[index]

    if (result.status === 'rejected') {
      const error = createSectionError(loader.key, loader.label, result.reason, `No fue posible cargar ${loader.label}.`)
      errors[loader.key] = error
      failedSections.push(loader.key)
      return
    }

    data[result.value.key] = result.value.data
    if (result.value.error) {
      errors[result.value.key] = result.value.error
      failedSections.push(result.value.key)
      return
    }

    updatedSections.push(result.value.key)
  })

  return {
    success: failedSections.length === 0,
    partial: failedSections.length > 0 && updatedSections.length > 0,
    data,
    updatedSections,
    failedSections,
    errors,
    sectionErrors: Object.values(errors),
  }
}

export function mergeAdminDataResult(currentData, result) {
  if (!result?.success && !result?.partial) return currentData
  return {
    ...currentData,
    ...Object.fromEntries((result.updatedSections ?? []).map((key) => [key, result.data[key]])),
  }
}

/**
 * Centraliza lectura, recargas y errores parciales del panel admin.
 * No ejecuta mutaciones ni muestra feedback visual.
 */
export function useAdminData(options = {}) {
  const {
    configured = isSupabaseConfigured,
    supabaseClient = supabase,
    loadUpcomingBirthdaysFn = loadUpcomingBirthdays,
    logError = logAppError,
    now = getCurrentDate,
  } = options

  const [data, setData] = useState(() => createEmptyAdminData())
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sectionLoading, setSectionLoading] = useState(() => createEmptySectionLoading())
  const [sectionErrorsByKey, setSectionErrorsByKey] = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)
  const mountedRef = useRef(true)
  const hasLoadedRef = useRef(false)
  const globalRequestIdRef = useRef(0)
  const sectionRequestIdsRef = useRef({})

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  const reloadAll = useCallback(async () => {
    const requestId = ++globalRequestIdRef.current
    const isInitialLoad = !hasLoadedRef.current

    if (mountedRef.current) {
      if (isInitialLoad) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }
    }

    try {
      const result = await loadAdminDataSnapshot({
        configured,
        supabaseClient,
        loadUpcomingBirthdaysFn,
        logError,
      })

      if (!mountedRef.current || requestId !== globalRequestIdRef.current) return result

      if (result.success || result.partial) {
        setData((current) => mergeAdminDataResult(current, result))
        setSectionErrorsByKey((current) => {
          const next = { ...current, ...result.errors }
          result.updatedSections.forEach((key) => {
            delete next[key]
          })
          return next
        })
        setLastUpdated(now())
        hasLoadedRef.current = true
      } else {
        setSectionErrorsByKey(result.errors)
      }

      return result
    } finally {
      if (mountedRef.current && requestId === globalRequestIdRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [configured, loadUpcomingBirthdaysFn, logError, now, supabaseClient])

  const reloadSection = useCallback(async (sectionKey) => {
    const loader = loaderByKey.get(sectionKey)
    if (!loader) {
      const error = new Error('Unknown admin data section')
      return { success: false, partial: false, sectionKey, error, updatedSections: [], failedSections: [sectionKey], errors: { [sectionKey]: error } }
    }

    const requestId = (sectionRequestIdsRef.current[sectionKey] ?? 0) + 1
    sectionRequestIdsRef.current[sectionKey] = requestId

    if (mountedRef.current) {
      setSectionLoading((current) => ({ ...current, [sectionKey]: true }))
    }

    try {
      const result = await runAdminLoader(loader, {
        supabaseClient,
        loadUpcomingBirthdaysFn,
        logError,
      })

      if (!mountedRef.current || sectionRequestIdsRef.current[sectionKey] !== requestId) {
        return { success: false, partial: false, sectionKey, stale: true, updatedSections: [], failedSections: [] }
      }

      if (result.error) {
        setSectionErrorsByKey((current) => ({ ...current, [sectionKey]: result.error }))
        return {
          success: false,
          partial: false,
          sectionKey,
          updatedSections: [],
          failedSections: [sectionKey],
          errors: { [sectionKey]: result.error },
        }
      }

      setData((current) => ({ ...current, [sectionKey]: result.data }))
      setSectionErrorsByKey((current) => {
        const next = { ...current }
        delete next[sectionKey]
        return next
      })
      setLastUpdated(now())
      hasLoadedRef.current = true

      return {
        success: true,
        partial: false,
        sectionKey,
        updatedSections: [sectionKey],
        failedSections: [],
        errors: {},
        data: result.data,
      }
    } finally {
      if (mountedRef.current && sectionRequestIdsRef.current[sectionKey] === requestId) {
        setSectionLoading((current) => ({ ...current, [sectionKey]: false }))
      }
    }
  }, [loadUpcomingBirthdaysFn, logError, now, supabaseClient])

  const updateSectionData = useCallback((sectionKey, updater) => {
    if (!loaderByKey.has(sectionKey)) return
    setData((current) => ({
      ...current,
      [sectionKey]: typeof updater === 'function' ? updater(current[sectionKey]) : updater,
    }))
  }, [])

  return {
    data,
    isLoading,
    isRefreshing,
    sectionLoading,
    sectionErrors: Object.values(sectionErrorsByKey),
    lastUpdated,
    reloadAll,
    reloadSection,
    updateSectionData,
  }
}
