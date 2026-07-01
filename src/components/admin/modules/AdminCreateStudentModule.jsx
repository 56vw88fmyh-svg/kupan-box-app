import { AdminCreateStudentForm } from '../forms/AdminCreateStudentForm.jsx'
import { AdminSection } from '../AdminUi.jsx'

export function AdminCreateStudentModule({
  formRef,
  draft,
  plans,
  createdCredentials,
  isCreating,
  onDraftChange,
  onSubmit,
  onCopyCredentials,
  getWhatsAppUrl,
  addDays,
}) {
  return (
    <div ref={formRef} className="scroll-mt-28">
      <AdminSection eyebrow="Crear alumno" title="Nuevo atleta KUPAN">
        <AdminCreateStudentForm
          draft={draft}
          plans={plans}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
          addDays={addDays}
          isSubmitting={isCreating}
        />

        {createdCredentials ? (
          <div className="k-panel space-y-4 border-kupan-ember/40 bg-kupan-ember/10 p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Credenciales temporales</p>
              <h3 className="mt-2 text-2xl font-black uppercase text-white">Mostrar una sola vez</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">Guarda o envia estos datos ahora. La contraseña no queda visible en la app.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="text-sm font-black text-white">Correo: {createdCredentials.email}</p>
              <p className="mt-2 text-sm font-black text-white">Clave temporal: {createdCredentials.password}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" className="k-button-secondary" onClick={onCopyCredentials}>Copiar credenciales</button>
              {createdCredentials.phone ? (
                <a className="k-button text-center" href={getWhatsAppUrl(createdCredentials.phone, createdCredentials)} target="_blank" rel="noreferrer">
                  Enviar por WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </AdminSection>
    </div>
  )
}
