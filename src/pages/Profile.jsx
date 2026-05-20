import { motion as Motion } from 'framer-motion'
import { MotionCard } from '../components/Motion.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { profile } from '../data/mockData.js'

const weeklyProgress = [
  { day: 'L', done: true },
  { day: 'M', done: true },
  { day: 'M', done: false },
  { day: 'J', done: true },
  { day: 'V', done: false },
  { day: 'S', done: true },
]

const levelOptions = ['Iniciado', 'Rookie', 'Scaled', 'RX']

export function Profile({ userReservations, onCancelReservation, setActivePage, currentUser, onLogout }) {
  const profileName = currentUser?.name ?? profile.name
  const userActiveReservations = currentUser
    ? userReservations.filter((reservation) => reservation.userId === currentUser.id)
    : []
  const weeklyCompleted = weeklyProgress.filter((item) => item.done).length
  const weeklyGoal = weeklyProgress.length
  const weeklyPercent = Math.round((weeklyCompleted / weeklyGoal) * 100)
  const level = levelOptions[Math.min(userActiveReservations.length, levelOptions.length - 1)]
  const attendance = currentUser ? profile.attendance + userActiveReservations.length : profile.attendance
  const motivation = 'Entrena fuerte, entrena acompañado. El progreso se construye apareciendo.'

  return (
    <div className="space-y-6">
      <MotionCard as="section" className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-kupan-ember/50 bg-kupan-ember text-4xl font-black text-white shadow-glow">
              {profileName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="k-pill inline-flex text-kupan-flame">{currentUser ? 'Atleta KUPAN' : 'Sesión invitada'}</p>
              <h2 className="mt-3 break-words text-4xl font-black uppercase leading-none text-white">{profileName}</h2>
              <p className="mt-2 text-sm text-white/60">{currentUser?.email ?? 'Inicia sesión para guardar tu progreso'}</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-kupan-ember/30 bg-kupan-ember/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Frase de la semana</p>
            <p className="mt-2 text-xl font-black uppercase leading-tight text-white">{motivation}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-0 border-b border-white/10">
          <div className="p-4">
            <p className="text-3xl font-black text-white">{userActiveReservations.length}</p>
            <p className="text-[0.65rem] font-black uppercase text-white/60">Reservas</p>
          </div>
          <div className="border-l border-white/10 p-4">
            <p className="text-3xl font-black text-white">{attendance}</p>
            <p className="text-[0.65rem] font-black uppercase text-white/60">Asistencias</p>
          </div>
          <div className="border-l border-white/10 p-4">
            <p className="text-2xl font-black uppercase text-kupan-flame">{level}</p>
            <p className="text-[0.65rem] font-black uppercase text-white/60">Nivel</p>
          </div>
        </div>

        <div className="p-5">
          {currentUser ? (
            <button type="button" className="k-button-secondary w-full" onClick={onLogout}>
              Cerrar sesión
            </button>
          ) : (
            <button type="button" className="k-button w-full" onClick={() => setActivePage('login')}>
              Iniciar sesión
            </button>
          )}
        </div>
      </MotionCard>

      <MotionCard as="section" className="k-card p-5" delay={0.04}>
        <SectionTitle eyebrow="Progreso semanal" title={`${weeklyCompleted}/${weeklyGoal} entrenamientos`} />
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
          <Motion.div
            className="h-full rounded-full bg-kupan-ember shadow-glow"
            initial={{ width: 0 }}
            whileInView={{ width: `${weeklyPercent}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-4 grid grid-cols-6 gap-2">
          {weeklyProgress.map((item, index) => (
            <Motion.div
              key={`${item.day}-${index}`}
              className={`rounded-lg border p-3 text-center ${
              item.done ? 'border-kupan-ember bg-kupan-ember/15 text-white' : 'border-white/10 bg-white/5 text-white/40'
            }`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.035, duration: 0.2 }}
            >
              <p className="text-sm font-black uppercase">{item.day}</p>
            </Motion.div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-white/60">
          Esta semana vas al {weeklyPercent}% de tu meta simulada. Mantén el ritmo y llega listo al próximo WOD.
        </p>
      </MotionCard>

      <section>
        <SectionTitle eyebrow="Clases reservadas" title="Tu agenda KUPAN" />
        {userActiveReservations.length > 0 ? (
          <div className="space-y-3">
            {userActiveReservations.map((item) => (
              <MotionCard key={item.id} as="article" className="k-panel p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">{item.day} · {item.block}</p>
                    <h3 className="mt-2 font-black uppercase text-white">{item.time} · {item.name}</h3>
                    <p className="mt-1 text-sm text-white/60">Coach {item.coach} · cupo confirmado</p>
                  </div>
                  <button type="button" className="k-button-secondary shrink-0 px-3 py-2 text-xs" onClick={() => onCancelReservation(item.id)}>
                    Cancelar
                  </button>
                </div>
              </MotionCard>
            ))}
          </div>
        ) : (
          <MotionCard className="k-panel p-4">
            <p className="font-black uppercase text-white">Aún no tienes reservas.</p>
            <p className="mt-1 text-sm leading-6 text-white/60">Reserva tu clase y ven a darlo todo. Tu semana queda ordenada acá.</p>
          </MotionCard>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
        <MotionCard className="k-card p-5" delay={0.03}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Asistencia simulada</p>
          <p className="mt-3 text-5xl font-black text-white">92%</p>
          <p className="mt-2 text-sm leading-6 text-white/60">Constancia KUPAN para aparecer, moverte bien y seguir progresando.</p>
        </MotionCard>

        <div>
          <SectionTitle eyebrow="Progreso" title="PRs que se celebran" />
          <div className="space-y-3">
          {profile.prs.map((pr) => (
            <MotionCard key={pr.lift} className="k-panel flex items-center justify-between p-4">
              <p className="font-black uppercase text-white">{pr.lift}</p>
              <p className="text-lg font-black text-kupan-flame">{pr.value}</p>
            </MotionCard>
          ))}
          </div>
        </div>
      </section>

      <MotionCard as="section" className="k-card p-5" delay={0.05}>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Gestión del box</p>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">Panel admin temporal</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Edita WOD, horarios, cupos, comunidad y planes mientras conectamos una base de datos real.
        </p>
        <button type="button" className="k-button-secondary mt-4 w-full" onClick={() => setActivePage('admin')}>
          Entrar a admin
        </button>
      </MotionCard>
    </div>
  )
}
