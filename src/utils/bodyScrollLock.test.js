/* global console */
import assert from 'node:assert/strict'
import { acquireBodyScrollLock } from './bodyScrollLock.js'
function makeBody(overflow = '', priority = '') {
  const styles = new Map([['overflow', [overflow, priority]], ['width', ['80%', 'important']]])
  const calls = []
  return { calls, ownerDocument: { defaultView: { scrollX: 3, scrollY: 640, scrollTo: (value) => calls.push(value) } }, style: {
    getPropertyValue: (key) => styles.get(key)?.[0] ?? '',
    getPropertyPriority: (key) => styles.get(key)?.[1] ?? '',
    setProperty: (key, value, precedence = '') => styles.set(key, [value, precedence]),
    removeProperty: (key) => styles.delete(key),
  } }
}
for (const original of ['', 'auto', 'scroll']) {
  const body = makeBody(original, original ? 'important' : '')
  const first = acquireBodyScrollLock(body)
  const second = acquireBodyScrollLock(body)
  assert.equal(body.style.getPropertyValue('position'), 'fixed')
  assert.equal(body.style.getPropertyValue('top'), '-640px')
  first(); first()
  assert.equal(body.style.getPropertyValue('overflow'), 'hidden')
  assert.equal(body.calls.length, 0)
  second()
  assert.equal(body.style.getPropertyValue('overflow'), original)
  assert.equal(body.style.getPropertyPriority('overflow'), original ? 'important' : '')
  assert.equal(body.style.getPropertyValue('position'), '')
  assert.equal(body.style.getPropertyValue('width'), '80%')
  assert.equal(body.style.getPropertyPriority('width'), 'important')
  assert.deepEqual(body.calls, [{left:3,top:640,behavior:'instant'}])
  const third = acquireBodyScrollLock(body); third()
  assert.equal(body.style.getPropertyValue('overflow'), original)
}
console.log('Body scroll lock lifecycle and position restoration: OK')
