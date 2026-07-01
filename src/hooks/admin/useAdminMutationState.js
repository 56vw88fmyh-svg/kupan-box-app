import { useCallback, useEffect, useRef, useState } from 'react'

export function createMutationResult({ success, data = null, error = null, message = '', affectedSections = [], partial = false, extra = {} }) {
  return { success, data, error, message, affectedSections, partial, ...extra }
}

export function useAdminMutationState(initialState = {}) {
  const [operationState, setOperationState] = useState(initialState)
  const mountedRef = useRef(true)
  const pendingRef = useRef(new Set())

  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  const isPending = useCallback((key) => pendingRef.current.has(key), [])

  const runOperation = useCallback(async (key, action, { blockedMessage = 'Operación en curso.' } = {}) => {
    if (pendingRef.current.has(key)) {
      return createMutationResult({ success: false, error: new Error(blockedMessage), message: blockedMessage, blocked: true })
    }

    pendingRef.current.add(key)
    if (mountedRef.current) setOperationState((current) => ({ ...current, [key]: true }))

    try {
      return await action()
    } finally {
      pendingRef.current.delete(key)
      if (mountedRef.current) setOperationState((current) => ({ ...current, [key]: false }))
    }
  }, [])

  return { operationState, runOperation, isPending }
}
