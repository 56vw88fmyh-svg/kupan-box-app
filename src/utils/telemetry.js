/* global Blob, PerformanceObserver */
export const APP_RELEASE = '2.2.4'
const routes = new Set(['/', '/login', '/perfil', '/reservas', '/admin', '/coach', '/wod', '/comunidad', '/planes', '/ranking', '/pr'])
export function safeErrorEvent(scope, kind, code) {
  return { type: 'error', scope: /^[a-z_][a-z0-9_.]{0,79}$/i.test(scope) ? scope : 'unknown',
    kind: ['offline','session','permission','deleted','error'].includes(kind) ? kind : 'error',
    code: /^[A-Z0-9]{3,12}$/.test(String(code ?? '')) ? String(code) : 'UNKNOWN' }
}
let reports = 0
export function reportTelemetry(event) {
  if (typeof window === 'undefined' || reports >= 15 || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return
  reports++
  const payload = JSON.stringify({...event, release:APP_RELEASE, route:routes.has(window.location.pathname) ? window.location.pathname : '/other'})
  // Same-origin only. No queries, emails, stack traces, user IDs or error text.
  try { navigator.sendBeacon?.('/api/telemetry',new Blob([payload],{type:'application/json'})) } catch { /* telemetry never breaks the app */ }
}
export function initTelemetry() {
  if (typeof window === 'undefined') return
  window.addEventListener('error',()=>reportTelemetry(safeErrorEvent('window.error','error','UNKNOWN')))
  window.addEventListener('unhandledrejection',()=>reportTelemetry(safeErrorEvent('window.unhandledrejection','error','UNKNOWN')))
  if (typeof PerformanceObserver === 'undefined') return
  let lcp = 0, cls = 0, session = 0, first = 0, last = 0
  const observers = []
  const observe = (type, callback) => {
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return
    const observer = new PerformanceObserver((list)=>callback(list.getEntries()))
    observer.observe({type,buffered:true}); observers.push(observer)
  }
  observe('largest-contentful-paint',(entries)=>{ lcp=entries.at(-1)?.startTime ?? lcp })
  observe('layout-shift',(entries)=>entries.forEach((entry)=>{
    if(entry.hadRecentInput)return
    if (entry.startTime-last<1000 && entry.startTime-first<5000) session+=entry.value
    else {session=entry.value; first=entry.startTime}
    last=entry.startTime; cls=Math.max(cls,session)
  }))
  let flushed = false
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='hidden'||flushed)return
    flushed=true
    if(lcp)reportTelemetry({type:'metric',name:'LCP',value:Math.round(lcp)})
    reportTelemetry({type:'metric',name:'CLS',value:Number(cls.toFixed(4))})
    observers.forEach((observer)=>observer.disconnect())
  })
}
