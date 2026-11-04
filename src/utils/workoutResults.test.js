/* global console */
import assert from 'node:assert/strict'
import { buildResultInput, parseTimeToSeconds, resultContext, isBetterResult } from './workoutResults.js'
const wod = { id: 'w1', title: 'Same title', date: '2026-11-04', workout: ['10 reps'], strength: [], scaling: [], timeCap: '10' }
for (const [rounds, reps] of [['0', '15'], ['3', '0'], ['3', '']]) assert.equal(buildResultInput(wod, 'RX', { type: 'rounds_reps', rounds, reps }).ok, true)
for (const [rounds, reps] of [['0', '0'], ['-1', '5'], ['1.2', '2'], ['', '5']]) assert.equal(buildResultInput(wod, 'RX', { type: 'rounds_reps', rounds, reps }).ok, false)
for (const invalid of ['-1:30','1:99','1:2','0:00','abc','1:60:00']) assert.equal(parseTimeToSeconds(invalid), null)
assert.equal(parseTimeToSeconds('12:35'), 755)
assert.equal(parseTimeToSeconds('1:02:03'), 3723)
assert.notDeepEqual(resultContext(wod, 'RX', 'time'), resultContext(wod, 'Scaled', 'time'))
assert.notDeepEqual(resultContext(wod, 'RX', 'time'), resultContext({ ...wod, id: 'w2' }, 'RX', 'time'))
assert.notDeepEqual(resultContext(wod, 'RX', 'time'), resultContext({ ...wod, workout: ['20 reps'] }, 'RX', 'time'))
assert.equal(isBetterResult({ value: 200, unit: 'tiempo' }, { value: 300, unit: 'tiempo' }), true)
console.log('Workout validation and comparison context: OK')
