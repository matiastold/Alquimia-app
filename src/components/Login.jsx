import { useState } from 'react'
import { Mail, Lock, User, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

function LogoMark({ size = 42 }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="relative text-emerald-400">
        <path d="M16 4 L28 26 H4 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <rect x="12.5" y="16.5" width="7" height="7" transform="rotate(45 16 20)" fill="currentColor" />
      </svg>
    </div>
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
      className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-8 relative overflow-hidden"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 2rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
      }}
    >
      {/* Luz ambiental de fondo */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm z-10 space-y-6">
        {/* LOGO Y MARCA */}
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <LogoMark />
          <div>
            <h1 className="font-bold text-2xl tracking-widest uppercase text-slate-100 font-mono">
              ALQUIMIA
            </h1>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Sistema de Gestión & Ventas
            </p>
          </div>
        </div>

        {/* TARJETA GLASSMORPHISM */}
        <div className="bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  )

  if (modoRecuperar) {
    return (
      <Wrapper>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-100 text-center">
            Recuperar Contraseña
          </h2>

          {exitoRecuperar ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-medium flex items-start gap-2.5">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>
                  Te enviamos un email con un enlace para restablecer tu contraseña. Revisa tu
                  bandeja de entrada o spam.
                </span>
              </div>
              <button
                onClick={() => {
                  setModoRecuperar(false)
                  setExitoRecuperar(false)
                }}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition-all text-xs active:scale-95"
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleRecuperar} className="space-y-4">
              <p className="text-xs text-slate-400 text-center">
                Ingresa tu email y te enviaremos las instrucciones para restablecer tu cuenta.
              </p>

              <div>
                <label htmlFor="email-recuperar" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    id="email-recuperar"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="ejemplo@correo.com"
                    className="w-full bg-slate-950/60 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-xs active:scale-95 mt-2"
              >
                {cargando ? 'Enviando enlace...' : 'Enviar enlace'}
              </button>

              <button
                type="button"
                onClick={() => setModoRecuperar(false)}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} /> Volver al login
              </button>
            </form>
          )}
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <div className="space-y-5">
        <h2 className="text-lg font-bold text-slate-100 text-center">
          {modoRegistro ? 'Crear una cuenta' : 'Iniciar Sesión'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {modoRegistro && (
            <div>
              <label htmlFor="nombre" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre Completo
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  placeholder="Tu nombre"
                  className="w-full bg-slate-950/60 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="usuario@correo.com"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300">
                Contraseña
              </label>
              {!modoRegistro && (
                <button
                  type="button"
                  onClick={() => setModoRecuperar(true)}
                  className="text-[11px] text-emerald-400 hover:underline font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-xs active:scale-95 pt-3.5"
          >
            {cargando
              ? 'Procesando...'
              : modoRegistro
              ? 'Crear Mi Cuenta'
              : 'Iniciar Sesión'}
          </button>

          <div className="pt-2 text-center">
            <p className="text-xs text-slate-400">
              {modoRegistro ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => setModoRegistro(!modoRegistro)}
                className="text-emerald-400 font-bold hover:underline"
              >
                {modoRegistro ? 'Ingresar' : 'Registrarte'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </Wrapper>
  )
}