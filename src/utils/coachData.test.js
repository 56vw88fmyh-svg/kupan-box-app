import assert from 'node:assert/strict'
import { pickCurrentAndNext } from './coachData.js'

const classes = [
  { id: undefined, time: '19:00', endTime: '', className: 'CrossFit' },
  { id: undefined, time: '20:00', endTime: '', className: 'CrossFit' },
]

const afternoon = new Date(2026, 8, 15, 14, 0)
const beforeFirstClass = pickCurrentAndNext(classes, afternoon)

assert.equal(beforeFirstClass.currentClass.time, '19:00')
assert.equal(beforeFirstClass.currentClass.isCurrent, false)
assert.equal(beforeFirstClass.nextClass.time, '20:00')

const duringFirstClass = pickCurrentAndNext(classes, new Date(2026, 8, 15, 19, 30))

assert.equal(duringFirstClass.currentClass.time, '19:00')
assert.equal(duringFirstClass.currentClass.isCurrent, true)
assert.equal(duringFirstClass.nextClass.time, '20:00')
