import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  WOD_DRAFT_STORAGE_KEY,
  classifyStoredWodDraft,
  createWodDraftRecord,
  getWodDraftMetadata,
  hasMeaningfulWodDraftContent,
  parseStoredWodDraft,
  serializeWodDraft,
} from '../../utils/adminWodDraft.js'
import { logAppError } from '../../utils/appState.js'

function getBrowserStorage(storageKey) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { storage: null, error: null }
  } catch (error) {
    return { storage: null, error }
  }

  return {
    storage: {
      read() {
        const rawValue = window.localStorage.getItem(storageKey)
        return {
          draft: parseStoredWodDraft(rawValue),
          invalid: Boolean(rawValue) && !parseStoredWodDraft(rawValue),
        }
      },
      write(record) {
        window.localStorage.setItem(storageKey, JSON.stringify(record))
      },
      remove() {
        window.localStorage.removeItem(storageKey)
      },
    },
    error: null,
  }
}

function resolveRemoteWod(remoteWod, date) {
  if (Array.isArray(remoteWod)) return remoteWod.find((item) => item.date === date) ?? null
  return remoteWod?.date === date ? remoteWod : null
}

export function useAdminWodDraft({
  draft,
  onRecover,
  remoteWod = null,
  storageKey = WOD_DRAFT_STORAGE_KEY,
  autoSaveDelay = 700,
  logError = logAppError,
} = {}) {
  const storageRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const mountedRef = useRef(true)
  const [storedDraft, setStoredDraft] = useState(null)
  const [storageError, setStorageError] = useState(null)

  useEffect(() => {
    mountedRef.current = true
    const { storage, error } = getBrowserStorage(storageKey)
    storageRef.current = storage
    setStorageError(error)

    if (error) {
      logError('admin.wodDraft.storageUnavailable', error)
      return () => {
        mountedRef.current = false
      }
    }

    try {
      const result = storage?.read() ?? { draft: null, invalid: false }
      if (result.invalid) {
        storage?.remove()
        logError('admin.wodDraft.invalidStoredDraft', new Error('Invalid WOD draft payload'))
      }
      setStoredDraft(result.draft)
    } catch (readError) {
      storageRef.current = null
      setStorageError(readError)
      logError('admin.wodDraft.read', readError)
    }

    return () => {
      mountedRef.current = false
    }
  }, [logError, storageKey])

  const clearSaveTimeout = useCallback(() => {
    if (!saveTimeoutRef.current) return
    window.clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = null
  }, [])

  const saveDraftNow = useCallback(() => {
    const storage = storageRef.current
    if (!storage || !hasMeaningfulWodDraftContent(draft)) return false

    try {
      const record = createWodDraftRecord(draft, resolveRemoteWod(remoteWod, draft?.date))
      storage.write(record)
      setStorageError(null)
      if (mountedRef.current) setStoredDraft(record)
      return true
    } catch (error) {
      setStorageError(error)
      logError('admin.wodDraft.save', error)
      return false
    }
  }, [draft, logError, remoteWod])

  const clearStoredDraft = useCallback(() => {
    clearSaveTimeout()
    try {
      storageRef.current?.remove()
      setStorageError(null)
    } catch (error) {
      setStorageError(error)
      logError('admin.wodDraft.clear', error)
    }
    if (mountedRef.current) setStoredDraft(null)
  }, [clearSaveTimeout, logError])

  const discardStoredDraft = useCallback(() => {
    clearStoredDraft()
  }, [clearStoredDraft])

  const recoverStoredDraft = useCallback(() => {
    if (!storedDraft?.draft || typeof onRecover !== 'function') return false
    onRecover(storedDraft.draft)
    return true
  }, [onRecover, storedDraft])

  const markRemoteSaveSuccessful = useCallback(() => {
    clearStoredDraft()
  }, [clearStoredDraft])

  useEffect(() => {
    clearSaveTimeout()

    if (!hasMeaningfulWodDraftContent(draft)) return undefined

    saveTimeoutRef.current = window.setTimeout(() => {
      saveDraftNow()
      saveTimeoutRef.current = null
    }, autoSaveDelay)

    return clearSaveTimeout
  }, [autoSaveDelay, clearSaveTimeout, draft, saveDraftNow])

  useEffect(() => {
    function handleBeforeUnload() {
      saveDraftNow()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveDraftNow])

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== storageKey) return
      setStoredDraft(parseStoredWodDraft(event.newValue))
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [storageKey])

  const isDraftDirty = useMemo(() => {
    if (!hasMeaningfulWodDraftContent(draft)) return false
    if (!storedDraft?.draft) return true

    try {
      return serializeWodDraft(draft) !== serializeWodDraft(storedDraft.draft)
    } catch {
      return true
    }
  }, [draft, storedDraft])

  const storedDraftStatus = useMemo(
    () => classifyStoredWodDraft(storedDraft, resolveRemoteWod(remoteWod, storedDraft?.date)),
    [remoteWod, storedDraft],
  )

  useEffect(() => {
    if (!['expired', 'identical_to_remote', 'incompatible', 'empty'].includes(storedDraftStatus)) return
    if (!storedDraft) return
    clearStoredDraft()
  }, [clearStoredDraft, storedDraft, storedDraftStatus])

  const hasRecoverableStoredDraft = ['recoverable', 'potentially_newer', 'potentially_old'].includes(storedDraftStatus)

  return {
    hasStoredDraft: Boolean(storedDraft) && hasRecoverableStoredDraft,
    storedDraft: hasRecoverableStoredDraft ? storedDraft : null,
    storedDraftMetadata: hasRecoverableStoredDraft ? getWodDraftMetadata(storedDraft) : null,
    storedDraftStatus,
    isDraftDirty,
    storageError,
    saveDraftNow,
    discardStoredDraft,
    recoverStoredDraft,
    clearStoredDraft,
    markRemoteSaveSuccessful,
  }
}
