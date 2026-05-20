import { useMemo, useState } from 'react'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { defaultAdminContent } from '../utils/adminContent.js'

// Admin temporal: esta clave y localStorage son solo para prototipo.
// Reemplazar por autenticación real y base de datos antes de publicar operación real.
const TEMP_ADMIN_PASSWORD = 'kupanadmin'

const adminTabs = [
  { id: 'overview', label: 'Resumen' },
  { id: 'wod', label: 'WOD' },
  { id: 'schedule', label: 'Horarios' },
  { id: 'community', label: 'Eventos' },
  { id: 'news', label: 'Noticias' },
  { id: 'plans', label: 'Planes' },
  { id: 'texts', label: 'Textos' },
]

function splitLines(value) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

function joinLines(items) {
  return items.join('\n')
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-white/60">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function TextArea({ label, value, onChange, rows = 5 }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-white/60">{label}</span>
      <textarea
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold leading-6 text-white outline-none transition focus:border-kupan-ember"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function AdminSection({ title, eyebrow, children }) {
  return (
    <section className="k-card p-5">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function LoginPanel({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (password === TEMP_ADMIN_PASSWORD) {
      setError('')
      onLogin()
      return
    }
    setError('Clave incorrecta. Pide la clave temporal al encargado del box.')
  }

  return (
    <section className="k-card p-5">
      <p className="k-pill inline-flex text-kupan-flame">Acceso temporal</p>
      <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Panel admin KUPAN</h2>
      <p className="mt-3 text-sm leading-6 text-white/60">
        Entra con la clave temporal para editar contenido del prototipo. Esto no reemplaza un login real.
      </p>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <Field label="Clave admin" type="password" value={password} onChange={setPassword} />
        {error ? <p className="text-sm font-bold text-kupan-flame">{error}</p> : null}
        <button type="submit" className="k-button w-full">Entrar al panel</button>
      </form>
    </section>
  )
}

export function Admin({ appContent, onSaveContent }) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [draft, setDraft] = useState(appContent)
  const [message, setMessage] = useState('')
  const days = draft.weeklySchedule

  const totals = useMemo(() => ({
    classes: days.reduce((sum, day) => sum + day.blocks.AM.length + day.blocks.PM.length, 0),
    plans: draft.plans.length,
    posts: draft.communityPosts.length,
  }), [days, draft.plans.length, draft.communityPosts.length])

  function updateDraft(pathUpdater) {
    setDraft((current) => pathUpdater(JSON.parse(JSON.stringify(current))))
    setMessage('')
  }

  function updateWod(field, value) {
    updateDraft((current) => {
      current.wod[field] = value
      return current
    })
  }

  function updateWodLines(field, value) {
    updateWod(field, splitLines(value))
  }

  function updateStrength(field, value) {
    updateDraft((current) => {
      current.wod.strength[field] = field === 'details' ? splitLines(value) : value
      return current
    })
  }

  function updateClass(dayIndex, block, classIndex, field, value) {
    updateDraft((current) => {
      const classItem = current.weeklySchedule[dayIndex].blocks[block][classIndex]
      classItem[field] = field === 'spots' || field === 'maxSpots' ? Number(value) : value
      classItem.maxSpots = 12
      classItem.spots = Math.min(Number(classItem.spots || 0), 12)
      return current
    })
  }

  function addClass(dayIndex, block) {
    updateDraft((current) => {
      current.weeklySchedule[dayIndex].blocks[block].push({ time: '18:00', name: 'CrossFit', coach: 'Por definir', spots: 12, maxSpots: 12 })
      return current
    })
  }

  function removeClass(dayIndex, block, classIndex) {
    updateDraft((current) => {
      current.weeklySchedule[dayIndex].blocks[block].splice(classIndex, 1)
      return current
    })
  }

  function updateCollection(collection, index, field, value) {
    updateDraft((current) => {
      current[collection][index][field] = field === 'benefits' ? splitLines(value) : value
      return current
    })
  }

  function updateAppText(field, value) {
    updateDraft((current) => {
      current.appText[field] = value
      return current
    })
  }

  function addNews() {
    updateDraft((current) => {
      current.communityPosts.unshift({
        tag: 'KUPAN',
        title: 'Nueva noticia del box',
        text: 'Cuenta acá lo nuevo para la comunidad KUPAN.',
      })
      return current
    })
  }

  function removeNews(index) {
    updateDraft((current) => {
      current.communityPosts.splice(index, 1)
      return current
    })
  }

  function handleSave() {
    onSaveContent(draft)
    setMessage('Cambios guardados en este navegador.')
  }

  function handleReset() {
    setDraft(defaultAdminContent)
    onSaveContent(defaultAdminContent)
    setMessage('Contenido restaurado al estado base.')
  }

  if (!isAuthorized) {
    return <LoginPanel onLogin={() => setIsAuthorized(true)} />
  }

  return (
    <div className="space-y-6">
      <section className="k-card p-5">
        <p className="k-pill inline-flex text-kupan-flame">Admin temporal</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Control del box</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Los cambios se guardan en localStorage solo para este dispositivo. Antes de operar en serio, esto debe conectarse a una base de datos real y login seguro.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="k-stat"><p className="text-2xl font-black text-white">{totals.classes}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Clases</p></div>
          <div className="k-stat"><p className="text-2xl font-black text-white">{totals.plans}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Planes</p></div>
          <div className="k-stat"><p className="text-2xl font-black text-white">{totals.posts}</p><p className="text-[0.68rem] font-black uppercase text-white/60">Noticias</p></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button type="button" className="k-button sm:col-span-2" onClick={handleSave}>Guardar cambios</button>
          <button type="button" className="k-button-secondary" onClick={handleReset}>Restaurar base</button>
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-kupan-flame">{message}</p> : null}
      </section>

      <nav className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-10 -mx-4 overflow-x-auto border-y border-white/10 bg-kupan-black/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex gap-2">
          {adminTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-black uppercase transition ${
                activeSection === tab.id ? 'bg-kupan-ember text-white shadow-glow' : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
              }`}
              onClick={() => setActiveSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {activeSection === 'overview' ? (
        <section className="grid gap-3 md:grid-cols-3">
          <div className="k-card p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Contenido</p>
            <p className="mt-3 text-4xl font-black text-white">{totals.classes}</p>
            <p className="mt-1 text-sm text-white/60">Clases configuradas.</p>
          </div>
          <div className="k-card p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Comunidad</p>
            <p className="mt-3 text-4xl font-black text-white">{totals.posts}</p>
            <p className="mt-1 text-sm text-white/60">Noticias activas.</p>
          </div>
          <div className="k-card p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Ventas</p>
            <p className="mt-3 text-4xl font-black text-white">{totals.plans}</p>
            <p className="mt-1 text-sm text-white/60">Planes publicados.</p>
          </div>
        </section>
      ) : null}

      {activeSection === 'wod' ? (
      <AdminSection eyebrow="Programación" title="WOD del día">
        <Field label="Título" value={draft.wod.title} onChange={(value) => updateWod('title', value)} />
        <Field label="Formato" value={draft.wod.type} onChange={(value) => updateWod('type', value)} />
        <Field label="Time cap" value={draft.wod.timeCap} onChange={(value) => updateWod('timeCap', value)} />
        <TextArea label="Foco" rows={3} value={draft.wod.focus} onChange={(value) => updateWod('focus', value)} />
        <TextArea label="Warm up (una línea por bloque)" value={joinLines(draft.wod.warmup)} onChange={(value) => updateWodLines('warmup', value)} />
        <Field label="Skill / Strength" value={draft.wod.strength.title} onChange={(value) => updateStrength('title', value)} />
        <TextArea label="Detalles Strength" value={joinLines(draft.wod.strength.details)} onChange={(value) => updateStrength('details', value)} />
        <TextArea label="WOD (una línea por movimiento)" value={joinLines(draft.wod.workout)} onChange={(value) => updateWodLines('workout', value)} />
        <TextArea label="Notas del coach" value={joinLines(draft.wod.notes)} onChange={(value) => updateWodLines('notes', value)} />
      </AdminSection>
      ) : null}

      {activeSection === 'schedule' ? (
      <AdminSection eyebrow="Agenda" title="Horarios y cupos">
        {days.map((day, dayIndex) => (
          <div key={day.id} className="k-panel p-4">
            <Field label={`Nota ${day.label}`} value={day.note} onChange={(value) => updateDraft((current) => {
              current.weeklySchedule[dayIndex].note = value
              return current
            })} />
            {['AM', 'PM'].map((block) => (
              <div key={block} className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black uppercase text-white">{day.label} · {block}</p>
                  <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => addClass(dayIndex, block)}>Agregar</button>
                </div>
                {day.blocks[block].map((classItem, classIndex) => (
                  <div key={`${block}-${classIndex}`} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <Field label="Hora" value={classItem.time} onChange={(value) => updateClass(dayIndex, block, classIndex, 'time', value)} />
                      <Field label="Clase" value={classItem.name} onChange={(value) => updateClass(dayIndex, block, classIndex, 'name', value)} />
                      <Field label="Coach" value={classItem.coach} onChange={(value) => updateClass(dayIndex, block, classIndex, 'coach', value)} />
                      <Field label="Cupos disponibles" type="number" value={classItem.spots} onChange={(value) => updateClass(dayIndex, block, classIndex, 'spots', value)} />
                    </div>
                    <p className="mt-2 text-xs font-bold text-white/50">Máximo KUPAN fijo: 12 alumnos por clase.</p>
                    <button type="button" className="k-button-secondary mt-3 px-3 py-2 text-xs" onClick={() => removeClass(dayIndex, block, classIndex)}>Eliminar clase</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </AdminSection>
      ) : null}

      {activeSection === 'community' ? (
      <AdminSection eyebrow="Comunidad" title="Eventos">
        {draft.communityEvents.map((event, index) => (
          <div key={`${event.title}-${index}`} className="k-panel grid gap-3 p-4 sm:grid-cols-3">
            <Field label="Fecha" value={event.date} onChange={(value) => updateCollection('communityEvents', index, 'date', value)} />
            <Field label="Evento" value={event.title} onChange={(value) => updateCollection('communityEvents', index, 'title', value)} />
            <Field label="Detalle" value={event.detail} onChange={(value) => updateCollection('communityEvents', index, 'detail', value)} />
          </div>
        ))}
      </AdminSection>
      ) : null}

      {activeSection === 'news' ? (
      <AdminSection eyebrow="Muro" title="Noticias">
        <button type="button" className="k-button w-full" onClick={addNews}>Crear noticia</button>
        {draft.communityPosts.map((post, index) => (
          <div key={`${post.title}-${index}`} className="k-panel space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Etiqueta" value={post.tag} onChange={(value) => updateCollection('communityPosts', index, 'tag', value)} />
              <Field label="Título" value={post.title} onChange={(value) => updateCollection('communityPosts', index, 'title', value)} />
              <TextArea label="Texto" rows={3} value={post.text} onChange={(value) => updateCollection('communityPosts', index, 'text', value)} />
            </div>
            <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => removeNews(index)}>Eliminar noticia</button>
          </div>
        ))}
      </AdminSection>
      ) : null}

      {activeSection === 'plans' ? (
      <AdminSection eyebrow="Ventas" title="Planes y precios">
        {draft.plans.map((plan, index) => (
          <div key={plan.name} className="k-panel space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nombre" value={plan.name} onChange={(value) => updateCollection('plans', index, 'name', value)} />
              <Field label="Precio CLP" value={plan.price} onChange={(value) => updateCollection('plans', index, 'price', value)} />
              <Field label="Clases" value={plan.classes} onChange={(value) => updateCollection('plans', index, 'classes', value)} />
            </div>
            <Field label="Link de pago" value={plan.paymentUrl} onChange={(value) => updateCollection('plans', index, 'paymentUrl', value)} />
            <TextArea label="Beneficios" value={joinLines(plan.benefits)} onChange={(value) => updateCollection('plans', index, 'benefits', value)} />
          </div>
        ))}
      </AdminSection>
      ) : null}

      {activeSection === 'texts' ? (
        <AdminSection eyebrow="Copy de la app" title="Textos principales">
          <div className="k-panel space-y-4 p-4">
            <Field label="Inicio · etiqueta" value={draft.appText.homeEyebrow} onChange={(value) => updateAppText('homeEyebrow', value)} />
            <Field label="Inicio · título" value={draft.appText.homeTitle} onChange={(value) => updateAppText('homeTitle', value)} />
            <TextArea label="Inicio · bajada" rows={3} value={draft.appText.homeBody} onChange={(value) => updateAppText('homeBody', value)} />
          </div>
          <div className="k-panel space-y-4 p-4">
            <Field label="Reservas · título" value={draft.appText.reservationsTitle} onChange={(value) => updateAppText('reservationsTitle', value)} />
            <TextArea label="Reservas · bajada" rows={3} value={draft.appText.reservationsBody} onChange={(value) => updateAppText('reservationsBody', value)} />
          </div>
          <div className="k-panel space-y-4 p-4">
            <Field label="Comunidad · frase" value={draft.appText.communityPhrase} onChange={(value) => updateAppText('communityPhrase', value)} />
          </div>
          <div className="k-panel space-y-4 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Métricas de inicio</p>
            {draft.todayStats.map((stat, index) => (
              <div key={`${stat.label}-${index}`} className="grid gap-3 sm:grid-cols-2">
                <Field label="Etiqueta" value={stat.label} onChange={(value) => updateDraft((current) => {
                  current.todayStats[index].label = value
                  return current
                })} />
                <Field label="Valor" value={stat.value} onChange={(value) => updateDraft((current) => {
                  current.todayStats[index].value = value
                  return current
                })} />
              </div>
            ))}
          </div>
        </AdminSection>
      ) : null}
    </div>
  )
}
