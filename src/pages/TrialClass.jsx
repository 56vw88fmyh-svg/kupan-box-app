import { useEffect, useState } from 'react'
import { Button, Card, ErrorState, Input, LoadingState } from '../components/ui/index.js'
import { loadTrialSchedules, submitTrialRequest } from '../utils/trialRequests.js'
import { gymConfig } from '../config/gymConfig.js'

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const initialForm = {
  fullName: '', email: '', phone: '', primaryGoal: '', previousExperience: '',
  scheduleId: '', desiredDate: '', physicalLimitations: '', privacyAccepted: false,
}

export function TrialClass({ setActivePage }) {
  const [form, setForm] = useState(initialForm)
  const [schedules, setSchedules] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let mounted = true
    loadTrialSchedules().then((result) => {
      if (!mounted) return
      setSchedules(result.schedules)
      setMessage(result.ok ? '' : result.message)
      setIsLoading(false)
    })
    return () => { mounted = false }
  }, [])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.fullName.trim() || !form.phone.trim() || !form.primaryGoal.trim()) {
      setMessage('Completa nombre, contacto y objetivo principal.')
      return
    }
    if (!form.privacyAccepted) {
      setMessage('Debes aceptar las políticas y privacidad para continuar.')
      return
    }
    setIsSaving(true)
    const result = await submitTrialRequest(form)
    setIsSaving(false)
    setMessage(result.message)
    setSuccess(result.ok)
    if (result.ok) setForm(initialForm)
  }

  if (success) {
    return (
      <Card as="section" variant="elevated" className="p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-sand">Primera clase {gymConfig.identity.name}</p>
        <h1 className="k-display mt-3 text-5xl font-black uppercase leading-none text-white">Solicitud recibida</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-text-secondary">{message}</p>
        <Button className="mt-6" onClick={() => setActivePage('home')}>Volver al inicio</Button>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-24">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-sand">Tu primera experiencia</p>
        <h1 className="k-display mt-2 text-5xl font-black uppercase leading-none text-white">Conoce {gymConfig.identity.name}</h1>
        <p className="mt-3 text-base leading-7 text-text-secondary">La primera clase es gratuita una vez por persona. No necesitas saber tu nivel: te acompañamos desde el comienzo.</p>
      </header>

      {isLoading ? <LoadingState title="Cargando horarios" /> : null}
      {message && !isLoading ? <ErrorState title="Revisa tu solicitud" description={message} /> : null}

      <Card as="form" className="space-y-4 p-5" onSubmit={handleSubmit}>
        <Input label="Nombre completo" required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Teléfono" type="tel" required value={form.phone} onChange={(event) => update('phone', event.target.value)} />
          <Input label="Correo" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} />
        </div>
        <Input label="Objetivo principal" required value={form.primaryGoal} placeholder="Ej. sentirme más fuerte" onChange={(event) => update('primaryGoal', event.target.value)} />
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Experiencia previa</span>
          <textarea className="mt-2 min-h-24 w-full rounded-xl border border-kupan-border bg-kupan-black/45 px-4 py-3 text-base text-white outline-none focus:border-kupan-sand" value={form.previousExperience} onChange={(event) => update('previousExperience', event.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Clase preferida</span>
            <select className="mt-2 min-h-12 w-full rounded-xl border border-kupan-border bg-kupan-black/45 px-4 py-3 text-base text-white outline-none focus:border-kupan-sand" value={form.scheduleId} onChange={(event) => update('scheduleId', event.target.value)}>
              <option value="">Por coordinar</option>
              {schedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{days[schedule.day_of_week]} · {schedule.time?.slice(0, 5)}</option>)}
            </select>
          </label>
          <Input label="Fecha preferida" type="date" value={form.desiredDate} onChange={(event) => update('desiredDate', event.target.value)} />
        </div>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Limitaciones físicas voluntarias</span>
          <textarea className="mt-2 min-h-24 w-full rounded-xl border border-kupan-border bg-kupan-black/45 px-4 py-3 text-base text-white outline-none focus:border-kupan-sand" value={form.physicalLimitations} onChange={(event) => update('physicalLimitations', event.target.value)} />
        </label>
        <label className="flex min-h-12 items-start gap-3 rounded-xl border border-kupan-border bg-black/25 p-3 text-sm leading-6 text-text-secondary">
          <input className="mt-1 h-5 w-5 shrink-0 accent-kupan-ember" type="checkbox" checked={form.privacyAccepted} onChange={(event) => update('privacyAccepted', event.target.checked)} />
          <span>Acepto que {gymConfig.identity.name} use estos datos para coordinar mi clase y realizar seguimiento de esta solicitud.</span>
        </label>
        <Button type="submit" size="lg" fullWidth isLoading={isSaving}>Solicitar primera clase</Button>
      </Card>
    </div>
  )
}
