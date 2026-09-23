import { Button, Dialog } from '../ui/index.js'

function SummaryItem({ label, value, accent = false }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className={`mt-1 text-sm font-black leading-5 ${accent ? 'text-kupan-flame' : 'text-white'}`}>{value}</p>
    </div>
  )
}

export function AdminMembershipActionDialog({ action, isSaving, onClose, onConfirm }) {
  return (
    <Dialog
      description={action?.description}
      isDestructive={Boolean(action?.destructive)}
      isOpen={Boolean(action)}
      onClose={isSaving ? undefined : onClose}
      title={action?.title ?? 'Revisar plan'}
    >
      {action ? (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryItem label="Alumno" value={action.studentName} />
            <SummaryItem label="Plan" value={action.planName} />
            <SummaryItem label="Desde" value={action.startDateLabel} />
            <SummaryItem label="Hasta" value={action.endDateLabel} />
          </div>

          <div className="rounded-xl border border-kupan-ember/30 bg-kupan-ember/10 p-4">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-kupan-flame">Tokens del ciclo</p>
            <p className="mt-2 text-sm font-black leading-6 text-white">{action.tokenSummary}</p>
          </div>

          {action.warning ? (
            <p className={`rounded-xl border p-3 text-sm font-bold leading-6 ${action.destructive ? 'border-kupan-red/40 bg-kupan-red/10 text-white' : 'border-kupan-warning/35 bg-kupan-warning/10 text-white/80'}`}>
              {action.warning}
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button fullWidth disabled={isSaving} variant="secondary" onClick={onClose}>Volver</Button>
            <Button fullWidth isLoading={isSaving} loadingLabel="Guardando" variant={action.destructive ? 'destructive' : 'primary'} onClick={onConfirm}>
              {action.confirmLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  )
}
