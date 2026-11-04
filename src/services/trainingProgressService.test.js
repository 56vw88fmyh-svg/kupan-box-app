import assert from 'node:assert/strict'
import {loadTrainingProgress} from './trainingProgressService.js'
let pages=0
const rows=Array.from({length:251},(_,id)=>({id:String(id),record_date:'2026-11-04',profile_id:'a'}))
const client={auth:{getUser:async()=>({data:{user:{id:'a'}}})},rpc:async()=>{throw new Error('Legacy upcoming-only RPC must not load attendance')},from(table){return {select(){return this},eq(){return this},order(){return this},range(from,to){pages++;return Promise.resolve({data:table==='workout_results'?rows.slice(from,to+1):table==='reservations'?[{id:'old',reservation_date:'2026-10-01',status:'attended'}]:[]})},maybeSingle:async()=>({data:{weekly_goal:3}})}}}
const result=await loadTrainingProgress('a',client)
assert.equal(result.ok,true);assert.equal(result.sources.sessions.data.length,251);assert.equal(pages,4);assert.equal(result.sources.attendance.data[0].reservation_date,'2026-10-01')
assert.equal((await loadTrainingProgress('b',client)).ok,false)
const broken={...client,from(table){if(table==='workout_results')return {select(){return this},eq(){return this},order(){return this},range:async()=>({error:{message:'network'}})};return client.from(table)}}
const partial=await loadTrainingProgress('a',broken)
assert.equal(partial.sources.sessions.ok,false);assert.equal(partial.sources.attendance.ok,true)
assert.equal(partial.sources.sessions.data,undefined)
