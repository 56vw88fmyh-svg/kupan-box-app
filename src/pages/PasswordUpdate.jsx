import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '../components/ui/index.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { getPasswordErrorMessage, passwordRequirements, validateSecurePassword } from '../utils/passwordSecurity.js'

function RequirementList() {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-kupan-flame">Requisitos mínimos</p>
      <ul className="mt-3 space-y-2 text-sm font-semibold leading-5 text-white/70">
        {passwordRequirements.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  )
}

export function PasswordUpdate({ currentUser, forced = false, onUserUpdate }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [sessionEmail, setSessionEmail] = useState(currentUser?.email ?? '')

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setMessage('El servicio de acceso aún no está configurado.')
          setMessageType('error')
          setIsCheckingSession(false)
        }
        return
      }

      const { data, error } = await supabase.auth.getUser()
      if (!isMounted) return

      if (error || !data?.user) {
        setMessage(forced ? 'Inicia sesión para cambiar tu contraseña.' : 'El enlace venció o no es válido. Solicita uno nuevo.')
        setMessageType('error')
      } else {
        setSessionEmail(data.user.email ?? currentUser?.email ?? '')
      }

      setIsCheckingSession(false)
    }

    loadSession()
    return () => {
      isMounted = false
    }
  }, [currentUser?.email, forced])

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setMessageType('error')

    const validation = validateSecurePassword(password, confirmation, sessionEmail)
    setErrors(validation.errors)
    if (!validation.ok) return

    setIsSubmitting(true)
    const { data: userData } = await supabase.auth.getUser()
    const metadata = userData?.user?.user_metadata ?? {}
    const payload = forced
      ? { password, data: { ...metadata, force_password_change: false } }
      : { password }
    const { data, error } = await supabase.auth.updateUser(payload)
    setIsSubmitting(false)

    if (error) {
      setMessage(getPasswordErrorMessage(error))
      setMessageType('error')
      return
    }

    const { data: refreshedSession } = await supabase.auth.refreshSession()
    const refreshedUser = refreshedSession?.user ?? data?.user

    setPassword('')
    setConfirmation('')
    setMessage(forced ? 'Tu contraseña fue actualizada correctamente.' : 'Contraseña actualizada correctamente.')
    setMessageType('success')
    onUserUpdate?.((current) => current ? {
      ...current,
      email: refreshedUser?.email ?? current.email,
      forcePasswordChange: refreshedUser?.user_metadata?.force_password_change === true,
    } : current)

    window.setTimeout(() => {
      if (forced) {
        navigate('/perfil', { replace: true })
      } else {
        supabase.auth.signOut().finally(() => navigate('/login', { replace: true }))
      }
    }, 900)

    return data
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-24">
      <Card variant="elevated" className="p-5">
        <p className="k-pill inline-flex text-kupan-flame">{forced ? 'Cambio obligatorio' : 'Recuperación segura'}</p>
        <h1 className="mt-4 text-3xl font-black uppercase leading-tight text-white">
          {forced ? 'Crea una nueva contraseña para seguir.' : 'Crea tu nueva contraseña KUPAN.'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          {forced
            ? 'Por seguridad, tu contraseña temporal debe ser reemplazada antes de usar la app.'
            : 'Usa una contraseña segura. Al finalizar podrás volver al inicio de sesión.'}
        </p>
      </Card>

      <Card variant="standard" className="p-5">
        {isCheckingSession ? (
          <p className="text-sm font-bold text-white/70">Validando enlace seguro...</p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            autoComplete="new-password"
            disabled={isSubmitting}
            error={errors.password}
            label="Nueva contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            autoComplete="new-password"
            disabled={isSubmitting}
            error={errors.confirmation}
            label="Confirmar contraseña"
            type={showPassword ? 'text' : 'password'}
            value={confirmation}
            required
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <Button type="button" variant="secondary" className="w-full" onClick={() => setShowPassword((current) => !current)}>
            {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          </Button>
          <RequirementList />

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

          <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={isCheckingSession || isSubmitting}>
            Guardar nueva contraseña
          </Button>
          {!forced ? (
            <Button type="button" variant="tertiary" className="w-full" onClick={() => navigate('/login')}>
              Volver al login
            </Button>
          ) : null}
        </form>
      </Card>
    </div>
  )
}
