import { useState } from 'react'
import { Card, LoadingState } from '../ui/index.js'
import { BarChart } from '../training/ProgressCharts.jsx'
import { scheduleDemand, renewalSegments } from '../../utils/trainingProgress.js'
import { getChileDateString } from '../../utils/adminFormatters.js'
import { formatCalendarDate } from '../../utils/displayFormats.js'

export function ManagementInsights({data,errors=[],loading=false}){
 const [day,setDay]=useState(null)
 const [segment,setSegment]=useState(null)
 if(loading)return <LoadingState label="Cargando gráficos de Gestión"/>
 const unavailable=key=>loading||errors.some(error=>error.key===key||error.key==='configuration')
 const today=getChileDateString()
 const demand=unavailable('schedule')||unavailable('reservations')?null:scheduleDemand(data.schedule??[],data.reservations??[],today)
 const renewals=unavailable('profiles')||unavailable('memberships')?null:renewalSegments(data.profiles??[],data.memberships??[],today)
 const shownDay=day?demand?.find(row=>row.date===day):null
 const shownSegment=segment?renewals?.find(row=>row.label===segment):null
 return <section className="space-y-4" aria-label="Gráficos de Gestión">
  <Card className="p-4"><h2 className="mb-2 text-xl font-bold text-white">Demanda por horario</h2><p className="mb-3 text-sm text-white/75">Reservas y cupos publicados para los próximos siete días. Las clases de acceso ilimitado se muestran por separado.</p>
   {demand?<><BarChart title="Ocupación de clases con capacidad limitada" rows={demand.map(row=>({...row,value:row.value,valueLabel:!row.classes.length?'Sin clases':row.openAccess&&!row.capacity?'Acceso abierto':'Sin capacidad',label:formatCalendarDate(row.date)}))} unit="%" domainMax={100} onSelect={row=>setDay(row.date)}/>
    <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm text-white/85"><caption className="mb-2 text-left">Día y horario: reservas / capacidad</caption><thead><tr><th className="p-2" scope="col">Día</th><th className="p-2" scope="col">Horario</th><th className="p-2" scope="col">Ocupación</th></tr></thead><tbody>{demand.flatMap(row=>row.classes).map(row=><tr key={`${row.date}-${row.id}`}><td className="p-2">{formatCalendarDate(row.date)}</td><td className="p-2">{row.time?.slice(0,5)} · {row.class_name}</td><td className="p-2"><button type="button" onClick={()=>setDay(row.date)} className="min-h-11 underline">{row.occupied} / {row.capacity===null?'acceso abierto':row.capacity}</button></td></tr>)}</tbody></table></div>
   </>:<p role="status" className="text-white/75">No pudimos confirmar horarios o reservas. Actualiza los datos del panel.</p>}
   {shownDay?<div className="mt-3 text-sm text-white/85"><h3>{formatCalendarDate(shownDay.date)}</h3>{shownDay.classes.map(row=><div key={row.id} className="mt-2"><strong>{row.time?.slice(0,5)} · {row.class_name}</strong><ul>{row.entries.map((entry,index)=><li key={entry.id??index}>{entry.profile?.full_name??'Alumno'} · reserva ocupada</li>)}</ul>{!row.entries.length?<p>Sin reservas registradas.</p>:null}</div>)}{!shownDay.classes.length?<p>No hay horarios publicados para este día.</p>:null}</div>:null}
  </Card>
  <Card className="p-4"><h2 className="mb-2 text-xl font-bold text-white">Ciclos actuales de alumnos</h2><p className="mb-3 text-sm text-white/75">Cada alumno activo se cuenta una vez. Los ciclos históricos no se suman como renovaciones pendientes.</p>
   {renewals?<BarChart title="Estado de renovación" rows={renewals} unit="alumnos" onSelect={row=>setSegment(row.label)}/>:<p role="status" className="text-white/75">No pudimos confirmar alumnos o membresías.</p>}
   {shownSegment?<div className="mt-3 text-sm text-white/85"><h3>{shownSegment.label}</h3><ul>{shownSegment.rows.map(row=><li key={row.id}>{row.full_name??'Alumno'}</li>)}</ul>{!shownSegment.rows.length?<p>No hay alumnos en este grupo.</p>:null}</div>:null}
  </Card>
 </section>
}
