import { useEffect, useState } from 'react'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { formatBirthdayDayMonth } from '../utils/birthdays.js'
import { formatShortChileDate, loadCommunityFeed } from '../utils/communityFeed.js'

function EmptyPanel({ children }) {
  return (
    <MotionCard className="k-panel p-4">
      <p className="text-sm font-bold leading-6 text-white/60">{children}</p>
    </MotionCard>
  )
}

function MonthlyBirthdaysCard({ birthdays }) {
  return (
    <section>
      <SectionTitle eyebrow="Celebramos juntos" title="Cumpleaños del mes" />
      {birthdays.length === 0 ? (
        <EmptyPanel>No hay cumpleaños registrados este mes.</EmptyPanel>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {birthdays.map((person) => (
            <MotionCard key={person.profile_id} className="rounded-lg border border-white/10 bg-white/[0.065] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-kupan-ember text-lg font-black text-white">
                  {person.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black uppercase text-white">{person.full_name}</h3>
                  <p className="text-sm text-white/60">{formatBirthdayDayMonth(person.birth_day, person.birth_month)}</p>
                </div>
              </div>
            </MotionCard>
          ))}
        </div>
      )}
    </section>
  )
}

function GoodVibesRankingCard({ ranking }) {
  return (
    <section>
      <SectionTitle eyebrow="Ranking mensual" title="Tabla buena onda" />
      {ranking.length === 0 ? (
        <EmptyPanel>Aún no hay reservas para armar la tabla buena onda.</EmptyPanel>
      ) : (
        <div className="space-y-3">
          {ranking.slice(0, 10).map((athlete, index) => (
            <MotionCard key={athlete.profile_id} as="article" className="k-panel flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-black ${
                  index === 0 ? 'bg-kupan-ember text-white' : 'bg-white/10 text-kupan-flame'
                }`}>
                  #{index + 1}
                </div>
                <div>
                  <h3 className="font-black uppercase text-white">{athlete.full_name}</h3>
                  <p className="text-sm text-white/60">Entrena fuerte, entrena acompañado</p>
                </div>
              </div>
              <p className="text-sm font-black uppercase text-kupan-flame">{athlete.reservations_count} reservas</p>
            </MotionCard>
          ))}
        </div>
      )}
    </section>
  )
}

function BoxNewsCard({ news }) {
  return (
    <section>
      <SectionTitle eyebrow="Muro KUPAN" title="Noticias del box" />
      {news.length === 0 ? (
        <EmptyPanel>Pronto tendremos novedades para la comunidad.</EmptyPanel>
      ) : (
        <div className="space-y-3">
          {news.map((post) => (
            <MotionCard key={post.id} as="article" className="k-panel p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">{post.type ?? 'KUPAN'}</p>
                  <h3 className="mt-2 font-black uppercase text-white">{post.title}</h3>
                </div>
                <span className="k-pill">{formatShortChileDate(post.created_at?.slice(0, 10) ?? post.event_date)}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/60">{post.content}</p>
            </MotionCard>
          ))}
        </div>
      )}
    </section>
  )
}

function RecentPrsCard({ records }) {
  return (
    <section>
      <SectionTitle eyebrow="Progreso real" title="Últimos PR cargados" />
      {records.length === 0 ? (
        <EmptyPanel>Aún no hay PR registrados.</EmptyPanel>
      ) : (
        <div className="space-y-3">
          {records.slice(0, 5).map((record) => (
            <MotionCard key={record.id} as="article" className="k-panel p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">{record.full_name}</p>
                  <h3 className="mt-2 font-black uppercase text-white">{record.movement}</h3>
                  <p className="mt-1 text-sm text-white/60">{formatShortChileDate(record.record_date)}</p>
                </div>
                <div className="rounded-lg border border-kupan-ember/40 bg-kupan-ember/10 px-3 py-2 text-right">
                  <p className="text-2xl font-black text-white">{record.value}</p>
                  <p className="text-[0.65rem] font-black uppercase text-kupan-flame">{record.unit}</p>
                </div>
              </div>
            </MotionCard>
          ))}
        </div>
      )}
    </section>
  )
}

export function Community({ appContent }) {
  const phrase = appContent.appText.communityPhrase
  const [state, setState] = useState({
    isLoading: true,
    message: '',
    birthdays: [],
    ranking: [],
    news: [],
    recentPrs: [],
  })

  useEffect(() => {
    let isMounted = true

    loadCommunityFeed().then((result) => {
      if (!isMounted) return

      setState({
        isLoading: false,
        message: result.ok ? '' : result.message,
        birthdays: result.birthdays ?? [],
        ranking: result.ranking ?? [],
        news: result.news ?? [],
        recentPrs: result.recentPrs ?? [],
      })
    })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <section className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">Comunidad KUPAN</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Somos comunidad, esfuerzo y progreso.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Cumples, avances, noticias y energía del box en una sola pizarra.
          </p>
        </div>
        <div className="bg-kupan-ember/15 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Frase KUPAN</p>
          <blockquote className="mt-3 text-3xl font-black uppercase leading-tight text-white">
            “{phrase}”
          </blockquote>
        </div>
      </section>

      {state.isLoading ? (
        <MotionCard className="k-card p-5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-white/60">Cargando comunidad...</p>
        </MotionCard>
      ) : null}

      {state.message ? (
        <p className="rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-sm font-bold text-white">{state.message}</p>
      ) : null}

      {!state.isLoading ? (
        <>
          <MonthlyBirthdaysCard birthdays={state.birthdays} />
          <GoodVibesRankingCard ranking={state.ranking} />
          <BoxNewsCard news={state.news} />
          <RecentPrsCard records={state.recentPrs} />
        </>
      ) : null}
    </div>
  )
}
