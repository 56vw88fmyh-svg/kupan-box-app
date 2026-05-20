import { SectionTitle } from '../components/SectionTitle.jsx'
import { createWhatsAppUrl } from '../utils/whatsapp.js'

function formatToday() {
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function buildWhatsAppText(dateLabel, wod) {
  return [
    `WOD KUPAN - ${dateLabel}`,
    `${wod.title}`,
    `${wod.type} · Time cap ${wod.timeCap}`,
    '',
    'Warm up:',
    ...wod.warmup.map((item) => `- ${item}`),
    '',
    `Skill / Strength: ${wod.strength.title}`,
    ...wod.strength.details.map((item) => `- ${item}`),
    '',
    'WOD:',
    ...wod.workout.map((item) => `- ${item}`),
    '',
    'Escala inteligente, entrena acompañado y termina con el último compañero.',
  ].join('\n')
}

function TrainingBlock({ eyebrow, title, items, children }) {
  return (
    <article className="k-panel p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-black uppercase leading-tight text-white">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-kupan-bone">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kupan-ember" />
            {item}
          </li>
        ))}
      </ul>
      {children}
    </article>
  )
}

function ScalingCard({ scale }) {
  return (
    <article className="k-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Escalado KUPAN</p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">{scale.level}</h3>
        </div>
        <span className="k-pill">{scale.items.length} ajustes</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/60">{scale.description}</p>
      <ul className="mt-4 space-y-2">
        {scale.items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-kupan-bone">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kupan-flame" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  )
}

export function Wod({ appContent }) {
  const { wod } = appContent
  const today = formatToday()
  const whatsappUrl = createWhatsAppUrl(buildWhatsAppText(today, wod))

  return (
    <div className="space-y-6">
      <section className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">{today}</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">{wod.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">{wod.focus}</p>
        </div>
        <div className="grid grid-cols-2 border-b border-white/10 sm:grid-cols-4">
          <div className="p-4">
            <p className="text-xs font-black uppercase text-white/60">Formato</p>
            <p className="mt-1 text-lg font-black uppercase text-white">{wod.type}</p>
          </div>
          <div className="border-l border-white/10 p-4">
            <p className="text-xs font-black uppercase text-white/60">Time cap</p>
            <p className="mt-1 text-lg font-black uppercase text-kupan-flame">{wod.timeCap}</p>
          </div>
          <div className="border-t border-white/10 p-4 sm:border-l sm:border-t-0">
            <p className="text-xs font-black uppercase text-white/60">Nivel</p>
            <p className="mt-1 text-lg font-black uppercase text-white">Todos</p>
          </div>
          <div className="border-l border-t border-white/10 p-4 sm:border-t-0">
            <p className="text-xs font-black uppercase text-white/60">Foco</p>
            <p className="mt-1 text-lg font-black uppercase text-white">Comunidad</p>
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
        <TrainingBlock eyebrow="Calentamiento" title="Warm up" items={wod.warmup} />
        <TrainingBlock eyebrow="Fuerza / técnica" title={wod.strength.title} items={wod.strength.details} />
        <TrainingBlock eyebrow="WOD del día" title={wod.type} items={wod.workout}>
          <div className="mt-4 rounded-lg border border-kupan-ember/40 bg-kupan-ember/10 p-3">
            <p className="text-xs font-black uppercase text-kupan-flame">Time cap</p>
            <p className="mt-1 text-2xl font-black uppercase text-white">{wod.timeCap}</p>
          </div>
        </TrainingBlock>
      </div>

      <section>
        <SectionTitle eyebrow="Escalado KUPAN" title="Escoge tu versión" />
        <div className="grid gap-3 md:grid-cols-2">
          {wod.scaling.map((scale) => (
            <ScalingCard key={scale.level} scale={scale} />
          ))}
        </div>
      </section>

      <section className="k-card p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Notas del coach</p>
        <ul className="mt-3 space-y-2">
          {wod.notes.map((note) => (
            <li key={note} className="flex gap-3 text-sm leading-6 text-kupan-bone">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kupan-ember" />
              {note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
