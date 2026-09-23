import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

export function RosterAccessControl() {
  const [expanded, setExpanded] = useState(false)
  const [links, setLinks] = useState([])
  const [label, setLabel] = useState('Consulta de alumnos')
  const [days, setDays] = useState(90)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [created, setCreated] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!expanded || !supabase) return undefined
    let cancelled = false
    supabase.rpc('admin_list_student_roster_links').then(({ data, error }) => {
      if (cancelled) return
      if (error) setMessage(error.code === 'PGRST202' ? 'Falta habilitar el panel de consulta en la base de datos. Revisa la guía de instalación.' : 'No se pudieron consultar los accesos. Intenta nuevamente.')
      else setLinks(data ?? [])
    })
    return () => { cancelled = true }
  }, [expanded, reload])

  async function createLink(event) {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setMessage('')
    setCreated(null)
    try {
      const { data, error } = await supabase.rpc('admin_create_student_roster_link', { link_label: label.trim(), valid_days: Number(days) })
      if (error || !data?.access_token) throw new Error('No se pudo crear el acceso. Comprueba tu sesión de administrador y que el panel esté habilitado.')
      setCreated({ id: data.id, url: `${window.location.origin}/nomina.html#acceso=${data.access_token}` })
      setReload((value) => value + 1)
    } catch (failure) { setMessage(failure.message) }
    finally { setBusy(false) }
  }

  async function revoke(id) {
    if (!supabase || busy) return
    setBusy(true)
    setMessage('')
    try {
      const { error } = await supabase.rpc('admin_revoke_student_roster_link', { link_id: id })
      if (error) throw new Error('No se pudo revocar el enlace. Intenta nuevamente.')
      if (created?.id === id) setCreated(null)
      setLinks((previous) => previous.filter((link) => link.id !== id))
      setMessage('Acceso revocado. El panel dejará de mostrar datos en su próxima consulta (hasta 30 segundos).')
    } catch (failure) { setMessage(failure.message) }
    finally { setBusy(false) }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(created.url)
      setMessage('Enlace copiado. Compártelo únicamente con personas autorizadas.')
    } catch { setMessage('Selecciona y copia el enlace que aparece arriba.') }
  }

  return <section className="rounded-xl border border-white/15 bg-white/[0.04] p-4 sm:p-5">
    <button className="text-left text-sm font-bold text-white" type="button" aria-expanded={expanded} aria-controls="roster-access-controls" onClick={() => setExpanded((value) => !value)}>Panel externo de consulta <span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
    <p className="mt-2 text-xs leading-5 text-white/65">Nómina sincronizada con semáforo, fechas y tokens. Solo lectura.</p>
    {expanded && <div id="roster-access-controls" className="mt-4 space-y-4">
      <p className="text-xs leading-5 text-white/65">Quien tenga el enlace podrá ver nombres, planes y tokens, sin editar. Puedes revocar cada acceso. El enlace completo se muestra una sola vez al crearlo.</p>
      <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={createLink}>
        <label className="text-xs text-white/75">Identificación del acceso<input required maxLength={100} value={label} onChange={(event) => setLabel(event.target.value)} className="mt-2 block w-full rounded-lg border border-white/20 bg-black px-3 py-2 text-white" /></label>
        <label className="text-xs text-white/75">Vigencia<select value={days} onChange={(event) => setDays(event.target.value)} className="mt-2 block w-full rounded-lg border border-white/20 bg-black px-3 py-2 text-white"><option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option></select></label>
        <button disabled={busy || !label.trim()} className="k-button self-end px-4 py-2 text-xs" type="submit">{busy ? 'Procesando…' : 'Crear enlace privado'}</button>
      </form>
      {created && <div className="rounded-lg border border-white/20 p-3"><label className="text-xs text-white/70">Enlace de solo lectura<input readOnly value={created.url} onFocus={(event) => event.target.select()} className="mt-2 block w-full rounded bg-black px-3 py-2 text-xs text-white" /></label><div className="mt-3 flex flex-wrap gap-3"><button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={copy}>Copiar enlace</button><a className="k-button-secondary px-3 py-2 text-xs" href={created.url} target="_blank" rel="noopener noreferrer">Abrir panel</a></div></div>}
      {message && <p className="text-xs leading-5 text-white/80" role="status">{message}</p>}
      <div className="space-y-2"><h3 className="text-xs font-bold uppercase text-white/60">Enlaces vigentes</h3>{links.length === 0 && <p className="text-xs text-white/60">No hay enlaces vigentes disponibles.</p>}{links.map((link) => <div key={link.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><div><p className="text-sm font-bold text-white">{link.label}</p><p className="mt-1 text-xs text-white/60">Vence {new Date(link.expires_at).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })}</p></div><button disabled={busy} type="button" onClick={() => revoke(link.id)} className="k-button-secondary px-3 py-2 text-xs">Revocar acceso</button></div>)}</div>
    </div>}
  </section>
}
