import { useEffect, useMemo, useState } from 'react'
import { fetchRoster, readRosterToken } from './rosterApi.js'
import { formatRosterDate, ROSTER_STATES, selectRosterStudents } from './rosterModel.js'

function Signal({ signal }) {
  return <div className={`roster-signal ${signal.color}`}><span className="roster-badge"><i aria-hidden="true" />{signal.label}</span><span className="roster-reason">{signal.reasons.join(' · ')}</span></div>
}

export function RosterPanel() {
  const [token, setToken] = useState(() => readRosterToken(window.location.hash))
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    function updateToken() {
      setSnapshot(null)
      setError('')
      setToken(readRosterToken(window.location.hash))
    }
    window.addEventListener('hashchange', updateToken)
    return () => window.removeEventListener('hashchange', updateToken)
  }, [])

  useEffect(() => {
    if (!token) return undefined
    let disposed = false
    let controller = null
    let timeout = null
    let busy = false
    async function refresh() {
      if (busy || document.visibilityState === 'hidden') return
      busy = true
      controller = new window.AbortController()
      const requestController = controller
      setLoading(true)
      timeout = window.setTimeout(() => requestController.abort(), 15000)
      try {
        const result = await fetchRoster(token, { signal: requestController.signal })
        if (!disposed && document.visibilityState !== 'hidden') {
          setSnapshot({ ...result, token })
          setError('')
        }
      } catch (failure) {
        if (!disposed) {
          // Clear names and balances on every failure, including revoked access.
          setSnapshot(null)
          setError(failure.name === 'AbortError' ? 'La conexión tardó demasiado. Intenta actualizar nuevamente.' : failure.message)
        }
      } finally {
        window.clearTimeout(timeout)
        busy = false
        if (!disposed) setLoading(false)
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') setSnapshot(null)
      else refresh()
    }
    refresh()
    const interval = window.setInterval(refresh, 30000)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', refresh)
    return () => {
      disposed = true
      controller?.abort()
      window.clearTimeout(timeout)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', refresh)
    }
  }, [token, attempt])

  const current = snapshot?.token === token ? snapshot : null
  const all = useMemo(() => selectRosterStudents(current?.students ?? [], current?.today), [current])
  const visible = useMemo(() => selectRosterStudents(current?.students ?? [], current?.today, query, filter), [current, query, filter])
  const updatedAt = current ? new Date(current.generated_at).toLocaleString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

  return (
    <div className="roster-page">
      <header className="roster-header"><a href="/nomina.html" aria-label="KUPAN · Inicio del panel" className="roster-brand">KUPAN<span>BOX / ALUMNOS</span></a><span className="roster-readonly">Acceso privado · Solo lectura</span></header>
      <main>
        <section className="roster-heading"><div><p className="roster-eyebrow">SEGUIMIENTO DE MEMBRESÍAS</p><h1>Tu comunidad,<br /><span>al día.</span></h1><p>Alumnos activos, vigencia de planes y tokens disponibles.</p></div><div className="roster-sync" aria-live="polite"><span className={current ? 'roster-online' : ''}>{loading ? 'Consultando KUPAN…' : current ? 'Conectado a KUPAN' : 'Sin datos actualizados'}</span>{current && <small>Actualizado {updatedAt} · Chile</small>}<small>Actualización automática cada 30 segundos</small>{token && <button className="roster-button" type="button" disabled={loading} onClick={() => setAttempt((value) => value + 1)}>Actualizar ahora</button>}</div></section>

        {!token ? <section className="roster-message"><h2>Necesitas un enlace privado</h2><p>Abre el enlace completo que te entregó el administrador de KUPAN. Este panel permite consultar la nómina, sin modificarla.</p></section> : error ? <section className="roster-message roster-error" role="alert"><h2>No se pudo mostrar la nómina</h2><p>{error}</p><p>No mostramos datos anteriores para evitar confusiones.</p></section> : !current ? <section className="roster-message" role="status">Cargando la nómina de alumnos…</section> : <>
          <section className="roster-summary" aria-label="Resumen y filtros por estado">{ROSTER_STATES.map((state) => <button type="button" key={state.id} className={`roster-stat ${state.id} ${filter === state.id ? 'selected' : ''}`} aria-pressed={filter === state.id} onClick={() => setFilter(state.id)}><span>{state.label}</span><strong>{state.id === 'all' ? all.length : all.filter((student) => student.signal.color === state.id).length}</strong><span className="roster-stat-link">{filter === state.id ? 'Mostrando' : 'Ver alumnos'} <span aria-hidden="true">↗</span></span></button>)}</section>
          <section className="roster-list" aria-label="Nómina de alumnos">
            <div className="roster-toolbar"><div><h2>Nómina de alumnos</h2><p>{visible.length} de {all.length} alumnos activos</p></div><label className="roster-search"><span>Buscar alumno</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre del alumno…" /></label></div>
            <div className="roster-table-wrap"><table><caption className="roster-sr-only">Nómina de alumnos activos. Los planes que necesitan atención aparecen primero.</caption><thead><tr><th scope="col">Alumno / plan</th><th scope="col">Inicio</th><th scope="col">Término</th><th scope="col">Tokens restantes</th><th scope="col">Estado del plan</th></tr></thead><tbody>{visible.map((student) => <tr key={student.student_id}><th scope="row" data-label="Alumno / plan"><span className="roster-name">{student.full_name}</span><span className="roster-plan">{student.plan_name || 'Sin plan registrado'}</span></th><td data-label="Inicio">{formatRosterDate(student.start_date)}</td><td data-label="Término">{formatRosterDate(student.effective_end_date)}{student.effective_end_date && student.effective_end_date !== student.end_date && <small className="roster-plan">Vencimiento efectivo</small>}</td><td data-label="Tokens restantes"><strong className="roster-token">{!student.membership_id ? '—' : student.is_unlimited ? 'Ilimitado' : student.remaining_tokens ?? '—'}</strong>{student.membership_id && !student.is_unlimited && <span className="roster-plan">de {student.total_tokens ?? '—'} tokens</span>}</td><td data-label="Estado del plan"><Signal signal={student.signal} /></td></tr>)}</tbody></table></div>
            {visible.length === 0 && <div className="roster-empty"><h3>{all.length === 0 ? 'Todavía no hay alumnos activos' : 'Sin coincidencias'}</h3><p>{all.length === 0 ? 'Aparecerán aquí cuando se registren como activos en KUPAN.' : 'Prueba con otro nombre o selecciona otro estado.'}</p>{all.length > 0 && <button className="roster-button" type="button" onClick={() => { setQuery(''); setFilter('all') }}>Ver todos los alumnos</button>}</div>}
          </section>
          <section className="roster-legend" aria-label="Cómo leer el semáforo"><h2>Cómo leer el semáforo</h2><p><b className="green">● Al día</b> Más de 7 días y más de 2 tokens.</p><p><b className="yellow">● Atención</b> Quedan hasta 7 días o 1–2 tokens.</p><p><b className="red">● Renovación</b> Plan vencido o sin tokens.</p><p><b className="gray">● Sin plan vigente</b> Sin plan, pausado, pendiente o aún no comienza.</p><small>Los planes ilimitados se evalúan por fecha. Se muestran alumnos activos, aunque su plan haya vencido. El último día del plan está incluido.</small></section>
        </>}
      </main><footer className="roster-footer"><span>KUPAN · Comunidad, esfuerzo y progreso.</span><span>Consulta de información · Sin permisos de edición</span></footer>
    </div>
  )
}
