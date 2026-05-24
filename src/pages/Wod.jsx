import { useEffect, useState } from 'react'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { createWhatsAppUrl } from '../utils/whatsapp.js'
import { formatChileDisplayDate, loadTodaysWod } from '../utils/communityFeed.js'

function buildWhatsAppText(dateLabel, wod) {
  return [
    `WOD KUPAN - ${dateLabel}`,
    wod.title,
    `Time cap ${wod.timeCap}`,
    '',
    'Warm up:',
    ...(wod.warmup.length > 0 ? wod.warmup.map((item) => `- ${item}`) : ['- Por definir']),
    '',
    'Skill / Strength:',
    ...(wod.strength.length > 0 ? wod.strength.map((item) => `- ${item}`) : ['- Por definir']),
    '',
    'WOD:',
    ...(wod.workout.length > 0 ? wod.workout.map((item) => `- ${item}`) : ['- Por definir']),
    '',
    'Escala inteligente, entrena acompañado y termina con el último compañero.',
  ].join('\n')
}

function TrainingBlock({ eyebrow, title, items, emptyText = 'Por definir' }) {
  return (
    <MotionCard as="article" className="k-panel p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-black uppercase leading-tight text-white">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-6 text-kupan-bone">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kupan-ember" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-6 text-white/60">{emptyText}</p>
      )}
    </MotionCard>
  )
}

function WodEmptyState({ today }) {
  return (
    <MotionCard as="section" className="k-card overflow-hidden p-0">
      <div className="border-b border-white/10 bg-black/25 p-5">
        <p className="k-pill inline-flex text-kupan-flame">{today}</p>
        <h2 className="mt-4 text-5xl font-black uppercase leading-none text-white">WOD sorpresa 🔥</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">
          El coach aún no ha cargado el WOD de hoy. Llega preparado: técnica, energía y comunidad.
        </p>
      </div>
      <div className="p-5">
        <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm font-bold leading-6 text-white/70">
          No mostramos WOD antiguos en esta vista para que siempre tengas la pizarra correcta del día.
        </p>
      </div>
    </MotionCard>
  )
}

export function Wod() {
  const todayLabel = formatChileDisplayDate()
  const [state, setState] = useState({ isLoading: true, message: '', wod: null })

  useEffect(() => {
    let isMounted = true

    loadTodaysWod().then((result) => {
      if (!isMounted) return

      setState({
        isLoading: false,
        message: result.ok ? '' : result.message,
        wod: result.ok ? result.wod : null,
      })
    })

    return () => {
      isMounted = false
    }
  }, [])

  const whatsappUrl = state.wod ? createWhatsAppUrl(buildWhatsAppText(todayLabel, state.wod)) : ''

  return (
    <div className="space-y-6">
      {state.isLoading ? (
        <MotionCard className="k-card p-5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-white/60">Cargando WOD de hoy...</p>
        </MotionCard>
      ) : null}

      {state.message ? (
        <p className="rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-sm font-bold text-white">{state.message}</p>
      ) : null}

      {!state.isLoading && !state.wod ? <WodEmptyState today={todayLabel} /> : null}

      {state.wod ? (
        <>
          <section className="k-card overflow-hidden p-0">
            <div className="border-b border-white/10 bg-black/25 p-5">
              <p className="k-pill inline-flex text-kupan-flame">{todayLabel}</p>
              <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">{state.wod.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                WOD cargado para hoy. Entrena fuerte, entrena acompañado.
              </p>
            </div>
            <div className="grid grid-cols-2 border-b border-white/10 sm:grid-cols-4">
              <div className="p-4">
                <p className="text-xs font-black uppercase text-white/60">Fecha</p>
                <p className="mt-1 text-lg font-black uppercase text-white">{state.wod.date}</p>
              </div>
              <div className="border-l border-white/10 p-4">
                <p className="text-xs font-black uppercase text-white/60">Time cap</p>
                <p className="mt-1 text-lg font-black uppercase text-kupan-flame">{state.wod.timeCap}</p>
              </div>
              <div className="border-t border-white/10 p-4 sm:border-l sm:border-t-0">
                <p className="text-xs font-black uppercase text-white/60">Nivel</p>
                <p className="mt-1 text-lg font-black uppercase text-white">Todos</p>
              </div>
              <div className="border-l border-t border-white/10 p-4 sm:border-t-0">
                <p className="text-xs font-black uppercase text-white/60">Foco</p>
                <p className="mt-1 text-lg font-black uppercase text-white">Progreso</p>
              </div>
            </div>
            <div className="p-5">
              <a className="k-button w-full" href={whatsappUrl} target="_blank" rel="noreferrer">
                Compartir por WhatsApp
              </a>
            </div>
          </section>

          <SectionTitle eyebrow="Pizarra KUPAN" title="Trabajo del día" />
          <div className="grid gap-3 md:grid-cols-3">
            <TrainingBlock eyebrow="Calentamiento" title="Warm up" items={state.wod.warmup} />
            <TrainingBlock eyebrow="Fuerza / técnica" title="Skill / Strength" items={state.wod.strength} />
            <TrainingBlock eyebrow="WOD del día" title="Metcon" items={state.wod.workout} />
          </div>

          {state.wod.notes.length > 0 ? (
            <section className="k-card p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Notas del coach</p>
              <ul className="mt-3 space-y-2">
                {state.wod.notes.map((note) => (
                  <li key={note} className="flex gap-3 text-sm leading-6 text-kupan-bone">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kupan-ember" />
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
