import { useState } from 'react'
import { Button, Input } from '../components/ui/index.js'
import { requestPasswordRecovery } from '../utils/auth.js'
import { gymConfig } from '../config/gymConfig.js'

/* global console */

function AuthField({ label, type = 'text', value, onChange, autoComplete, required = false, ...props }) {
  return (
    <Input
      autoComplete={autoComplete}
      label={label}
      required={required}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...props}
    />
  )
}

export function Auth({ mode = 'login', onLogin, onRegister }) {
  const [authMode, setAuthMode] = useState(mode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false)
  const [canRetry, setCanRetry] = useState(false)
  const isRegister = authMode === 'register'

  async function submitAuth() {
    setMessage('')
    setMessageType('error')
    setCanRetry(false)
    setIsSubmitting(true)

    try {
      const result = isRecoveryOpen
        ? await requestPasswordRecovery(email)
        : isRegister
          ? await onRegister({ name, email, password, birthDate, level: 'Iniciado', phone })
          : await onLogin({ email, password })

      if (result?.message) {
        setMessage(result.message)
        setMessageType(result.ok ? 'success' : 'error')
        setCanRetry(Boolean(result.retryable))
      }
    } catch {
      console.error(`${gymConfig.identity.name} no pudo completar una solicitud de acceso.`)
      setMessage('No pudimos completar el acceso. Revisa tu conexión y vuelve a intentarlo.')
      setCanRetry(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await submitAuth()
  }

  function switchMode(nextMode) {
    setAuthMode(nextMode)
    setMessage('')
    setMessageType('error')
    setCanRetry(false)
    setIsRecoveryOpen(false)
  }

  function openRecovery() {
    setIsRecoveryOpen(true)
    setMessage('')
    setMessageType('error')
    setCanRetry(false)
  }

  function closeRecovery() {
    setIsRecoveryOpen(false)
    setMessage('')
    setMessageType('error')
    setCanRetry(false)
  }

  return (
    <div className="space-y-6">
      <section className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">{isRecoveryOpen ? 'Recupera tu acceso' : isRegister ? `Súmate a ${gymConfig.identity.name}` : `Acceso ${gymConfig.identity.name}`}</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">
            {isRecoveryOpen ? 'Vuelve a entrenar con tu cuenta.' : isRegister ? 'Crea tu cuenta y ven a entrenar.' : 'Entra a tu cuenta y reserva tu clase.'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            {isRecoveryOpen
              ? 'Te enviaremos un enlace seguro para crear una nueva contraseña.'
              : 'Tu sesión y tus datos se guardan de forma segura. Somos comunidad, esfuerzo y progreso.'}
          </p>
        </div>

        <form className="space-y-4 p-5" onSubmit={handleSubmit}>
          {isRegister && !isRecoveryOpen ? (
            <>
              <AuthField label="Nombre completo" value={name} onChange={setName} autoComplete="name" required />
              <AuthField
                autoComplete="bday"
                helpText="Puedes escribir la fecha o elegirla desde el calendario."
                label="Fecha de nacimiento"
                max={new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())}
                min="1900-01-01"
                type="date"
                value={birthDate}
                onChange={setBirthDate}
                required
              />
              <div className="rounded-xl border border-kupan-leaf/35 bg-kupan-leaf/10 p-4" aria-label="Nivel inicial">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-kupan-sand">Nivel inicial</p>
                <p className="mt-2 text-lg font-black text-white">Estoy comenzando</p>
                <p className="mt-1 text-sm leading-6 text-white/65">
                  Tu coach evaluará contigo la escala técnica adecuada durante tus primeras clases.
                </p>
              </div>
              <AuthField label="Teléfono opcional" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
            </>
          ) : null}
          <AuthField label="Correo" type="email" value={email} onChange={setEmail} autoComplete="email" required />
          {!isRecoveryOpen ? (
            <AuthField label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete={isRegister ? 'new-password' : 'current-password'} required />
          ) : null}

          {!isRegister && !isRecoveryOpen ? (
            <button
              type="button"
              className="min-h-11 w-full text-left text-sm font-black text-kupan-flame underline decoration-kupan-flame/40 underline-offset-4 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kupan-flame"
              onClick={openRecovery}
            >
              Olvidé mi contraseña
            </button>
          ) : null}

          {message ? (
            <p className={`rounded-lg border p-3 text-sm font-bold text-white ${
              messageType === 'success'
                ? 'border-emerald-400/30 bg-emerald-400/10'
                : 'border-kupan-flame/30 bg-kupan-flame/10'
            }`}
            >
              {message}
            </p>
          ) : null}

          {canRetry ? (
            <Button className="w-full" disabled={isSubmitting} type="button" variant="secondary" onClick={submitAuth}>
              Reintentar
            </Button>
          ) : null}

          <Button className="w-full" isLoading={isSubmitting} loadingLabel="Conectando" type="submit">
            {isRecoveryOpen ? 'Enviar enlace de recuperación' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
          </Button>

          {isRecoveryOpen ? (
            <Button className="w-full" disabled={isSubmitting} type="button" variant="secondary" onClick={closeRecovery}>
              Volver al inicio de sesión
            </Button>
          ) : null}
        </form>
      </section>

      {!isRecoveryOpen ? <section className="k-panel p-4 text-center">
        <p className="text-sm font-semibold text-white/60">
          {isRegister ? '¿Ya tienes cuenta?' : '¿Primera vez en la app?'}
        </p>
        <Button
          className="mt-3 w-full"
          variant="secondary"
          onClick={() => switchMode(isRegister ? 'login' : 'register')}
        >
          {isRegister ? 'Ir a login' : 'Registrarme'}
        </Button>
      </section> : null}
    </div>
  )
}
