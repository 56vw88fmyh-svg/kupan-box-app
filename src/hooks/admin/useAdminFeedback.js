import { useCallback, useEffect, useRef, useState } from 'react'

export const ADMIN_FEEDBACK_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
}

const DEFAULT_MESSAGE = ''
const DEFAULT_TYPE = ADMIN_FEEDBACK_TYPES.ERROR

function normalizeFeedbackMessage(message) {
  if (!message) return DEFAULT_MESSAGE
  if (typeof message === 'string') return message
  return String(message.message || message.error_description || message.details || message)
}

function normalizeFeedbackType(type) {
  return Object.values(ADMIN_FEEDBACK_TYPES).includes(type) ? type : DEFAULT_TYPE
}

function getTimerApi() {
  return {
    setTimeout: globalThis.window?.setTimeout?.bind(globalThis.window) ?? globalThis.setTimeout?.bind(globalThis),
    clearTimeout: globalThis.window?.clearTimeout?.bind(globalThis.window) ?? globalThis.clearTimeout?.bind(globalThis),
  }
}

export function createAdminFeedbackController(options = {}) {
  const {
    defaultType = DEFAULT_TYPE,
    defaultAutoDismiss = false,
    defaultDuration = 4000,
    timerApi = getTimerApi(),
    onChange = () => {},
  } = options
  let state = { message: DEFAULT_MESSAGE, type: normalizeFeedbackType(defaultType) }
  let timerId = null
  let messageId = 0
  let mounted = true

  function emit(nextState) {
    state = nextState
    if (mounted) onChange(state)
  }

  function cancelTimer() {
    if (!timerId) return
    timerApi.clearTimeout?.(timerId)
    timerId = null
  }

  function clearFeedback() {
    cancelTimer()
    messageId += 1
    emit({ message: DEFAULT_MESSAGE, type: normalizeFeedbackType(defaultType) })
  }

  function showFeedback(type, message, feedbackOptions = {}) {
    const normalizedMessage = normalizeFeedbackMessage(message)
    const normalizedType = normalizeFeedbackType(type)
    const autoDismiss = feedbackOptions.autoDismiss ?? defaultAutoDismiss
    const duration = feedbackOptions.duration ?? defaultDuration

    cancelTimer()
    messageId += 1
    const currentMessageId = messageId

    if (!normalizedMessage) {
      emit({ message: DEFAULT_MESSAGE, type: normalizedType })
      return
    }

    emit({ message: normalizedMessage, type: normalizedType })

    if (autoDismiss && Number(duration) > 0 && timerApi.setTimeout) {
      timerId = timerApi.setTimeout(() => {
        if (!mounted || currentMessageId !== messageId) return
        timerId = null
        emit({ message: DEFAULT_MESSAGE, type: normalizeFeedbackType(defaultType) })
      }, Number(duration))
    }
  }

  return {
    getState: () => state,
    showSuccess: (message, feedbackOptions) => showFeedback(ADMIN_FEEDBACK_TYPES.SUCCESS, message, feedbackOptions),
    showError: (message, feedbackOptions) => showFeedback(ADMIN_FEEDBACK_TYPES.ERROR, message, feedbackOptions),
    showInfo: (message, feedbackOptions) => showFeedback(ADMIN_FEEDBACK_TYPES.INFO, message, feedbackOptions),
    showWarning: (message, feedbackOptions) => showFeedback(ADMIN_FEEDBACK_TYPES.WARNING, message, feedbackOptions),
    clearFeedback,
    unmount: () => {
      mounted = false
      cancelTimer()
    },
  }
}

/**
 * Centraliza feedback visual del panel admin.
 * Mantiene compatibilidad con `message` y `messageType`.
 */
export function useAdminFeedback(options = {}) {
  const {
    defaultType = DEFAULT_TYPE,
    defaultAutoDismiss = false,
    defaultDuration = 4000,
    timerApi = getTimerApi(),
  } = options
  const [feedback, setFeedback] = useState({ message: DEFAULT_MESSAGE, type: normalizeFeedbackType(defaultType) })
  const timerRef = useRef(null)
  const messageIdRef = useRef(0)
  const mountedRef = useRef(true)

  const cancelTimer = useCallback(() => {
    if (!timerRef.current) return
    timerApi.clearTimeout?.(timerRef.current)
    timerRef.current = null
  }, [timerApi])

  const clearFeedback = useCallback(() => {
    cancelTimer()
    messageIdRef.current += 1
    if (mountedRef.current) setFeedback({ message: DEFAULT_MESSAGE, type: normalizeFeedbackType(defaultType) })
  }, [cancelTimer, defaultType])

  const showFeedback = useCallback((type, message, feedbackOptions = {}) => {
    const normalizedMessage = normalizeFeedbackMessage(message)
    const normalizedType = normalizeFeedbackType(type)
    const autoDismiss = feedbackOptions.autoDismiss ?? defaultAutoDismiss
    const duration = feedbackOptions.duration ?? defaultDuration

    cancelTimer()
    messageIdRef.current += 1
    const messageId = messageIdRef.current

    if (!normalizedMessage) {
      if (mountedRef.current) setFeedback({ message: DEFAULT_MESSAGE, type: normalizedType })
      return
    }

    if (mountedRef.current) setFeedback({ message: normalizedMessage, type: normalizedType })

    if (autoDismiss && Number(duration) > 0 && timerApi.setTimeout) {
      timerRef.current = timerApi.setTimeout(() => {
        if (!mountedRef.current || messageId !== messageIdRef.current) return
        timerRef.current = null
        setFeedback({ message: DEFAULT_MESSAGE, type: normalizeFeedbackType(defaultType) })
      }, Number(duration))
    }
  }, [cancelTimer, defaultAutoDismiss, defaultDuration, defaultType, timerApi])

  useEffect(() => () => {
    mountedRef.current = false
    cancelTimer()
  }, [cancelTimer])

  return {
    feedback,
    message: feedback.message,
    messageType: feedback.type,
    showSuccess: useCallback((message, feedbackOptions) => showFeedback(ADMIN_FEEDBACK_TYPES.SUCCESS, message, feedbackOptions), [showFeedback]),
    showError: useCallback((message, feedbackOptions) => showFeedback(ADMIN_FEEDBACK_TYPES.ERROR, message, feedbackOptions), [showFeedback]),
    showInfo: useCallback((message, feedbackOptions) => showFeedback(ADMIN_FEEDBACK_TYPES.INFO, message, feedbackOptions), [showFeedback]),
    showWarning: useCallback((message, feedbackOptions) => showFeedback(ADMIN_FEEDBACK_TYPES.WARNING, message, feedbackOptions), [showFeedback]),
    clearFeedback,
  }
}
