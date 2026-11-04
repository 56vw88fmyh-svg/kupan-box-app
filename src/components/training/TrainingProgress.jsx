import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorState, LoadingState } from '../ui/index.js'
import { BarChart, PointChart } from './ProgressCharts.jsx'
import { loadTrainingProgress } from '../../services/trainingProgressService.js'
import { periodRange, inPeriod, weeklyAttendance, movementGroups, resultGroups, bestResult, calendarDays, sortByDate } from '../../utils/trainingProgress.js'
import { formatRecordValue, formatCalendarDate, formatStatus } from '../../utils/displayFormats.js'
import { getChileDateString } from '../../utils/adminFormatters.js'

const scoreLabels={time:'Tiempo',rounds_reps:'Rondas y repeticiones',load:'Carga',distance:'Distancia',calories:'Calorías'}
const labelClass='block text-sm font-semibold text-white/85'
function Select({label,value,onChange,children}){return <label className={labelClass}>{label}<select aria-label={label} className="mt-2 min-h-11 w-full rounded-lg border border-kupan-border bg-kupan-black px-3 text-base text-white" value={value} onChange={e=>onChange(e.target.value)}>{children}</select></label>}
function Missing({source}){return !source?.ok?<p role="status" className="text-sm text-kupan-sand">{source?.message??'Información no disponible.'}</p>:null}
function ResultSeries({groups,kind,onSelect}){
 const [key,setKey]=useState('')
 const group=groups.find(item=>item.key===key)??groups[0]
 const best=bestResult(group?.rows??[])
 if(!group)return <p className="text-white/75">{kind==='benchmark'?'Todavía no hay benchmarks registrados con una referencia y prescripción comparables.':'Todavía no hay marcas registradas en este período.'}</p>
 return <div className="space-y-4"><Select label={kind==='benchmark'?'Benchmark, nivel y puntuación':'Movimiento y unidad'} value={group.key} onChange={setKey}>{groups.map((item,index)=><option key={item.key} value={item.key}>{item.label}{item.context?` · ${item.context.level} · ${scoreLabels[item.context.result_type]??item.context.result_type} · #${index+1}`:''}</option>)}</Select>
  <p className="text-xs text-white/75">{group.rows.length} {group.rows.length===1?'registro':'registros'} en este grupo.</p>
  {group.context?<p className="text-xs text-white/75">Grupo con igual prescripción y nivel. Cambios en la carga o versión se muestran por separado.</p>:null}
  {group.context?.comparison_key?<details className="text-sm text-white/80"><summary className="min-h-11 cursor-pointer py-2">Ver prescripción comparada</summary><Prescription context={group.context}/></details>:null}
  <p className="text-sm text-white/85">{group.rows.length>1?'Mejor resultado comparable':'Primera marca'}: <strong>{formatRecordValue(best)}</strong> · Último: <strong>{formatRecordValue(group.rows.at(-1))}</strong></p>
  <PointChart title={kind==='benchmark'?'Resultados del benchmark':'Evolución por movimiento'} rows={group.rows} unit={group.rows[0].rounds!=null?'rondas completas':group.rows[0].unit==='tiempo'?'segundos':group.rows[0].unit} valueOf={row=>Number(row.rounds??row.time_seconds??row.value)} formatValue={formatRecordValue} onSelect={onSelect}/>
  {group.rows[0].rounds!=null?<p className="text-xs text-white/75">La altura representa rondas completas. El detalle incluye las repeticiones adicionales; no se convierten a fracciones de ronda.</p>:null}
 </div>
}
function Prescription({context}){
 try { const [items,strength,timeCap]=JSON.parse(context.comparison_key);return <div className="space-y-2 whitespace-pre-wrap"><p>{Array.isArray(items)?items.join('\n'):String(items??'')}</p>{Array.isArray(strength)&&strength.length?<p>Fuerza: {strength.join('\n')}</p>:null}<p>Time cap: {timeCap || 'Sin definir'}</p></div> }catch{return <p>Prescripción histórica sin detalle.</p>}
}
export function TrainingProgress({currentUser,view='progress',revision=0}){
 const [state,setState]=useState({loading:true,sources:null,message:''})
 const [retry,setRetry]=useState(0)
 const [weeks,setWeeks]=useState(12)
 const [selected,setSelected]=useState(null)
 const [selectedWeek,setSelectedWeek]=useState(null)
 const [selectedDay,setSelectedDay]=useState(null)
 const today=getChileDateString()
 const [month,setMonth]=useState(today.slice(0,7))
 useEffect(()=>{
  let active=true
  setState({loading:true,sources:null,message:''})
  setSelected(null);setSelectedDay(null);setSelectedWeek(null)
  if(!currentUser?.id)return undefined
  loadTrainingProgress(currentUser.id).then(result=>{if(active)setState({loading:false,sources:result.sources??null,message:result.ok?'':result.message})})
  return()=>{active=false}
 },[currentUser?.id,retry,revision])
 const range=periodRange(today,weeks)
 const sources=state.sources??{}
 const allSessions=sources.sessions?.ok?sources.sessions.data:[]
 const attendance=sources.attendance?.ok?sources.attendance.data:[]
 const sessions=allSessions.filter(row=>inPeriod(row,range.start,range.end))
 const records=sources.records?.ok?sources.records.data.filter(row=>inPeriod(row,range.start,range.end)):[]
 const movements=movementGroups(records)
 const benchmarks=resultGroups(sessions).filter(group=>group.context.benchmark_id)
 const weekRows=sources.attendance?.ok?weeklyAttendance(attendance,today,weeks):[]
 const days=calendarDays(month,attendance,allSessions)
 const firstDay=days.length?(new Date(`${days[0].date}T12:00:00Z`).getUTCDay()+6)%7:0
 if(!currentUser)return <Card className="p-5"><p className="text-white/80">Inicia sesión para consultar tu historial y progreso personal.</p></Card>
 if(state.loading)return <LoadingState label="Cargando tu entrenamiento"/>
 if(state.message)return <ErrorState description={state.message} onAction={()=>setRetry(n=>n+1)}/>
 return <div className="space-y-5">
  <div className="flex flex-wrap items-end justify-between gap-3"><Select label="Período" value={weeks} onChange={value=>{setWeeks(Number(value));setSelectedWeek(null)}}>{[4,12,24].map(n=><option key={n} value={n}>Últimas {n} semanas</option>)}</Select><Button variant="secondary" size="sm" onClick={()=>setRetry(n=>n+1)}>Actualizar progreso</Button></div>
  <p className="text-xs text-white/75">{formatCalendarDate(range.start)}–{formatCalendarDate(range.end)} · Tus registros personales. Una marca no acredita asistencia.</p>
  {view==='history'?<Card className="p-4"><h2 className="text-xl font-bold text-white">Historial de resultados</h2><Missing source={sources.sessions}/>{sources.sessions?.ok&&(!sessions.length?<p className="mt-3 text-white/75">Aún no hay resultados en este período.</p>:<ul className="mt-3 divide-y divide-white/10">{[...sessions].sort((a,b)=>sortByDate(b,a)).map(row=><li key={row.id}><button className="min-h-14 w-full py-3 text-left text-white/85" onClick={()=>setSelected(row)}><span className="block font-semibold">{row.movement?.replace(/^WOD:\s*/i,'')} · {formatRecordValue(row)}</span><span className="text-sm">{formatCalendarDate(row.record_date)} · {row.result_context?.level??'Nivel sin registrar'}</span></button></li>)}</ul>)}</Card>:<>
  <Card className="p-4"><h2 className="mb-3 text-xl font-bold text-white">Constancia semanal</h2><Missing source={sources.attendance}/><Missing source={sources.goal}/>{sources.attendance?.ok?<BarChart title="Asistencias confirmadas por semana" rows={weekRows} goal={sources.goal?.ok?sources.goal.data:null} onSelect={setSelectedWeek}/>:null}<p className="mt-3 text-xs text-white/75">Cero significa que no hay asistencias registradas; no prueba que no hayas entrenado. Reservas y ausencias no suman.</p>
   {selectedWeek?<div className="mt-3 rounded-lg bg-white/5 p-3 text-sm text-white/80"><strong>Semana del {formatCalendarDate(selectedWeek.date)}</strong><ul>{attendance.filter(row=>row.status==='attended'&&inPeriod(row,selectedWeek.date,selectedWeek.end)).map((row,index)=><li key={row.id??index}>{formatCalendarDate(row.reservation_date)} · {row.class_schedule?.class_name??'Asistencia confirmada'} {row.class_schedule?.time?.slice(0,5)}</li>)}</ul>{!selectedWeek.value?'Sin asistencias registradas.':null}</div>:null}
  </Card>
  <Card className="p-4"><h2 className="mb-3 text-xl font-bold text-white">Evolución de marcas</h2><Missing source={sources.records}/>{sources.records?.ok?<ResultSeries groups={movements} kind="movement" onSelect={setSelected}/>:null}</Card>
  <Card className="p-4"><h2 className="mb-3 text-xl font-bold text-white">Benchmarks comparables</h2><Missing source={sources.sessions}/>{sources.sessions?.ok?<ResultSeries groups={benchmarks} kind="benchmark" onSelect={setSelected}/>:null}</Card>
  <Card className="space-y-4 p-4"><h2 className="text-xl font-bold text-white">Esfuerzo y duración</h2><Missing source={sources.sessions}/>{sources.sessions?.ok?<><PointChart title="Esfuerzo percibido" maxValue={10} rows={[...sessions].sort((a,b)=>a.record_date.localeCompare(b.record_date)).filter(row=>row.rpe!=null)} valueOf={row=>Number(row.rpe)} unit="RPE 1–10" formatValue={row=>`${row.rpe}/10`} onSelect={setSelected}/><PointChart title="Duración registrada" rows={[...sessions].sort((a,b)=>a.record_date.localeCompare(b.record_date)).filter(row=>row.duration_minutes!=null)} valueOf={row=>Number(row.duration_minutes)} unit="minutos" formatValue={row=>`${row.duration_minutes} min`} onSelect={setSelected}/></>:null}<p className="text-xs text-white/75">Registra cómo sentiste la sesión y cuánto tiempo entrenaste. Ambos datos son opcionales.</p></Card>
  </>}
  <Card className="p-4"><h2 className="mb-3 text-xl font-bold text-white">Calendario de sesiones</h2><label className={labelClass}>Mes<input type="month" className="mt-2 block min-h-11 rounded-lg border border-kupan-border bg-kupan-black px-3 text-white" value={month} onChange={e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)){setMonth(e.target.value);setSelectedDay(null)}}}/></label>
   <Missing source={sources.attendance}/><Missing source={sources.sessions}/><p className="my-3 text-xs text-white/75">A: asistencia · R: reserva · W: resultado WOD · F: ausencia · C: cancelación. Cada resultado es un intento; no se suma como una asistencia. El mes se elige de forma independiente al filtro de semanas.</p>
   <div className="grid grid-cols-7 gap-1">{['L','M','X','J','V','S','D'].map((day,index)=><span key={index} aria-hidden="true" className="py-2 text-center text-xs text-white/80">{day}</span>)}{Array.from({length:firstDay},(_,index)=><span key={`blank-${index}`}/>)}{days.map(day=>{const attended=day.reservations.some(r=>r.status==='attended'),reserved=day.reservations.some(r=>r.status==='reserved'),absent=day.reservations.some(r=>r.status==='no_show'),cancelled=day.reservations.some(r=>r.status==='cancelled');const label=[attended?'asistencia':null,reserved?'reserva':null,absent?'ausencia':null,cancelled?'cancelación':null,day.results.length?`${day.results.length} resultados`:null].filter(Boolean).join(', ');return <button key={day.date} type="button" aria-label={`${formatCalendarDate(day.date)} · ${label||'sin registros disponibles'}`} onClick={()=>setSelectedDay(day)} className={`min-h-16 min-w-0 rounded-lg border p-1 text-center text-white ${attended?'border-kupan-sand bg-white/10':'border-white/15'}`}><span className="block text-sm">{Number(day.date.slice(-2))}</span><span className="block break-words text-[0.65rem]">{attended?'A ':''}{reserved?'R ':''}{day.results.length?'W ':''}{absent?'F ':''}{cancelled?'C':''}</span></button>})}</div>
   {selectedDay?<div className="mt-4 text-sm text-white/85"><h3 className="font-semibold">{formatCalendarDate(selectedDay.date)}</h3><ul>{selectedDay.reservations.map((row,index)=><li key={row.id??index}>{formatStatus(row.status)} · {row.class_schedule?.class_name??'Clase'}</li>)}{selectedDay.results.map(row=><li key={row.id}><button type="button" className="min-h-11 underline" onClick={()=>setSelected(row)}>{row.movement} · {formatRecordValue(row)}</button></li>)}</ul>{!selectedDay.reservations.length&&!selectedDay.results.length?<p>Sin registros disponibles para este día.</p>:null}</div>:null}
  </Card>
  <Dialog isOpen={Boolean(selected)} onClose={()=>setSelected(null)} title="Detalle del registro" description={selected?`${selected.movement} · ${formatCalendarDate(selected.record_date)}`:''}>{selected?<div className="space-y-2 text-white/85"><p className="text-2xl font-bold">{formatRecordValue(selected)}</p><p>{selected.result_context?.level??'Marca personal'}</p>{selected.result_context?.benchmark_id?<p>Benchmark: {selected.result_context.benchmark_id}</p>:null}{selected.rpe!=null?<p>Esfuerzo: {selected.rpe}/10</p>:null}{selected.duration_minutes!=null?<p>Duración: {selected.duration_minutes} minutos</p>:null}{selected.notes?<p className="whitespace-pre-wrap">{selected.notes}</p>:null}</div>:null}</Dialog>
 </div>
}
