import { useState } from 'react'

function AuthField({ label, type = 'text', value, onChange, autoComplete }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-white/60">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-kupan-ember"
        type={type}
        value={value}
        autoComplete={autoComplete}
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
  const [message, setMessage] = useState('')
  const isRegister = authMode === 'register'

  function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    const result = isRegister
      ? onRegister({ name, email, password })
      : onLogin({ email, password })

    if (!result.ok) {
      setMessage(result.message)
    }
  }

  function switchMode(nextMode) {
    setAuthMode(nextMode)
    setMessage('')
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
            Tu sesión se guarda en este dispositivo por ahora. Somos comunidad, esfuerzo y progreso.
          </p>
        </div>

        <form className="space-y-4 p-5" onSubmit={handleSubmit}>
          {isRegister ? (
            <AuthField label="Nombre" value={name} onChange={setName} autoComplete="name" />
          ) : null}
          <AuthField label="Correo" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <AuthField label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete={isRegister ? 'new-password' : 'current-password'} />

          {message ? <p className="rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-sm font-bold text-white">{message}</p> : null}

          <button type="submit" className="k-button w-full">
            {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
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
