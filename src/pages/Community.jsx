import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, StaleDataState } from '../components/ui/index.js'
import { formatBirthdayDayMonth } from '../utils/birthdays.js'
import { formatShortChileDate, loadCommunityFeed } from '../utils/communityFeed.js'

const tabs = [
  { id: 'activity', label: 'Actividad' },
  { id: 'events', label: 'Eventos' },
  { id: 'news', label: 'Noticias' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'birthdays', label: 'Cumpleaños' },
]

function stripText(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  const dateText = String(value).slice(0, 10)
  return formatShortChileDate(dateText)
}

function monthLabel(date = new Date()) {
  return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'America/Santiago' }).format(date)
}

function buildActivity({ news, recentPrs, ranking }) {
  const prItems = recentPrs.slice(0, 4).map((record) => ({
    id: `pr-${record.id}`,
    type: 'Nuevo PR',
    title: stripText(record.full_name, 'Atleta KUPAN'),
    detail: `${stripText(record.movement, 'Movimiento')} · ${record.value} ${record.unit ?? ''}`,
    date: record.record_date ?? record.created_at,
  }))

  const newsItems = news.slice(0, 3).map((post) => ({
    id: `post-${post.id}`,
    type: post.type === 'evento' ? 'Evento publicado' : 'Noticia publicada',
    title: stripText(post.title, 'Comunicado KUPAN'),
    detail: stripText(post.content, 'Nueva información disponible.').slice(0, 120),
    date: post.created_at ?? post.event_date,
  }))

  const attendanceItems = ranking.slice(0, 2).map((athlete, index) => ({
    id: `attendance-${athlete.profile_id}`,
    type: 'Asistencia destacada',
    title: stripText(athlete.full_name, 'Atleta KUPAN'),
    detail: `Posición ${index + 1} · ${athlete.reservations_count} reservas registradas`,
    date: new Date().toISOString(),
  }))

  return [...prItems, ...newsItems, ...attendanceItems]
    .filter((item) => item.title)
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-text-muted">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black text-text-primary">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p> : null}
    </div>
  )
}

