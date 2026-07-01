import assert from 'node:assert/strict'
import { ADMIN_FEEDBACK_TYPES, createAdminFeedbackController } from './useAdminFeedback.js'

function createFakeTimers() {
  let nextId = 1
  const timers = new Map()
  return {
    setTimeout(callback, duration) {
      const id = nextId
      nextId += 1
      timers.set(id, { callback, duration, active: true })
      return id
    },
    clearTimeout(id) {
      timers.delete(id)
    },
    run(id) {
      const timer = timers.get(id)
      if (!timer) return
      timers.delete(id)
      timer.callback()
    },
    runAll() {
      Array.from(timers.keys()).forEach((id) => this.run(id))
    },
    count() {
      return timers.size
    },
    ids() {
      return Array.from(timers.keys())
    },
    duration(id) {
      return timers.get(id)?.duration
    },
  }
}

function testInitialStateAndTypes() {
  const controller = createAdminFeedbackController()
  assert.deepEqual(controller.getState(), { message: '', type: ADMIN_FEEDBACK_TYPES.ERROR })

  controller.showSuccess('Guardado')
  assert.deepEqual(controller.getState(), { message: 'Guardado', type: ADMIN_FEEDBACK_TYPES.SUCCESS })

  controller.showError(new Error('Falló'))
  assert.deepEqual(controller.getState(), { message: 'Falló', type: ADMIN_FEEDBACK_TYPES.ERROR })

  controller.showInfo('Info')
  assert.deepEqual(controller.getState(), { message: 'Info', type: ADMIN_FEEDBACK_TYPES.INFO })

  controller.showWarning('Alerta')
  assert.deepEqual(controller.getState(), { message: 'Alerta', type: ADMIN_FEEDBACK_TYPES.WARNING })
}

function testClearAndReplacement() {
  const timers = createFakeTimers()
  const controller = createAdminFeedbackController({ timerApi: timers })

  controller.showSuccess('Primero', { autoDismiss: true, duration: 1000 })
  const firstTimer = timers.ids()[0]
  controller.showSuccess('Segundo', { autoDismiss: true, duration: 2000 })

  assert.equal(timers.count(), 1)
  assert.equal(timers.ids().includes(firstTimer), false)
  assert.deepEqual(controller.getState(), { message: 'Segundo', type: ADMIN_FEEDBACK_TYPES.SUCCESS })

  controller.clearFeedback()
  assert.equal(timers.count(), 0)
  assert.deepEqual(controller.getState(), { message: '', type: ADMIN_FEEDBACK_TYPES.ERROR })
}

function testAutoDismissAndPersistentError() {
  const timers = createFakeTimers()
  const controller = createAdminFeedbackController({ timerApi: timers })

  controller.showInfo('Se limpia', { autoDismiss: true, duration: 1500 })
  const timerId = timers.ids()[0]
  assert.equal(timers.duration(timerId), 1500)
  timers.run(timerId)
  assert.deepEqual(controller.getState(), { message: '', type: ADMIN_FEEDBACK_TYPES.ERROR })

  controller.showError('Permanece')
  assert.equal(timers.count(), 0)
  assert.deepEqual(controller.getState(), { message: 'Permanece', type: ADMIN_FEEDBACK_TYPES.ERROR })
}

function testOldTimerDoesNotClearNewMessage() {
  const timers = createFakeTimers()
  const controller = createAdminFeedbackController({ timerApi: timers })

  controller.showSuccess('Viejo', { autoDismiss: true, duration: 1000 })
  const oldTimer = timers.ids()[0]
  controller.showError('Nuevo', { autoDismiss: false })
  timers.run(oldTimer)

  assert.deepEqual(controller.getState(), { message: 'Nuevo', type: ADMIN_FEEDBACK_TYPES.ERROR })
}

function testEmptyCustomDurationAndUnmount() {
  const timers = createFakeTimers()
  const changes = []
  const controller = createAdminFeedbackController({ timerApi: timers, onChange: (state) => changes.push(state) })

  controller.showWarning('')
  assert.deepEqual(controller.getState(), { message: '', type: ADMIN_FEEDBACK_TYPES.WARNING })

  controller.showSuccess('Temporal', { autoDismiss: true, duration: 500 })
  assert.equal(timers.duration(timers.ids()[0]), 500)
  controller.unmount()
  assert.equal(timers.count(), 0)
  controller.showSuccess('No renderiza')
  assert.equal(changes.at(-1).message, 'Temporal')
}

testInitialStateAndTypes()
testClearAndReplacement()
testAutoDismissAndPersistentError()
testOldTimerDoesNotClearNewMessage()
testEmptyCustomDurationAndUnmount()
