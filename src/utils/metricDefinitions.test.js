/* global console */
import assert from 'node:assert/strict'
import { weekRange, weeklyOccupancy, renewalCandidates, monthlyAttendance, completedThisWeek } from './metricDefinitions.js'
import { formatRecordValue, formatCalendarDate, formatStatus } from './displayFormats.js'
const today='2026-11-04'
assert.deepEqual(weekRange(today),{start:'2026-11-02',end:'2026-11-08'})
assert.deepEqual(weekRange('2026-11-08'),{start:'2026-11-02',end:'2026-11-08'})
const schedule=[{id:'x',active:true,max_spots:10},{id:'unlimited',active:true,max_spots:10,unlimited_capacity:true}]
const reservations=[{class_schedule_id:'x',reservation_date:today,status:'reserved'},{class_schedule_id:'x',reservation_date:'2026-11-03',status:'attended'},{class_schedule_id:'x',reservation_date:'2026-11-12',status:'reserved'},{class_schedule_id:'x',reservation_date:today,status:'cancelled'},{class_schedule_id:'unlimited',reservation_date:today,status:'reserved'}]
assert.equal(weeklyOccupancy(schedule,reservations,today),20)
assert.equal(weeklyOccupancy([],reservations,today),null)
assert.equal(monthlyAttendance([],today).noShowRate,null)
assert.equal(monthlyAttendance([...reservations,{reservation_date:today,status:'no_show'}],today).noShowRate,50)
assert.equal(completedThisWeek([...reservations,{reservation_date:'2026-11-02',status:'attended'},{reservation_date:'2026-11-02',status:'attended'}],today),3)
const profiles=[{id:'a',status:'active'},{id:'b',status:'active'},{id:'c',status:'inactive'},{id:'d',status:'active',role:'admin'}]
const old=id=>({profile_id:id,start_date:'2026-09-01',end_date:'2026-09-30',status:'expired',payment_status:'paid'})
assert.deepEqual(renewalCandidates(profiles,[old('a'),old('a'),old('b'),old('c'),old('d'),{profile_id:'a',start_date:'2026-11-01',end_date:'2026-11-30',status:'active',payment_status:'paid'}],today).map(p=>p.id),['b'])
assert.equal(formatRecordValue({value:780,unit:'tiempo'}),'13:00')
assert.equal(formatRecordValue({value:0,unit:'reps',rounds:0,reps:15}),'0 rondas + 15 reps')
assert.equal(formatCalendarDate('bad'),'Sin fecha')
assert.equal(formatStatus('active'),'Activo')
assert.equal(formatRecordValue({value:59.9,unit:'tiempo'}),'1:00')
assert.match(formatCalendarDate('2026-11-01T01:00:00Z'),/31.*oct/)
assert.equal(renewalCandidates([{id:'a',status:'active'}],[old('a'),{profile_id:'a',start_date:'2026-11-10',end_date:'2026-12-10',status:'active',payment_status:'paid'}],today).length,0)
console.log('Metrics: aligned periods, renewals per athlete, attendance only, empty denominators and formats OK')
