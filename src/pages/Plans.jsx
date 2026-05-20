import { SectionTitle } from '../components/SectionTitle.jsx'
import { transferInfo } from '../data/mockData.js'
import { createWhatsAppUrl, whatsappMessages } from '../utils/whatsapp.js'

function buildWhatsAppUrl(plan) {
  return createWhatsAppUrl(whatsappMessages.plan(plan.name))
}

function PlanCard({ plan }) {
  return (
    <article className={`rounded-lg border p-5 ${plan.highlight ? 'border-kupan-ember bg-kupan-ember/15 shadow-glow' : 'border-white/10 bg-white/[0.065]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-kupan-flame">{plan.name}</p>
          <h3 className="mt-3 text-4xl font-black text-white">{plan.price}</h3>
          <p className="mt-1 text-sm font-black uppercase text-white/60">CLP · {plan.classes}</p>
        </div>
        {plan.highlight ? <span className="k-pill text-kupan-flame">Recomendado</span> : null}
      </div>

      <ul className="mt-5 space-y-2">
        {plan.benefits.map((benefit) => (
          <li key={benefit} className="flex gap-3 text-sm leading-6 text-kupan-bone">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kupan-ember" />
            {benefit}
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-3">
        <a className={plan.highlight ? 'k-button' : 'k-button-secondary'} href={buildWhatsAppUrl(plan)} target="_blank" rel="noreferrer">
          Solicitar por WhatsApp
        </a>
        <a className="k-button-secondary" href={plan.paymentUrl} target="_blank" rel="noreferrer">
          Pagar ahora
        </a>
      </div>
    </article>
  )
}

export function Plans({ appContent }) {
  const { plans } = appContent

  return (
    <div className="space-y-6">
      <section className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">Planes KUPAN</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Elige tu plan y ven a entrenar fuerte.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Tú eliges el ritmo, nosotros ponemos el box, la comunidad y la energía para que sigas progresando.
          </p>
        </div>
      </section>

      <SectionTitle eyebrow="Membresías KUPAN" title="Planes para tu ritmo" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </div>

      <section>
        <SectionTitle eyebrow="Transferencia" title="Activa tu plan directo" />
        <div className="k-card p-5">
          <p className="text-sm leading-6 text-white/60">
            También puedes transferir directo y enviar el comprobante por WhatsApp. Dejamos tu plan activo para que solo te preocupes de entrenar.
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="k-panel p-4">
              <dt className="text-xs font-black uppercase text-white/60">Titular</dt>
              <dd className="mt-1 font-black text-white">{transferInfo.name}</dd>
            </div>
            <div className="k-panel p-4">
              <dt className="text-xs font-black uppercase text-white/60">RUT</dt>
              <dd className="mt-1 font-black text-white">{transferInfo.rut}</dd>
            </div>
            <div className="k-panel p-4">
              <dt className="text-xs font-black uppercase text-white/60">Banco / cuenta</dt>
              <dd className="mt-1 font-black text-white">{transferInfo.bank}</dd>
            </div>
            <div className="k-panel p-4">
              <dt className="text-xs font-black uppercase text-white/60">Número</dt>
              <dd className="mt-1 font-black text-white">{transferInfo.account}</dd>
            </div>
            <div className="k-panel p-4 sm:col-span-2">
              <dt className="text-xs font-black uppercase text-white/60">Correo</dt>
              <dd className="mt-1 font-black text-white">{transferInfo.email}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  )
}
