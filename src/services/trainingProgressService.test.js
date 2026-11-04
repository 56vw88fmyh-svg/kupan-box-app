import assert from 'node:assert/strict'
import {loadTrainingProgress} from './trainingProgressService.js'
let pages=0
const rows=Array.from({length:251},(_,id)=>({id:String(id),record_date:'2026-11-04',profile_id:'a'}))
const client={auth:{getUser:async()=>({data:{user:{id:'a'}}})},rpc:async(name)=>{assert.equal(name,'get_my_training_attendance');return {data:[{id:'old',reservation_date:'2026-10-01',status:'attended'}]}},from(table){return {select(){return this},eq(){return this},order(){return this},range(from,to){pages++;return Promise.resolve({data:table==='workout_results'?rows.slice(from,to+1):table==='reservations'?[{id:'old',reservation_date:'2026-10-01',status:'attended'}]:[]})},maybeSingle:async()=>({data:{weekly_goal:3}})}}}
const result=await loadTrainingProgress('a',client)
assert.equal(result.ok,true);assert.equal(result.sources.sessions.data.length,251);assert.equal(pages,3);assert.equal(result.sources.attendance.data[0].reservation_date,'2026-10-01')
assert.equal((await loadTrainingProgress('b',client)).ok,false)
const broken={...client,from(table){if(table==='workout_results')return {select(){return this},eq(){return this},order(){return this},range:async()=>({error:{message:'network'}})};return client.from(table)}}
const partial=await loadTrainingProgress('a',broken)
assert.equal(partial.sources.sessions.ok,false);assert.equal(partial.sources.attendance.ok,true)
assert.equal(partial.sources.sessions.data,undefined)

const attendancePages=[]
const historyRows=rows.map(row=>({...row,reservation_date:'2026-10-01',status:'attended'}))
const pagedClient={...client,rpc:async(name,args)=>{assert.equal(name,'get_my_training_attendance');attendancePages.push(args);return {data:historyRows.slice(args.page_offset,args.page_offset+args.page_size)}}}
const paged=await loadTrainingProgress('a',pagedClient)
assert.equal(paged.sources.attendance.data.length,251)
assert.deepEqual(attendancePages,[{page_offset:0,page_size:250},{page_offset:250,page_size:250}])
