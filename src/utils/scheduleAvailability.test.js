/* global console, setTimeout */
import assert from 'node:assert/strict'
import {getNextChileScheduleDate,loadScheduleAvailability} from './scheduleAvailability.js'
assert.equal(getNextChileScheduleDate(5,new Date('2026-10-31T01:00:00Z')),'2026-10-30')
assert.equal(getNextChileScheduleDate(1,new Date('2026-10-31T01:00:00Z')),'2026-11-02')
const requests=Array.from({length:9},(_,i)=>({class_schedule_id:`class-${i}`,reservation_date:'2026-10-30'}))
let calls=0
const bulk={rpc:async(name)=>{calls++;assert.equal(name,'get_schedule_availability');return {data:requests.map((r)=>({...r,available_spots:0}))}}}
const result=await loadScheduleAvailability(bulk,requests)
assert.equal(result.get('class-0:2026-10-30'),0);assert.equal(calls,1)
await assert.rejects(()=>loadScheduleAvailability({rpc:async()=>({data:[]})},requests),/incomplete/)
let active=0,max=0
const legacy={rpc:async(name)=>{
 if(name==='get_schedule_availability')return {error:{code:'PGRST202'}}
 active++;max=Math.max(max,active);await new Promise((r)=>setTimeout(r,2));active--;return {data:2}
}}
assert.equal((await loadScheduleAvailability(legacy,requests)).size,9);assert.equal(max,4)
await assert.rejects(()=>loadScheduleAvailability({rpc:async()=>({error:{code:'42501'}})},requests))
await assert.rejects(()=>loadScheduleAvailability({rpc:async(name)=>name==='get_schedule_availability'?{error:{code:'42883'}}:{data:null}},requests))
console.log('Availability batching, failure handling, legacy limit and Chile date tests: OK')