function ActivitySection({ items }) {
  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Actividad" title="Lo último en el box" description="PR, publicaciones y asistencia destacada en contexto." />
      {items.length === 0 ? <EmptyState title="Sin actividad reciente." description="Cuando haya PR, resultados o publicaciones nuevas, aparecerán aquí." /> : null}
      <div className="space-y-3">
        {items.slice(0, 20).map((item) => (
          <Card key={item.id} as="article" variant="standard" className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge state="neutral">{item.type}</Badge>
                <h3 className="mt-3 break-words text-lg font-black text-text-primary">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{item.detail}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-text-muted">{formatDate(item.date)}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function EventsSection({ events }) {
  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Eventos" title="Próximas actividades" description="Eventos publicados por el box, sin mezclar administración con vista alumno." />
      {events.length === 0 ? <EmptyState title="Sin eventos publicados." description="Cuando el box publique un evento, lo verás aquí con fecha, lugar y estado." /> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {events.map((event) => (
          <Card key={event.id} as="article" variant="interactive" className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-text-primary">{stripText(event.title, 'Evento KUPAN')}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{stripText(event.content, 'Detalles por confirmar.').slice(0, 180)}</p>
              </div>
              <Badge state="available">{event.status ?? 'Publicado'}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-border-default bg-bg-secondary p-3">
                <p className="text-text-muted">Fecha</p>
                <p className="mt-1 font-black text-text-primary">{formatDate(event.event_date ?? event.created_at)}</p>
              </div>
              <div className="rounded-xl border border-border-default bg-bg-secondary p-3">
                <p className="text-text-muted">Lugar</p>
                <p className="mt-1 font-black text-text-primary">{stripText(event.location, 'Kupan Box')}</p>
              </div>
            </div>
            <Button type="button" variant="secondary" className="mt-4" fullWidth disabled>Informarse en el box</Button>
          </Card>
        ))}
      </div>
    </section>
  )
}

function NewsSection({ news }) {
  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Noticias" title="Comunicados del box" description="Resumen breve, fecha clara y contenido sanitizado." />
      {news.length === 0 ? <EmptyState title="Sin noticias por ahora." description="Las novedades del box aparecerán aquí cuando sean publicadas." /> : null}
      <div className="space-y-3">
        {news.map((post) => (
          <Card key={post.id} as="article" variant="standard" className="overflow-hidden p-0">
            {post.image_url ? <img className="h-40 w-full object-cover" src={post.image_url} alt="" loading="lazy" decoding="async" width="640" height="320" /> : null}
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge state="neutral">{stripText(post.type, 'Noticia')}</Badge>
                <p className="text-sm font-semibold text-text-muted">{formatDate(post.created_at ?? post.event_date)}</p>
              </div>
              <h3 className="mt-3 text-xl font-black text-text-primary">{stripText(post.title, 'Noticia KUPAN')}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{stripText(post.content, 'Resumen por confirmar.').slice(0, 220)}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function RankingSection({ ranking }) {
  const period = monthLabel()
  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Ranking" title={`Ranking de asistencia — ${period}`} description="Mide reservas registradas durante el mes actual. Actualización según datos disponibles en Supabase." />
      {ranking.length === 0 ? <EmptyState title="Ranking vacío." description="Todavía no hay reservas suficientes para mostrar posiciones este mes." /> : null}
      <div className="space-y-3">
        {ranking.slice(0, 25).map((athlete, index) => (
          <Card key={athlete.profile_id} as="article" variant="standard" className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-default bg-bg-secondary text-sm font-black text-text-primary">
                  #{index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="break-words font-black text-text-primary">{stripText(athlete.full_name, 'Atleta KUPAN')}</h3>
                  <p className="mt-1 text-sm text-text-muted">Posición {index + 1} · actualizado {formatDate(new Date().toISOString())}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-kupan-flame">{athlete.reservations_count}</p>
                <p className="text-xs font-bold uppercase text-text-muted">reservas</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function BirthdaysSection({ birthdays }) {
  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Cumpleaños" title="Celebramos este mes" description="Solo se muestra nombre y día/mes. No se expone año, edad ni datos de contacto." />
      {birthdays.length === 0 ? <EmptyState title="Sin cumpleaños este mes." description="Cuando haya cumpleaños registrados, aparecerán de forma privada y acotada." /> : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {birthdays.map((person) => (
          <Card key={person.profile_id} as="article" variant="standard" className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kupan-ember text-lg font-black text-white" aria-hidden="true">
                {stripText(person.full_name, 'A').charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="break-words font-black text-text-primary">{stripText(person.full_name, 'Atleta KUPAN')}</h3>
                <p className="text-sm text-text-muted">{formatBirthdayDayMonth(person.birth_day, person.birth_month)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

export function Community({ appContent }) {
  const phrase = appContent.appText.communityPhrase
  const [activeTab, setActiveTab] = useState('activity')
  const [state, setState] = useState({
    isLoading: true,
    message: '',
    birthdays: [],
    events: [],
    ranking: [],
    news: [],
    recentPrs: [],
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true
    loadCommunityFeed().then((result) => {
      if (!isMounted) return
      const posts = result.news ?? []
      setState((current) => ({
        isLoading: false,
        message: result.ok ? '' : result.message,
        birthdays: result.birthdays?.length || result.ok ? (result.birthdays ?? []) : current.birthdays,
        events: posts.length || result.ok ? posts.filter((post) => post.type === 'evento') : current.events,
        ranking: result.ranking?.length || result.ok ? (result.ranking ?? []) : current.ranking,
        news: posts.length || result.ok ? posts.filter((post) => post.type !== 'evento') : current.news,
        recentPrs: result.recentPrs?.length || result.ok ? (result.recentPrs ?? []) : current.recentPrs,
      }))
    })
    return () => {
      isMounted = false
    }
  }, [reloadKey])

  const activity = useMemo(() => buildActivity(state), [state])
  const hasVisibleData = activity.length > 0 || state.events.length > 0 || state.news.length > 0 || state.ranking.length > 0 || state.birthdays.length > 0

  const activeContent = {
    activity: <ActivitySection items={activity} />,
    events: <EventsSection events={state.events} />,
    news: <NewsSection news={state.news} />,
    ranking: <RankingSection ranking={state.ranking} />,
    birthdays: <BirthdaysSection birthdays={state.birthdays} />,
  }[activeTab]

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <Card as="section" variant="elevated" className="overflow-hidden p-0">
        <div className="border-b border-border-default bg-bg-secondary p-5">
          <Badge state="neutral">Comunidad KUPAN</Badge>
          <h1 className="mt-4 text-3xl font-black leading-tight text-text-primary sm:text-4xl">Comunidad en una sola pizarra.</h1>
          <p className="mt-3 text-base leading-7 text-text-secondary">Actividad, eventos, noticias, ranking y cumpleaños sin competir con reservas ni WOD.</p>
        </div>
        <div className="bg-kupan-ember/15 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Frase KUPAN</p>
          <blockquote className="mt-3 text-2xl font-black leading-tight text-white">“{stripText(phrase)}”</blockquote>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto k-scroll-x pb-1" role="tablist" aria-label="Subsecciones de comunidad">
        {tabs.map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-black transition ${selected ? 'border-brand-red bg-brand-red text-white' : 'border-border-default bg-bg-card text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {selected ? <span className="mx-auto mt-1 block h-1 w-8 rounded-full bg-white" /> : null}
            </button>
          )
        })}
      </div>

      {state.isLoading ? <LoadingState label="Cargando comunidad" lines={4} /> : null}
      {!state.isLoading && state.message ? <ErrorState title="Algunos bloques no cargaron" description={state.message} onAction={() => setReloadKey((current) => current + 1)} /> : null}
      {!state.isLoading && state.message && hasVisibleData ? <StaleDataState onRetry={() => setReloadKey((current) => current + 1)} /> : null}
      {!state.isLoading ? activeContent : null}
    </div>
  )
}
