import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Button, Card, Input } from './ui/index.js'

const initial = { weekly_goal: null, community_alias: '', share_attendance: false, share_records: false, share_birthday: false }
export function AthletePreferences({ userId, onGoalChange }) {
  const [draft, setDraft] = useState(initial)
  const [loaded, setLoaded] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    setLoaded(false)
    setMessage('')
    onGoalChange(null)
    setDraft(initial)
    if (!userId || !supabase) return undefined
    supabase.from('athlete_preferences').select('weekly_goal,community_alias,share_attendance,share_records,share_birthday').eq('profile_id',userId).maybeSingle().then(({data,error}) => {
      if (!active) return
      if (error) { setMessage('No pudimos cargar tus preferencias. Intenta nuevamente al volver a abrir Perfil.'); return }
      const value = { ...initial,...data }
      setDraft(value); setLoaded(true); onGoalChange(value.weekly_goal)
    })
    return () => { active = false }
  }, [userId,onGoalChange,attempt])
  async function save(event) {
    event.preventDefault()
    if (busy || !loaded) return
    const goal = draft.weekly_goal === '' || draft.weekly_goal === null ? null : Number(draft.weekly_goal)
    if (goal !== null && (!Number.isInteger(goal) || goal < 1 || goal > 14)) { setMessage('Elige una meta entre 1 y 14 sesiones por semana.'); return }
    const alias = draft.community_alias.trim()
    if ((draft.share_attendance || draft.share_records || draft.share_birthday) && !alias) { setMessage('Elige el nombre o alias que quieres mostrar en Comunidad.'); return }
    setBusy(true)
    const {error} = await supabase.from('athlete_preferences').upsert({ ...draft, weekly_goal:goal,community_alias:alias,profile_id:userId },{onConflict:'profile_id'})
    setBusy(false)
    setMessage(error ? 'No pudimos guardar tus preferencias. Intenta nuevamente.' : 'Preferencias guardadas.')
    if (!error) onGoalChange(goal)
  }
  return <Card className="p-5">
    <h2 className="text-xl font-black text-white">Tu meta y privacidad</h2>
    <p className="mt-2 text-sm text-white/70">Tu participación en Comunidad es opcional y visible solo para miembros con sesión iniciada. Puedes desactivarla aquí.</p>
    <form className="mt-4 space-y-4" onSubmit={save}>
      <Input disabled={!loaded || busy} label="Meta de sesiones por semana" type="number" min="1" max="14" value={draft.weekly_goal ?? ''} helpText="Opcional. Cuenta asistencias confirmadas, no reservas." onChange={e=>setDraft({...draft,weekly_goal:e.target.value})} />
      <Input disabled={!loaded || busy} label="Nombre o alias en Comunidad" maxLength="40" value={draft.community_alias} onChange={e=>setDraft({...draft,community_alias:e.target.value})} />
      {[['share_attendance','Aparecer en el ranking de asistencia'],['share_records','Compartir mis marcas registradas'],['share_birthday','Compartir mi día y mes de cumpleaños']].map(([key,label])=><label key={key} className="flex min-h-11 items-center gap-3 text-sm text-white"><input className="h-5 w-5 shrink-0" style={{ appearance: 'auto', WebkitAppearance: 'auto' }} type="checkbox" disabled={!loaded || busy} checked={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.checked})}/>{label}</label>)}
      {message ? <p role="status" className="text-sm text-white/75">{message}</p> : null}
      {!loaded && message ? <Button type="button" variant="secondary" onClick={() => setAttempt(value => value + 1)}>Reintentar preferencias</Button> : null}
      <Button type="submit" disabled={!loaded || busy}>{busy ? 'Guardando…' : loaded ? 'Guardar preferencias' : 'Preferencias no disponibles'}</Button>
    </form>
  </Card>
}
