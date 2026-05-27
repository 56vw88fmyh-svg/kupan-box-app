import { SectionTitle } from '../components/SectionTitle.jsx'
import logoKupan from '../assets/brand/logo-kupan.png'
import { createWhatsAppUrl, whatsappMessages } from '../utils/whatsapp.js'

export function Home({ setActivePage, appContent }) {
  const { schedule, todayStats, wod } = appContent
  const text = appContent.appText

  return (
    <div className="space-y-7">
      <section className="k-hero relative overflow-hidden rounded-lg border border-white/10 p-5 shadow-glow sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-kupan-ember via-kupan-flame to-white/20" />
        <div className="relative">
          <img className="mb-5 max-h-28 w-full max-w-64 object-contain object-left sm:max-h-36" src={logoKupan} alt="KUPAN" />
          <p className="k-pill inline-flex text-kupan-flame">{text.homeEyebrow}</p>
          <h2 className="mt-5 max-w-3xl text-5xl font-black uppercase leading-[0.9] text-white sm:text-7xl">
            {text.homeTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/70">
            {text.homeBody}
          </p>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-4">
          <button type="button" className="k-button" onClick={() => setActivePage('reservations')}>
            Reservar clase
          </button>
          <button type="button" className="k-button-secondary" onClick={() => setActivePage('wod')}>
            Ver WOD
          </button>
          <button type="button" className="k-button-secondary" onClick={() => setActivePage('reservations')}>
            Ver horarios
          </button>
          <a className="k-button-secondary" href={createWhatsAppUrl(whatsappMessages.dropIn)} target="_blank" rel="noreferrer">
            Clase de prueba
          </a>
        </div>

        <div className="relative mt-6 grid grid-cols-3 gap-2">
          {todayStats.map((stat) => (
            <div key={stat.label} className="k-stat">
              <p className="text-2xl font-black uppercase text-white">{stat.value}</p>
              <p className="mt-1 text-[0.68rem] font-black uppercase leading-4 text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <SectionTitle eyebrow="Hoy en KUPAN" title="Tu próxima oportunidad" />
          <div className="k-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-4xl font-black text-white">{schedule[0].time}</p>
                <p className="mt-1 text-lg font-black uppercase">{schedule[0].name}</p>
                <p className="mt-1 text-sm text-white/60">Coach {schedule[0].coach} · {schedule[0].maxSpots} cupos para moverte con el equipo.</p>
              </div>
              <span className="k-pill text-kupan-flame">{schedule[0].spots} disponibles</span>
            </div>
            <p className="mt-3 text-xs font-black uppercase text-white/60">Cupo máximo: {schedule[0].maxSpots} alumnos</p>
            <button type="button" className="k-button mt-5 w-full" onClick={() => setActivePage('reservations')}>
              Reservar clase
            </button>
          </div>
        </div>

        <div>
          <SectionTitle eyebrow="Comunidad" title="Box cercano" />
          <div className="k-card p-5">
            <p className="text-2xl font-black uppercase leading-tight text-white">Acá nadie entrena solo.</p>
            <p className="mt-3 text-sm leading-6 text-white/60">
              El WOD termina cuando termina el último compañero. Te acompañamos con técnica, intensidad y buena energía, desde tu primera clase hasta tu próximo PR.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="WOD de hoy" title={wod.title} />
        <div className="k-card overflow-hidden p-0">
          <div className="border-b border-white/10 bg-black/25 p-5">
            <p className="text-5xl font-black uppercase text-kupan-flame">{wod.type}</p>
            <p className="mt-2 text-sm font-semibold text-white/70">Muévete con cabeza, empuja con el grupo y termina fuerte.</p>
          </div>
          <div className="grid gap-0 sm:grid-cols-3">
            {wod.workout.map((movement, index) => (
              <div key={movement} className="border-t border-white/10 p-4 sm:border-l sm:border-t-0 sm:first:border-l-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">Parte {index + 1}</p>
                <p className="mt-2 text-sm font-bold text-white">{movement}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Organiza tu semana" title="Horarios para darlo todo" />
        <div className="grid gap-3 md:grid-cols-3">
          {schedule.slice(1, 4).map((item, index) => (
            <button key={`${item.day ?? item.level ?? 'kupan'}-${item.time}-${item.name}-${index}`} type="button" className="k-panel p-4 text-left transition hover:border-kupan-flame/60" onClick={() => setActivePage('reservations')}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-black text-white">{item.time}</p>
                <span className="k-pill text-kupan-flame">{item.spots} disponibles</span>
              </div>
              <p className="mt-3 font-black uppercase text-white">{item.name}</p>
              <p className="mt-1 text-sm text-white/60">Coach {item.coach} · {item.level}</p>
              <p className="mt-1 text-xs font-black uppercase text-white/60">Máximo {item.maxSpots} alumnos</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
