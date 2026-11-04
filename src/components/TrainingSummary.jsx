import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { loadTrainingAttendance } from '../services/trainingProgressService.js'
import { completedThisWeek } from '../utils/metricDefinitions.js'
import { getChileDateString } from '../utils/adminFormatters.js'
import { Button, Card } from './ui/index.js'

export function TrainingSummary({ currentUser, setActivePage }) {
  const [state,setState]=useState({loading:true,error:'',completed:0,goal:null})
  useEffect(()=>{
    let active=true
    if(!currentUser?.id || !supabase) return undefined
    setState({loading:true,error:'',completed:0,goal:null})
    Promise.all([loadTrainingAttendance(currentUser.id),supabase.from('athlete_preferences').select('weekly_goal').eq('profile_id',currentUser.id).maybeSingle()]).then(([attendance,prefs])=>{
      if(!active)return
      setState({loading:false,error:prefs.error ? 'No pudimos confirmar tu progreso semanal.' : '',completed:completedThisWeek(attendance,getChileDateString()),goal:prefs.data?.weekly_goal ?? null})
    }).catch(()=>{if(active)setState(s=>({...s,loading:false,error:'No pudimos confirmar tu progreso semanal.'}))})
    return()=>{active=false}
  },[currentUser?.id])
  if(!currentUser)return null
  return <Card className="p-4"><h2 className="text-xl font-bold text-white">Tu semana de entrenamiento</h2>
    <p className="mt-2 text-white/80" role="status">{state.loading?'Cargando tu progreso…':state.error || (state.goal ? `${state.completed}/${state.goal} sesiones confirmadas` : `${state.completed} sesiones confirmadas · sin meta definida`)}</p>
    <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={()=>setActivePage('prs')}>Ver mis marcas</Button><Button variant="tertiary" onClick={()=>setActivePage('profile')}>Meta y preferencias</Button></div>
  </Card>
}
