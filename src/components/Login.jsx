import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="text-sage">
      <path d="M16 4 L28 26 H4 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="12.5" y="16.5" width="7" height="7" transform="rotate(45 16 20)" fill="currentColor" />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [modoRegistro, setModoRegistro] = useState(false)
  const [modoRecuperar, setModoRecuperar] = useState(false)
  const [error, setError] = useState('')
  const [exitoRecuperar, setExitoRecuperar] = useState(false)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    if (modoRegistro) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setCargando(false)
  }

  const handleRecuperar = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    if (error) setError(error.message)
    else setExitoRecuperar(true)

    setCargando(false)
  }

  const Wrapper = ({ children }) => (
    <div
      className="min-h-screen flex items-center justify-center bg-void px-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="relative flex flex-col items-center mb-8">
          <div className="absolute w-24 h-24 bg-sage/10 rounded-full blur-2xl" />
          <div className="relative flex flex-col items-center gap-2">
            <LogoMark />
            <span className="font-display text-xl tracking-widest uppercase text-cream">
              Alquimia
            </span>
          </div>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </div>
  )

  if (modoRecuperar) {
    return (
      <Wrapper>
        <h1 className="font-display text-xl mb-2 text-center text-cream/90">
          Recuperar contraseña
        </h1>

        {exitoRecuperar ? (
          <>
            <p className="text-success text-sm text-center mb-6">
              Te enviamos un email con un link para elegir una nueva contraseña. Revisá tu
              bandeja de entrada (y spam).
            </p>
            <button
              onClick={() => {
                setModoRecuperar(false)
                setExitoRecuperar(false)
              }}
              className="btn-primary w-full"
            >
              Volver al login
            </button>
          </>
        ) : (
          <form onSubmit={handleRecuperar}>
            <p className="text-cream/50 text-sm text-center mb-6">
              Ingresá tu email y te mandamos un link para elegir una nueva contraseña.
            </p>
            <div className="mb-6">
              <label htmlFor="email-recuperar" className="label-field">Email</label>
              <input
                id="email-recuperar"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
              />
            </div>

            {error && <p className="text-ember text-sm mb-4">{error}</p>}

            <button type="submit" disabled={cargando} className="btn-primary w-full disabled:opacity-50">
              {cargando ? 'Enviando...' : 'Enviar link'}
            </button>

            <button
              type="button"
              onClick={() => setModoRecuperar(false)}
              className="text-sm text-center mt-4 text-sage font-medium w-full min-h-11"
            >
              Volver al login
            </button>
          </form>
        )}
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <h1 className="font-display text-xl mb-6 text-center text-cream/90">
        {modoRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
      </h1>

      <form onSubmit={handleSubmit}>
        {modoRegistro && (
          <div className="mb-4">
            <label htmlFor="nombre" className="label-field">Nombre</label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="input-field"
            />
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="label-field">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
          />
        </div>

        <div className="mb-2">
          <label htmlFor="password" className="label-field">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="input-field"
          />
        </div>

        {!modoRegistro ? (
          <div className="text-right mb-4">
            <button
              type="button"
              onClick={() => setModoRecuperar(true)}
              className="text-sm text-sage min-h-11 px-1"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        ) : (
          <div className="mb-4" />
        )}

        {error && <p className="text-ember text-sm mb-4">{error}</p>}

        <button type="submit" disabled={cargando} className="btn-primary w-full disabled:opacity-50">
          {cargando ? 'Cargando...' : modoRegistro ? 'Registrarme' : 'Entrar'}
        </button>

        <p className="text-sm text-center mt-4 text-cream/50">
          {modoRegistro ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}{' '}
          <button
            type="button"
            onClick={() => setModoRegistro(!modoRegistro)}
            className="text-sage font-medium"
          >
            {modoRegistro ? 'Iniciar sesión' : 'Registrarme'}
          </button>
        </p>
      </form>
    </Wrapper>
  )
}