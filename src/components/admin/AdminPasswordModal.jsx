import { useEffect, useMemo, useState } from 'react'
import { Button, Dialog, Input } from '../ui/index.js'
import { assignTemporaryPassword, sendStudentRecoveryEmail } from '../../utils/adminPassword.js'
import { generateTemporaryPassword, passwordRequirements, validateSecurePassword } from '../../utils/passwordSecurity.js'

function formatAccessDate(value) {
  if (!value) return 'No disponible'
  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Santiago',
    }).format(new Date(value))
  } catch {
    return 'No disponible'
  }
}

export function AdminPasswordModal({ isOpen, student, onClose, onSuccess }) {
  const [mode, setMode] = useState('options')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [errors, setErrors] = useState({})
  const [resultPassword, setResultPassword] = useState('')

  const studentName = student?.full_name ?? 'Alumno KUPAN'
  const studentEmail = student?.email ?? ''
  const lastAccess = useMemo(() => formatAccessDate(student?.last_sign_in_at ?? student?.last_login_at), [student])

  useEffect(() => {
    if (!isOpen) {
      setMode('options')
      setTemporaryPassword('')
      setConfirmation('')
      setShowPassword(false)
      setMessage('')
      setMessageType('error')
      setErrors({})
      setResultPassword('')
    }
  }, [isOpen])

  function closeModal() {
    if (isSubmitting) return
    onClose?.()
  }

  async function handleRecoveryEmail() {
    if (!student || isSubmitting) return
    const confirmed = window.confirm(`¿Enviar correo de recuperación a ${studentEmail}?`)
    if (!confirmed) return

    setIsSubmitting(true)
    setMessage('Enviando correo...')
    setMessageType('success')
    try {
      const result = await sendStudentRecoveryEmail(student)
      setMessage(result.message)
      setMessageType(result.ok ? 'success' : 'error')
      if (result.ok) onSuccess?.()
    } catch {
      setMessage('No pudimos enviar el correo de recuperación. Revisa la conexión e intenta nuevamente.')
      setMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function generatePassword() {
    const nextPassword = generateTemporaryPassword()
    setTemporaryPassword(nextPassword)
    setConfirmation(nextPassword)
    setErrors({})
    setResultPassword('')
  }

  async function copyPassword(password = temporaryPassword) {
    if (!password) return
    await navigator.clipboard?.writeText(password)
    setMessage('Contraseña copiada al portapapeles.')
    setMessageType('success')
  }

  async function handleTemporaryPassword(event) {
    event.preventDefault()
    if (!student || isSubmitting) return

    const validation = validateSecurePassword(temporaryPassword, confirmation, studentEmail, { requireSymbol: true })
    setErrors(validation.errors)
    if (!validation.ok) return

    const confirmed = window.confirm(`Estás a punto de reemplazar la contraseña de acceso de ${studentName}. La contraseña anterior dejará de funcionar inmediatamente.`)
    if (!confirmed) return

    setIsSubmitting(true)
    setMessage('')
    try {
      const result = await assignTemporaryPassword(student, temporaryPassword)

      if (!result.ok) {
        setMessage(result.message)
        setMessageType('error')
        return
      }

      setResultPassword(temporaryPassword)
      setMessage(result.message)
      setMessageType('success')
      onSuccess?.()
    } catch {
      setMessage('No pudimos completar la gestión de contraseña. Intenta nuevamente.')
      setMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      className="max-h-[min(88dvh,760px)] sm:max-w-2xl"
      closeLabel="Cerrar gestión de contraseña"
      description="Acción exclusiva para administradores activos."
      isDestructive={isSubmitting}
      isOpen={isOpen}
      title="Gestionar contraseña"
      onClose={closeModal}
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-kupan-flame">Alumno</p>
          <h3 className="mt-2 text-xl font-black uppercase text-white">{studentName}</h3>
          <dl className="mt-3 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
            <div><dt className="font-black uppercase text-white/45">Correo</dt><dd className="break-all">{studentEmail || 'Sin correo'}</dd></div>
            <div><dt className="font-black uppercase text-white/45">Estado</dt><dd>{student?.status ?? 'Sin estado'}</dd></div>
            <div><dt className="font-black uppercase text-white/45">Último acceso</dt><dd>{lastAccess}</dd></div>
          </dl>
          <p className="mt-4 rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-sm font-bold leading-5 text-orange-100">
            Las contraseñas actuales nunca pueden visualizarse. Solo puedes enviar recuperación o reemplazarla por una temporal.
          </p>
        </div>

        {mode === 'options' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" disabled={isSubmitting || !studentEmail} isLoading={isSubmitting} onClick={handleRecoveryEmail}>
              Enviar correo de recuperación
            </Button>
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => setMode('temporary')}>
              Asignar contraseña temporal
            </Button>
          </div>
        ) : null}

        {mode === 'temporary' ? (
          <form className="space-y-4" onSubmit={handleTemporaryPassword}>
            <Input
              autoComplete="new-password"
              disabled={isSubmitting}
              error={errors.password}
              label="Nueva contraseña temporal"
              type={showPassword ? 'text' : 'password'}
              value={temporaryPassword}
              required
              onChange={(event) => setTemporaryPassword(event.target.value)}
            />
            <Input
              autoComplete="new-password"
              disabled={isSubmitting}
              error={errors.confirmation}
              label="Confirmar contraseña temporal"
              type={showPassword ? 'text' : 'password'}
              value={confirmation}
              required
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </Button>
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={generatePassword}>
                Generar segura
              </Button>
              <Button type="button" variant="secondary" disabled={!temporaryPassword || isSubmitting} onClick={() => copyPassword()}>
                Copiar contraseña
              </Button>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm font-semibold leading-5 text-white/70">
              {passwordRequirements.map((item) => <p key={item}>• {item}</p>)}
              <p>• Para temporal, se recomienda incluir al menos un símbolo.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                Asignar contraseña
              </Button>
              <Button type="button" variant="tertiary" disabled={isSubmitting} onClick={() => setMode('options')}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}

        {resultPassword ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <p className="text-sm font-black uppercase text-emerald-100">Contraseña temporal visible solo mientras este modal esté abierto</p>
            <p className="mt-2 break-all rounded-lg bg-black/35 p-3 font-mono text-lg font-black text-white">{resultPassword}</p>
            <Button className="mt-3" type="button" variant="secondary" onClick={() => copyPassword(resultPassword)}>
              Copiar contraseña temporal
            </Button>
          </div>
        ) : null}

        {message ? (
          <p className={`rounded-xl border p-3 text-sm font-bold ${
            messageType === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
              : 'border-kupan-flame/40 bg-kupan-flame/10 text-orange-100'
          }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
