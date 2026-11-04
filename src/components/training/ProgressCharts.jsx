import { useId } from 'react'
import { formatCalendarDate } from '../../utils/displayFormats.js'

export function BarChart({title,rows,unit='sesiones',goal=null,domainMax=1,onSelect}){
 const max=Math.max(domainMax,Number(goal)||0,...rows.map(row=>Number(row.value)||0))
 return <figure aria-label={title}>
  <figcaption className="mb-3 text-sm text-white/75">{title}</figcaption>
  <div className="space-y-2">{rows.map((row,index)=><button key={row.date??row.label??index} type="button" onClick={()=>onSelect?.(row)} className="flex min-h-11 w-full flex-wrap items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-white/5 focus-visible:outline focus-visible:outline-kupan-sand">
   <span className="w-28 shrink-0 text-white/80">{row.label??formatCalendarDate(row.date)}</span>
   <span className="relative h-5 min-w-16 flex-1 rounded bg-white/10" aria-hidden="true"><span className="absolute inset-y-0 left-0 rounded bg-kupan-sand" style={{width:`${100*(Number(row.value)||0)/max}%`}}/>{goal? <span className="absolute inset-y-0 w-0.5 bg-white" style={{left:`${100*goal/max}%`}}/>:null}</span>
   <span className="w-24 text-right font-semibold text-white">{row.value==null?(row.valueLabel??'Sin datos'):`${Number(row.value).toLocaleString('es-CL',{maximumFractionDigits:1})} ${Number(row.value)===1?({sesiones:'sesión',alumnos:'alumno'}[unit]??unit):unit}`}</span>
  </button>)}</div>
  {goal?<p className="mt-2 text-xs text-white/75">Marca blanca: meta actual de {goal} sesiones. No reconstruye metas anteriores.</p>:null}
 </figure>
}
export function PointChart({title,rows,valueOf=row=>Number(row.value),unit,formatValue,onSelect,maxValue=1}){
 const id=useId()
 const values=rows.filter(row=>Number.isFinite(valueOf(row)))
 if(!values.length)return <p className="text-sm text-white/70">Todavía no hay registros para este gráfico.</p>
 const minDate=Math.min(...values.map(row=>Date.parse(`${row.record_date}T12:00:00Z`)))
 const maxDate=Math.max(...values.map(row=>Date.parse(`${row.record_date}T12:00:00Z`)))
 const ymax=Math.max(maxValue,...values.map(valueOf))
 const x=row=>48+(Date.parse(`${row.record_date}T12:00:00Z`)-minDate)/(maxDate-minDate||1)*270
 const y=row=>170-valueOf(row)/ymax*135
 return <figure aria-labelledby={id}>
  <figcaption id={id} className="mb-2 text-sm text-white/75">{title} · {unit}</figcaption>
  <svg viewBox="0 0 360 215" className="h-auto w-full max-w-xl" role="group" aria-label={title}>
   {[0,0.5,1].map(t=><g key={t}><line x1="48" x2="325" y1={170-t*135} y2={170-t*135} stroke="#68706D"/><text x="40" y={174-t*135} textAnchor="end" fill="#BDC3C3" fontSize="12">{(ymax*t).toLocaleString('es-CL',{maximumFractionDigits:1})}</text></g>)}
   {values.map((row,index)=><circle key={row.id??index} cx={x(row)} cy={y(row)} r="6" fill="#D9CAB3" stroke="#0E1011" strokeWidth="2" tabIndex="0" role="button" aria-label={`${formatCalendarDate(row.record_date)} · ${formatValue(row)}`} onClick={()=>onSelect(row)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(row)}}}><title>{formatCalendarDate(row.record_date)} · {formatValue(row)}</title></circle>)}
   <text x="48" y="202" fill="#BDC3C3" fontSize="12">{formatCalendarDate(values[0].record_date)}</text><text x="325" y="202" textAnchor="end" fill="#BDC3C3" fontSize="12">{values.length>1?formatCalendarDate(values.at(-1).record_date):''}</text>
  </svg>
  <p className="text-xs text-white/75">{values.length===1?'Un registro: todavía no hay una tendencia.':'Cada punto es un registro; no se interpolan días sin datos.'} Abre un punto o consulta la tabla.</p>
  <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm text-white">Ver datos en tabla</summary><div className="overflow-x-auto"><table className="w-full text-left text-sm text-white/85"><caption className="sr-only">{title}</caption><thead><tr><th scope="col" className="p-2">Fecha</th><th scope="col" className="p-2">Resultado</th><th scope="col" className="p-2">Detalle</th></tr></thead><tbody>{values.map((row,index)=><tr key={row.id??index}><td className="p-2">{formatCalendarDate(row.record_date)}</td><td className="p-2">{formatValue(row)}</td><td className="p-2"><button type="button" className="min-h-11 underline" onClick={()=>onSelect(row)}>Abrir registro</button></td></tr>)}</tbody></table></div></details>
 </figure>
}
