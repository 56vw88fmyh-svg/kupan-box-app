import { useEffect, useState } from 'react'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { communityBirthdays, communityRanking } from '../data/mockData.js'
import { formatBirthdayDayMonth, loadCommunityBirthdays } from '../utils/birthdays.js'

function EventCard({ event }) {
  return (
    <article className="k-panel p-4">
      <div className="flex gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-kupan-ember/40 bg-kupan-ember/15 text-center text-sm font-black uppercase leading-tight text-kupan-flame">
          {event.date}
        </div>
        <div>
          <h3 className="font-black uppercase text-white">{event.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{event.detail}</p>
        </div>
      </div>
    </article>
  )
}

function RankingItem({ athlete, index }) {
  return (
    <article className="k-panel flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-black ${
          index === 0 ? 'bg-kupan-ember text-white' : 'bg-white/10 text-kupan-flame'
        }`}>
          #{index + 1}
        </div>
        <div>
          <h3 className="font-black uppercase text-white">{athlete.name}</h3>
          <p className="text-sm text-white/60">{athlete.badge}</p>
        </div>
      </div>
      <p className="text-sm font-black uppercase text-kupan-flame">{athlete.score}</p>
    </article>
  )
}

function BirthdayCard({ person }) {
  const name = person.full_name ?? person.name
  const date = person.birth_day
    ? formatBirthdayDayMonth(person.birth_day, person.birth_month)
    : person.date
  const ageText = person.turning_age ? `Cumple ${person.turning_age}` : 'Celebramos juntos'

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.065] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-kupan-ember text-lg font-black text-white">
          {name.charAt(0)}
        </div>
        <div>
          <h3 className="font-black uppercase text-white">{name}</h3>
          <p className="text-sm text-white/60">{date}</p>
          <p className="mt-1 text-xs font-black uppercase text-kupan-flame">{ageText}</p>
        </div>
      </div>
    </article>
  )
}

export function Community({ appContent }) {
  const { communityEvents, communityPosts, appText } = appContent
  const [birthdays, setBirthdays] = useState(communityBirthdays)

  useEffect(() => {
    let isMounted = true

    loadCommunityBirthdays().then((result) => {
      if (isMounted && result.ok && result.birthdays.length > 0) {
        setBirthdays(result.birthdays)
      }
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
            Acá celebramos los avances, armamos panoramas y mantenemos viva la energía del box también fuera del horario de clase.
          </p>
        </div>
        <div className="bg-kupan-ember/15 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Frase KUPAN</p>
          <blockquote className="mt-3 text-3xl font-black uppercase leading-tight text-white">
            “{appText.communityPhrase}”
          </blockquote>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Agenda del box" title="Próximos encuentros" />
        <div className="grid gap-3 md:grid-cols-3">
          {communityEvents.map((event) => (
            <EventCard key={event.title} event={event} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Ranking amistoso" title="La tabla buena onda" />
        <div className="space-y-3">
          {communityRanking.map((athlete, index) => (
            <RankingItem key={athlete.name} athlete={athlete} index={index} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Celebramos juntos" title="Cumples del mes" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {birthdays.map((person) => (
            <BirthdayCard key={person.profile_id ?? person.name} person={person} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Muro KUPAN" title="Noticias del box" />
        <div className="space-y-3">
          {communityPosts.map((post) => (
            <article key={post.title} className="k-panel p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">{post.tag}</p>
                  <h3 className="mt-2 font-black uppercase text-white">{post.title}</h3>
                </div>
                <span className="k-pill">Recién salido</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/60">{post.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
