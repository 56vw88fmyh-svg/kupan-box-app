import assert from 'node:assert/strict'
import {weeklyAttendance,periodRange,comparisonKey,resultGroups,movementGroups,bestResult,calendarDays,scheduleDemand,renewalSegments} from './trainingProgress.js'
import {resultContext,isBetterResult} from './workoutResults.js'
const today='2026-11-04'
const res=[{id:'a',reservation_date:today,status:'attended'},{id:'b',reservation_date:today,status:'reserved'},{id:'c',reservation_date:today,status:'no_show'},{id:'d',reservation_date:'2026-09-01',status:'attended'}]
assert.equal(weeklyAttendance(res,today,4).reduce((n,row)=>n+row.value,0),1)
assert.equal(weeklyAttendance(res,today,4).length,4)
assert.equal(periodRange(today,4).end,today)
const wod={id:'a',workout:['21-15-9'],strength:[],timeCap:'10',scaling:[],benchmarkId:'fran'}
const a=resultContext(wod,'RX','time'), b=resultContext({...wod,id:'b'},'RX','time')
assert.equal(comparisonKey(a,'tiempo'),comparisonKey(b,'tiempo'))
assert.notEqual(comparisonKey(a,'tiempo'),comparisonKey(resultContext(wod,'Scaled','time'),'tiempo'))
assert.notEqual(comparisonKey(a,'tiempo'),comparisonKey(resultContext({...wod,workout:['10 reps']},'RX','time'),'tiempo'))
assert.notEqual(comparisonKey(resultContext({...wod,benchmarkId:''},'RX','time'),'tiempo'),comparisonKey(resultContext({...wod,id:'b',benchmarkId:''},'RX','time'),'tiempo'))
const rows=[{id:'1',value:300,unit:'tiempo',record_date:today,result_context:a},{id:'2',value:250,unit:'tiempo',record_date:today,result_context:b}]
assert.equal(resultGroups(rows).length,1);assert.equal(bestResult(rows).id,'2')
assert.equal(movementGroups([{id:'old',movement:'WOD: Fran',unit:'kg'}, {id:'x',movement:'Squat',unit:'kg',value:80.5},{id:'y',movement:'Squat',unit:'kg',value:80.9}]).length,1)
assert.equal(isBetterResult({unit:'kg',value:80.9,rounds:null,reps:null},{unit:'kg',value:80.5,rounds:null,reps:null}),true)
const days=calendarDays('2026-11',res,rows)
assert.equal(days.length,30);assert.equal(days[3].reservations.length,3);assert.equal(days[3].results.length,2)
assert.equal(calendarDays('invalid',[],[]).length,0)
const demand=scheduleDemand([{id:'class',active:true,day_of_week:3,time:'18:00',max_spots:10},{id:'open',active:true,day_of_week:3,unlimited_capacity:true}], [{class_schedule_id:'class',reservation_date:today,status:'reserved'},{class_schedule_id:'open',reservation_date:today,status:'reserved'}],today)
assert.equal(demand.length,7);assert.equal(demand[0].value,10);assert.equal(demand[0].openAccess,true);assert.equal(demand[1].value,null)
const segments=renewalSegments([{id:'p',status:'active',role:'student'},{id:'admin',status:'active',role:'admin'}],[],today)
assert.equal(segments.reduce((n,row)=>n+row.value,0),1)
