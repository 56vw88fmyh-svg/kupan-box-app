import { formatStatus } from '../../../utils/displayFormats.js'
import { AdminMembershipActivationForm } from '../forms/AdminMembershipActivationForm.jsx'
import { AdminMembershipEditForm } from '../forms/AdminMembershipEditForm.jsx'
import { AdminSection, SmallRow } from '../AdminUi.jsx'
import { getMembershipTokens } from '../../../utils/adminMetrics.js'

export function AdminMembershipsModule({
  profiles,
  plans,
  memberships,
  tokenMovements,
  activeMembershipByProfile,
  refs,
  draft,
  editDraft,
  selectedMembershipPlan,
  migrationTotalTokens,
  migrationUsedTokens,
  migrationAvailableTokens,
  isSavingActivation = false,
  isSavingEdit = false,
  isSimulatingPayment = false,
  receipt,
  actions,
  formatDate,
  addDays,
  getPlanTokenTotal,
  onScrollToTarget,
}) {
  return (
    <AdminSection eyebrow="Membresias" title="Gestion real de planes">
      {receipt ? (
        <section
          ref={refs.receipt}
          className="k-membership-receipt scroll-mt-28 rounded-xl border border-emerald-400/35 bg-emerald-400/10 p-4 outline-none"
          role="status"
          aria-live="polite"
          tabIndex={-1}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">{receipt.title}</p>
              <h3 className="mt-2 text-xl font-black uppercase leading-tight text-white">{receipt.studentName}</h3>
              <p className="mt-1 text-sm font-bold text-white/65">{receipt.planName}</p>
            </div>
            <button type="button" className="min-h-11 rounded-lg px-3 text-xs font-black uppercase text-white/60 hover:bg-white/10 hover:text-white" onClick={actions.dismissReceipt}>
              Cerrar
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm font-bold leading-6 text-white">
              Vigencia: {receipt.startDateLabel} — {receipt.endDateLabel}
            </p>
            <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm font-bold leading-6 text-white">
              Tokens: {receipt.tokenSummary}
            </p>
          </div>
          <button type="button" className="k-button-secondary mt-3 w-full sm:w-auto" onClick={() => onScrollToTarget('memberships-overview')}>
            Ver membresía actualizada
          </button>
        </section>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-4">
        <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onScrollToTarget('memberships-overview')}>Planes activos</button>
        <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onScrollToTarget('membership-activate')}>Activar plan</button>
        <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onScrollToTarget('membership-history')}>Historial</button>
        <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onScrollToTarget('token-movements')}>Tokens</button>
      </div>

      <div ref={refs.overview} className="grid scroll-mt-28 gap-3 outline-none md:grid-cols-2" tabIndex={-1}>
        {profiles.map((profile) => {
          const activeMembership = activeMembershipByProfile.get(profile.id)
          const tokens = activeMembership ? getMembershipTokens(activeMembership) : null
          return (
            <article key={profile.id} className="k-panel p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">{activeMembership ? activeMembership.plan?.name ?? 'Plan KUPAN' : 'Sin plan activo'}</p>
                  <h3 className="mt-2 break-words text-lg font-black uppercase text-white">{profile.full_name}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/60">{profile.email}</p>
                </div>
                <span className={`k-pill shrink-0 ${
                  activeMembership?.status === 'active' ? 'text-kupan-flame' : activeMembership ? 'text-white/60' : 'text-white/70'
                }`}
                >
                  {activeMembership?.status ?? 'sin plan'}
                </span>
              </div>

              {activeMembership ? (
                <>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                      <p className="text-[0.62rem] font-black uppercase text-white/50">Total</p>
                      <p className="mt-1 text-sm font-black uppercase text-white">{tokens.total}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                      <p className="text-[0.62rem] font-black uppercase text-white/50">Usados</p>
                      <p className="mt-1 text-sm font-black uppercase text-white">{tokens.used}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                      <p className="text-[0.62rem] font-black uppercase text-white/50">Disponibles</p>
                      <p className="mt-1 text-sm font-black uppercase text-kupan-flame">{tokens.remaining}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                      <p className="text-[0.62rem] font-black uppercase text-white/50">Vence</p>
                      <p className="mt-1 text-xs font-black uppercase text-white">{formatDate(activeMembership.end_date)}</p>
                    </div>
                  </div>
                  <details className="relative mt-4">
                    <summary className="k-button flex min-h-12 cursor-pointer list-none items-center justify-center rounded-xl px-4 text-sm font-black uppercase">
                      Gestionar plan
                    </summary>
                    <div className="mt-2 grid gap-2 rounded-xl border border-white/10 bg-black/30 p-2 sm:grid-cols-2">
                      <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Renovar plan de ${profile.full_name}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.requestAction('renew', activeMembership) }}>Renovar plan</button>
                      <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Ajustar tokens usados de ${profile.full_name}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.adjustTokens(activeMembership) }}>Ajustar tokens</button>
                      {activeMembership.status === 'paused' ? (
                        <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Reactivar plan de ${profile.full_name}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.requestAction('status', activeMembership, 'active') }}>Reactivar plan</button>
                      ) : (
                        <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Pausar plan de ${profile.full_name}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.requestAction('status', activeMembership, 'paused') }}>Congelar / pausar</button>
                      )}
                      <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Extender plan de ${profile.full_name} por 7 días`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.requestAction('extend', activeMembership) }}>Extender 7 días</button>
                      <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Editar plan de ${profile.full_name}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.startEdit(activeMembership) }}>Editar avanzado</button>
                      {activeMembership.status !== 'cancelled' ? (
                        <button type="button" className="rounded-lg border border-kupan-red/40 bg-kupan-red/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white" aria-label={`Cancelar plan de ${profile.full_name}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.requestAction('status', activeMembership, 'cancelled') }}>Cancelar plan</button>
                      ) : null}
                    </div>
                  </details>
                </>
              ) : (
                <button type="button" className="k-button mt-4 w-full" onClick={() => actions.prepareActivation(profile.id)}>
                  Activar plan
                </button>
              )}
            </article>
          )
        })}
        {profiles.length === 0 ? (
          <SmallRow title="Sin resultados" meta="Filtro activo" detail="No encontramos alumnos con esa busqueda o filtro." />
        ) : null}
      </div>

      <AdminMembershipActivationForm
        formRef={refs.activate}
        draft={draft}
        profiles={profiles}
        plans={plans}
        selectedMembershipPlan={selectedMembershipPlan}
        migrationTotalTokens={migrationTotalTokens}
        migrationUsedTokens={migrationUsedTokens}
        migrationAvailableTokens={migrationAvailableTokens}
        onDraftChange={actions.setDraft}
        onSubmit={actions.save}
        onSimulatePayment={actions.simulatePayment}
        addDays={addDays}
        getPlanTokenTotal={getPlanTokenTotal}
        isSavingActivation={isSavingActivation}
        isSimulatingPayment={isSimulatingPayment}
      />

      {editDraft.id ? (
        <AdminMembershipEditForm
          formRef={refs.edit}
          draft={editDraft}
          plans={plans}
          onDraftChange={actions.setEditDraft}
          onSubmit={actions.saveEdit}
          onClose={actions.closeEdit}
          addDays={addDays}
          getPlanTokenTotal={getPlanTokenTotal}
          isSubmitting={isSavingEdit}
        />
      ) : null}

      <div ref={refs.history} className="scroll-mt-28 outline-none" tabIndex={-1}>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Historial de membresias</p>
        <div className="space-y-3">
          {memberships.map((membership) => {
            const tokens = getMembershipTokens(membership)
            return (
              <SmallRow
                key={membership.id}
                title={`${membership.profile?.full_name ?? 'Alumno'} · ${membership.plan?.name ?? 'Plan'}`}
                meta={`${formatStatus(membership.status)} · pago ${formatStatus(membership.payment_status)} · vence ${formatDate(membership.end_date)}`}
                detail={`Inicio ${formatDate(membership.start_date)} · tokens ${tokens.used}/${tokens.total} · disponibles ${tokens.remaining}${membership.notes ? ` · ${membership.notes}` : ''}`}
                action={(
                  <details className="relative shrink-0">
                    <summary className="k-button-secondary flex min-h-11 cursor-pointer list-none items-center justify-center rounded-lg px-3 text-xs font-black uppercase">Gestionar</summary>
                    <div className="absolute right-0 top-full z-10 mt-2 grid w-48 gap-1 rounded-xl border border-white/10 bg-kupan-gray p-2 shadow-2xl">
                      <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Renovar plan de ${membership.profile?.full_name ?? 'alumno'}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.requestAction('renew', membership) }}>Renovar</button>
                      <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Ajustar tokens de ${membership.profile?.full_name ?? 'alumno'}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.adjustTokens(membership) }}>Ajustar tokens</button>
                      <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Extender plan de ${membership.profile?.full_name ?? 'alumno'}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.requestAction('extend', membership) }}>Extender 7 días</button>
                      <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Editar plan de ${membership.profile?.full_name ?? 'alumno'}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.startEdit(membership) }}>Editar avanzado</button>
                      {membership.status === 'active' ? (
                        <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Pausar plan de ${membership.profile?.full_name ?? 'alumno'}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.requestAction('status', membership, 'paused') }}>Pausar</button>
                      ) : (
                        <button type="button" className="k-button-secondary px-3 py-2 text-xs" aria-label={`Reactivar plan de ${membership.profile?.full_name ?? 'alumno'}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.requestAction('status', membership, 'active') }}>Reactivar</button>
                      )}
                      {membership.status !== 'cancelled' ? (
                        <button type="button" className="rounded-lg border border-kupan-red/40 bg-kupan-red/10 px-3 py-2 text-xs font-black uppercase text-white" aria-label={`Cancelar plan de ${membership.profile?.full_name ?? 'alumno'}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); actions.requestAction('status', membership, 'cancelled') }}>Cancelar</button>
                      ) : null}
                    </div>
                  </details>
                )}
              />
            )
          })}
        </div>
      </div>

      <div ref={refs.tokenMovements} className="scroll-mt-28 outline-none" tabIndex={-1}>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">Movimientos de tokens</p>
        <div className="space-y-3">
          {tokenMovements.map((movement) => (
            <SmallRow
              key={movement.id}
              title={`${movement.profile?.full_name ?? 'Alumno'} · ${movement.movement_type}`}
              meta={`${movement.quantity > 0 ? '+' : ''}${movement.quantity} token · ${new Date(movement.created_at).toLocaleString('es-CL')}`}
              detail={movement.reason ?? 'Movimiento registrado'}
            />
          ))}
        </div>
      </div>
    </AdminSection>
  )
}
