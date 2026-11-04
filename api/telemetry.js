/* global console, Buffer, URL */
const routes = new Set(['/', '/login', '/perfil', '/reservas', '/admin', '/coach', '/wod', '/comunidad', '/planes', '/ranking', '/pr', '/other'])
const limits = new Map()
export function validateTelemetry(body) {
  if (!body || !/^\d+\.\d+\.\d+$/.test(body.release ?? '') || !routes.has(body.route)) return null
  const common={release:body.release,route:body.route}
  if(body.type==='metric' && ['LCP','CLS'].includes(body.name) && typeof body.value==='number' && Number.isFinite(body.value) && body.value>=0 && body.value <= (body.name==='CLS'?100:3600000)) return {...common,type:'metric',name:body.name,value:body.value}
  if(body.type==='error' && /^[a-z_][a-z0-9_.]{0,79}$/i.test(body.scope ?? '') && ['offline','session','permission','deleted','error'].includes(body.kind) && /^[A-Z0-9]{3,12}$/.test(body.code ?? '')) return {...common,type:'error',scope:body.scope,kind:body.kind,code:body.code}
  return null
}
export default function handler(req,res) {
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='POST')return res.status(405).end()
  try {
    if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host)return res.status(403).end()
    if(Number(req.headers['content-length'] ?? 0)>2048)return res.status(413).end()
    const serialized=typeof req.body==='string'?req.body:JSON.stringify(req.body)
    if(!serialized || Buffer.byteLength(serialized)>2048)return res.status(413).end()
    const event=validateTelemetry(JSON.parse(serialized))
    if(!event)return res.status(400).end()
    const key=String(req.headers['x-forwarded-for'] ?? 'unknown').split(',')[0]
    const now=Date.now(); const bucket=limits.get(key)
    if(bucket && now-bucket.started<60000 && bucket.count>=30)return res.status(429).end()
    if(!bucket||now-bucket.started>=60000)limits.set(key,{started:now,count:1})
    else bucket.count++
    if(limits.size>5000)limits.clear()
    console.info('KUPAN_TELEMETRY',JSON.stringify(event))
    return res.status(204).end()
  } catch {return res.status(400).end()}
}
