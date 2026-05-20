import { useState } from 'react'
import { athleteLevels } from '../utils/auth.js'

function AuthField({ label, type = 'text', value, onChange, autoComplete, required = false }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-kupan-ember"
        type={type}
        value={value}
        autoComplete={autoComplete}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function Auth({ mode = 'login', onLogin, onRegister }) {
  const [authMode, setAuthMode] = useState(mode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [level, setLevel] = useState('Iniciado')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegister = authMode === 'register'

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setMessageType('error')
    setIsSubmitting(true)

    const result = isRegister
      ? await onRegister({ name, email, password, birthDate, level, phone })
      : await onLogin({ email, password })

    setIsSubmitting(false)

    if (result?.message) {
      setMessage(result.message)
      setMessageType(result.ok ? 'success' : 'error')
    }
  }

  function switchMode(nextMode) {
    setAuthMode(nextMode)
    setMessage('')
    setMessageType('error')
  }

  return (
    <div className="space-y-6">
      <section className="k-card overflow-hidden p-0">
        <div className="border-b border-white/10 bg-black/25 p-5">
          <p className="k-pill inline-flex text-kupan-flame">{isRegister ? 'Súmate a KUPAN' : 'Acceso KUPAN'}</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">
            {isRegister ? 'Crea tu cuenta y ven a entrenar.' : 'Entra a tu cuenta y reserva tu clase.'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Tu sesión queda guardada de forma segura con Supabase. Somos comunidad, esfuerzo y progreso.
          </p>
        </div>

        <form className="space-y-4 p-5" onSubmit={handleSubmit}>
          {isRegister ? (
            <>
              <AuthField label="Nombre completo" value={name} onChange={setName} autoComplete="name" required />
              <AuthField label="Fecha de nacimiento" type="date" value={birthDate} onChange={setBirthDate} required />
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Nivel</span>
                <select
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-kupan-ember"
                  value={level}
                  required
                  onChange={(event) => setLevel(event.target.value)}
                >
                  {athleteLevels.map((levelOption) => (
                    <option key={levelOption} className="bg-kupan-black text-white" value={levelOption}>
                      {levelOption}
                    </option>
                  ))}
                </select>
              </label>
              <AuthField label="Teléfono opcional" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
            </>
          ) : null}
          <AuthField label="Correo" type="email" value={email} onChange={setEmail} autoComplete="email" required />
          <AuthField label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete={isRegister ? 'new-password' : 'current-password'} required />

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

          <button type="submit" className="k-button w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Conectando...' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>
      </section>

      <section className="k-panel p-4 text-center">
        <p className="text-sm font-semibold text-white/60">
          {isRegister ? '¿Ya tienes cuenta?' : '¿Primera vez en la app?'}
        </p>
        <button
          type="button"
          className="k-button-secondary mt-3 w-full"
          onClick={() => switchMode(isRegister ? 'login' : 'register')}
        >
          {isRegister ? 'Ir a login' : 'Registrarme'}
        </button>
      </section>
    </div>
  )
}
