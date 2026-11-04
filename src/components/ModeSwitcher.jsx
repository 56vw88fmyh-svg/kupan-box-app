import { Link, useLocation } from 'react-router-dom'
import { gymConfig } from '../config/gymConfig.js'
export function ModeSwitcher({currentUser}) {
  const {pathname}=useLocation()
  if (currentUser?.status !== 'active' || !['admin','coach'].includes(currentUser?.role)) return null
  const management=pathname==='/admin'||pathname==='/coach'
  return <nav aria-label="Modo de uso" className="flex flex-wrap gap-1 text-sm">
    <Link className={`inline-flex min-h-11 items-center rounded-lg px-3 py-2 font-semibold focus-visible:outline ${!management?'bg-white/10 text-white':'text-white/75'}`} to="/" aria-current={!management?'page':undefined}>Atleta</Link>
    <Link className={`inline-flex min-h-11 items-center rounded-lg px-3 py-2 font-semibold focus-visible:outline ${management?'bg-kupan-ember text-white':'text-white/75'}`} to={currentUser.role==='admin'?'/admin':'/coach'} aria-current={management?'page':undefined}>Gestión</Link>
    {currentUser.role==='admin' && gymConfig.features.coachManagement ? <Link className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-white/80" to="/coach">Coach</Link> : null}
  </nav>
}
