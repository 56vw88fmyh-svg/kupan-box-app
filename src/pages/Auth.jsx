import { useState } from 'react'
import { ArrowRightIcon, EnvelopeSimpleIcon, EyeIcon, EyeSlashIcon, LockKeyIcon } from '@phosphor-icons/react'
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
  const [showPassword, setShowPassword] = useState(false)
  const isRegister = authMode === 'register'
  const isLongForm = isRegister || isRecoveryOpen
  const heading = isRecoveryOpen
    ? 'Recupera tu acceso'
    : isRegister
      ? 'Crea tu cuenta'
      : `Bienvenido a ${gymConfig.identity.name}`
  const description = isRecoveryOpen
    ? 'Te enviaremos un enlace seguro para crear una nueva contraseña.'
    : isRegister
      ? `Súmate a ${gymConfig.identity.name} y comienza a entrenar con tu comunidad.`
      : 'Inicia sesión para reservar tu próxima clase.'
  const ceremonialSlogan = gymConfig.id === 'kupan'
    ? 'Fuerza · Raíces · Espíritu'
    : gymConfig.identity.slogan

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
    setShowPassword(false)
  }

  function openRecovery() {
    setIsRecoveryOpen(true)
    setMessage('')
    setMessageType('error')
    setCanRetry(false)
    setShowPassword(false)
  }

  function closeRecovery() {
    setIsRecoveryOpen(false)
    setMessage('')
    setMessageType('error')
    setCanRetry(false)
    setShowPassword(false)
  }

  return (
    <div className={`k-auth-screen ${gymConfig.id === 'kupan' ? 'k-auth-screen--kupan' : ''} ${isLongForm ? 'k-auth-screen--expanded' : ''}`}>
      <div className="k-auth-content">
        <header className="k-auth-brand">
          <img
            className={gymConfig.id === 'fittest' ? 'k-auth-logo k-auth-logo--round' : 'k-auth-logo'}
            src={gymConfig.assets.logo}
            alt={`${gymConfig.identity.name} · ${gymConfig.identity.slogan}`}
            width="900"
            height="705"
            decoding="async"
          />
          <p>{ceremonialSlogan}</p>
        </header>

        <section className="k-auth-form-section" aria-labelledby="auth-title">
          <div className="k-auth-intro">
            <h1 id="auth-title" className="k-display">{heading}</h1>
            <p>{description}</p>
          </div>

          <form className="k-auth-form" onSubmit={handleSubmit}>
          {isRegister && !isRecoveryOpen ? (
            <>
              <AuthField label="Nombre completo" value={name} onChange={setName} autoComplete="name" placeholder="Tu nombre" required />
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
              <div className="k-auth-level" aria-label="Nivel inicial">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-kupan-sand">Nivel inicial</p>
                <p className="mt-2 text-lg font-black text-white">Estoy comenzando</p>
                <p className="mt-1 text-sm leading-6 text-white/65">
                  Tu coach evaluará contigo la escala técnica adecuada durante tus primeras clases.
                </p>
              </div>
              <AuthField label="Teléfono opcional" type="tel" value={phone} onChange={setPhone} autoComplete="tel" placeholder="+56 9..." />
            </>
          ) : null}
          <AuthField
            autoComplete="email"
            icon={<EnvelopeSimpleIcon size={21} weight="regular" />}
            label="Correo electrónico"
            onChange={setEmail}
            placeholder="tu@correo.com"
            required
            type="email"
            value={email}
          />
          {!isRecoveryOpen ? (
            <AuthField
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              endAdornment={(
                <button
                  type="button"
                  className="k-auth-password-toggle"
                  aria-label={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeSlashIcon size={22} weight="regular" /> : <EyeIcon size={22} weight="regular" />}
                </button>
              )}
              icon={<LockKeyIcon size={21} weight="regular" />}
              label="Contraseña"
              onChange={setPassword}
              placeholder="Tu contraseña"
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
            />
          ) : null}

          {!isRegister && !isRecoveryOpen ? (
            <button
              type="button"
              className="k-auth-recovery"
              onClick={openRecovery}
            >
              ¿Olvidaste tu contraseña?
            </button>
          ) : null}

          {message ? (
            <p role={messageType === 'success' ? 'status' : 'alert'} className={`rounded-lg border p-3 text-sm font-bold text-white ${
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

          <Button className="k-auth-primary w-full" isLoading={isSubmitting} loadingLabel="Conectando" type="submit">
            {isRecoveryOpen ? 'Enviar enlace de recuperación' : isRegister ? 'Crear cuenta' : (
              <span className="inline-flex items-center gap-3">
                Iniciar sesión
                <ArrowRightIcon size={20} weight="bold" aria-hidden="true" />
              </span>
            )}
          </Button>

          {isRecoveryOpen ? (
            <Button className="k-auth-secondary w-full" disabled={isSubmitting} type="button" variant="secondary" onClick={closeRecovery}>
              Volver al inicio de sesión
            </Button>
          ) : null}
          </form>

          {!isRecoveryOpen ? <div className="k-auth-account-switch">
            <div className="k-auth-divider" aria-hidden="true" />
            <p>{isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}</p>
            <div className="k-auth-divider" aria-hidden="true" />
            <Button
              className="k-auth-secondary col-span-3 w-full"
              variant="secondary"
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
            >
              {isRegister ? 'Iniciar sesión' : 'Registrarse'}
            </Button>
          </div> : null}
        </section>
      </div>
    </div>
  )
}
