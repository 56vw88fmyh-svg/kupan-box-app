import { addCalendarDays, weekRange, renewalCandidates } from './metricDefinitions.js'
import { isUnlimitedSchedule } from './classSchedule.js'

export function periodRange(today,weeks=12){return {start:addCalendarDays(weekRange(today).start,-7*(weeks-1)),end:today}}
export function inPeriod(row,start,end){const day=String(row.record_date ?? row.reservation_date ?? row.reservationDate ?? '');return day>=start&&day<=end}
export function weeklyAttendance(rows,today,weeks=12){
 const {start,end}=periodRange(today,weeks)
 return Array.from({length:weeks},(_,index)=>{const date=addCalendarDays(start,index*7);const until=addCalendarDays(date,6);return {date,end:until>end?end:until,value:rows.filter(row=>row.status==='attended'&&inPeriod(row,date,until>end?end:until)).length}})
}
export function comparisonKey(context,unit=''){
 if(!context)return null
 const identity=context.benchmark_id?.trim() ? `benchmark:${context.benchmark_id.trim().toLowerCase()}` : `wod:${context.wod_id}`
 return JSON.stringify([identity,context.comparison_key ?? context.version,context.level,context.result_type,unit])
}
export function resultGroups(rows){
 const groups=new Map()
 rows.forEach(row=>{const key=comparisonKey(row.result_context,row.unit);if(!key)return;const group=groups.get(key)??{key,context:row.result_context,label:row.result_context.benchmark_id || row.movement?.replace(/^WOD:\s*/i,'') || 'Entrenamiento',rows:[]};group.rows.push(row);groups.set(key,group)})
 return [...groups.values()].map(group=>({...group,rows:group.rows.sort(sortByDate)}))
}
export function movementGroups(rows){
 const groups=new Map()
 rows.filter(row=>!/^WOD:/i.test(row.movement??'')).forEach(row=>{const key=JSON.stringify([String(row.movement).trim().toLowerCase(),row.unit,row.rounds!=null?'rounds':'scalar']);const group=groups.get(key)??{key,label:`${row.movement} · ${row.unit}`,rows:[]};group.rows.push(row);groups.set(key,group)})
 return [...groups.values()].map(group=>({...group,rows:group.rows.sort(sortByDate)}))
}
export function sortByDate(a,b){return String(a.record_date).localeCompare(String(b.record_date))||String(a.created_at??'').localeCompare(String(b.created_at??''))||String(a.id).localeCompare(String(b.id))}
export function bestResult(rows){return rows.reduce((best,row)=>{
 if(!best)return row
 if(row.unit==='tiempo')return Number(row.time_seconds??row.value)<Number(best.time_seconds??best.value)?row:best
 if(row.rounds!=null)return row.rounds>best.rounds||row.rounds===best.rounds&&Number(row.reps??0)>Number(best.reps??0)?row:best
 return Number(row.value)>Number(best.value)?row:best
},null)}
export function calendarDays(month,reservations,results){
 const start=`${month}-01`;const date=new Date(`${start}T12:00:00Z`);if(Number.isNaN(date.getTime()))return []
 const count=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate()
 return Array.from({length:count},(_,index)=>{const day=addCalendarDays(start,index);return {date:day,reservations:reservations.filter(row=>(row.reservation_date??row.reservationDate)===day),results:results.filter(row=>row.record_date===day)}})
}
export function scheduleDemand(schedule,reservations,today){
 return Array.from({length:7},(_,offset)=>{const date=addCalendarDays(today,offset);const weekday=new Date(`${date}T12:00:00Z`).getUTCDay()||7
  const classes=schedule.filter(row=>row.active&&Number(row.day_of_week)===weekday).map(row=>{const entries=reservations.filter(res=>res.class_schedule_id===row.id&&res.reservation_date===date&&['reserved','attended','no_show'].includes(res.status));const capacity=isUnlimitedSchedule(row)?null:Math.max(0,Number(row.max_spots)||0);return {...row,date,entries,occupied:entries.length,capacity}})
  const limited=classes.filter(row=>row.capacity!==null);const capacity=limited.reduce((n,row)=>n+row.capacity,0);const occupied=limited.reduce((n,row)=>n+row.occupied,0)
  return {date,classes,capacity,occupied,value:capacity?100*occupied/capacity:null,openAccess:classes.some(row=>row.capacity===null)}
 })
}
export function renewalSegments(profiles,memberships,today){
 const active=profiles.filter(row=>row.status==='active'&&!['admin','coach'].includes(row.role));const renewing=new Set(renewalCandidates(active,memberships,today).map(row=>row.id))
 const groups=[{label:'Con ciclo pagado vigente o programado',rows:[]},{label:'Por renovar',rows:[]},{label:'Sin ciclos registrados',rows:[]},{label:'Revisar pago o estado',rows:[]}]
 active.forEach(profile=>{const cycles=memberships.filter(row=>row.profile_id===profile.id);const covered=cycles.some(row=>row.status==='active'&&row.payment_status==='paid'&&(row.end_date??row.expires_at)>=today);groups[covered?0:renewing.has(profile.id)?1:cycles.length?3:2].rows.push(profile)})
 return groups.map(group=>({...group,value:group.rows.length}))
}
