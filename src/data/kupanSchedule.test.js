/* global console */
import assert from 'node:assert/strict'
import { weeklySchedule } from './fallbackData.js'
import { gymConfigs } from '../config/gyms.js'
import { buildSchedulePayload } from '../utils/adminMutationBuilders.js'

const expected = [
  ['CrossFit','CrossFit','CrossFit'], ['CrossFit','Hybrid','CrossFit'],
  ['Hybrid','CrossFit','CrossFit'], ['CrossFit','Hybrid','CrossFit'],
  ['CrossFit','CrossFit','Hybrid'],
]
assert.equal(gymConfigs.kupan.operations.defaultClassCapacity,10)
assert.equal(gymConfigs.fittest.operations.defaultClassCapacity,15)
expected.forEach((names,index)=>{
  assert.deepEqual(weeklySchedule[index].blocks.PM.map(c=>c.name),names)
  assert.deepEqual(weeklySchedule[index].blocks.PM.map(c=>c.time),['18:00','19:00','20:00'])
  weeklySchedule[index].blocks.PM.forEach(c=>assert.equal(c.maxSpots,10))
})
assert.match(weeklySchedule[5].note,/Hybrid y CrossFit: horarios por definir/)
assert.deepEqual(weeklySchedule[5].blocks,{AM:[],PM:[]})
const payload=buildSchedulePayload({day_of_week:1,time:'18:00',max_spots:99,unlimited_capacity:true})
assert.equal(payload.max_spots,10)
assert.equal(payload.unlimited_capacity,false)
console.log('KUPAN schedule and capacity tests passed')
