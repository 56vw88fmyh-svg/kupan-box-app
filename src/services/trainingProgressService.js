import { supabase } from '../lib/supabase.js'

async function readAll(client,table,profileId,columns,dateField='record_date'){
 const rows=[];const size=250
 for(let page=0;page<40;page++){
  const {data,error}=await client.from(table).select(columns).eq('profile_id',profileId).order(dateField,{ascending:false}).order('id',{ascending:false}).range(page*size,(page+1)*size-1)
  if(error)throw new Error(`No pudimos cargar ${table==='workout_results'?'las sesiones':table==='reservations'?'la asistencia':'las marcas'}.`)
  if(!Array.isArray(data))throw new Error('Respuesta de historial inválida.')
  rows.push(...data)
  if(data.length<size)return rows
 }
 throw new Error('El historial excede el límite de lectura. No mostramos un resumen parcial como completo.')
}
export async function loadTrainingAttendance(profileId,client=supabase){
 if(!client||!profileId)throw new Error('Inicia sesión para consultar la asistencia.')
 const auth=await client.auth.getUser()
 if(auth.error||auth.data?.user?.id!==profileId)throw new Error('Tu sesión venció. Inicia sesión nuevamente.')
 const rows=[]
 for(let page=0;page<40;page++){
  const {data,error}=await client.rpc('get_my_training_attendance',{page_offset:page*250,page_size:250})
  if(error||!Array.isArray(data))throw new Error('No pudimos cargar la asistencia.')
  rows.push(...data)
  if(data.length<250)return rows
 }
 throw new Error('El historial de asistencia excede el límite de lectura.')
}
export async function loadTrainingProgress(profileId,client=supabase){
 if(!client||!profileId)return {ok:false,message:'Inicia sesión para consultar tu entrenamiento.'}
 try {
  const {data,error}=await client.auth.getUser()
  if(error||data?.user?.id!==profileId)return {ok:false,message:'Tu sesión venció. Inicia sesión nuevamente.'}
  const results=await Promise.allSettled([
   loadTrainingAttendance(profileId,client),
   readAll(client,'workout_results',profileId,'id,profile_id,movement,value,unit,record_date,notes,rounds,reps,time_seconds,result_context,rpe,duration_minutes,created_at'),
   readAll(client,'personal_records',profileId,'id,movement,value,unit,record_date,notes,rounds,reps,time_seconds,created_at'),
   client.from('athlete_preferences').select('weekly_goal').eq('profile_id',profileId).maybeSingle().then(({data,error})=>{if(error)throw new Error('No pudimos cargar tu meta.');return data?.weekly_goal??null}),
  ])
  return {ok:true,sources:Object.fromEntries(['attendance','sessions','records','goal'].map((key,index)=>[key,results[index].status==='fulfilled'?{ok:true,data:results[index].value}:{ok:false,message:results[index].reason?.message??'No pudimos cargar este bloque.'}]))}
 }catch{return {ok:false,message:'No pudimos conectar con tu historial. Intenta nuevamente.'}}
}
