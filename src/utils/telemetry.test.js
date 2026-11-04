/* global console */
import assert from 'node:assert/strict'
import {safeErrorEvent} from './telemetry.js'
import {validateTelemetry} from '../../api/telemetry.js'
const safe=safeErrorEvent('admin.students.create','error','23505')
assert.deepEqual(safe,{type:'error',scope:'admin.students.create',kind:'error',code:'23505'})
assert.equal(safeErrorEvent('email@example.com','random','Bearer secret').scope,'unknown')
assert.equal(safeErrorEvent('okay','error','Bearer secret').code,'UNKNOWN')
const event=validateTelemetry({...safe,release:'2.1.3',route:'/admin',email:'private@example.com',message:'secret'})
assert.ok(!JSON.stringify(event).includes('private'))
assert.ok(!JSON.stringify(event).includes('secret'))
assert.equal(validateTelemetry({...safe,release:'2.1.3',route:'/perfil?token=secret'}),null)
assert.equal(validateTelemetry({release:'2.1.3',route:'/',type:'metric',name:'LCP',value:-1}),null)
assert.equal(validateTelemetry({release:'2.1.3',route:'/',type:'metric',name:'CLS',value:0}).value,0)
console.log('Telemetry allowlist and sensitive data exclusion tests: OK')
