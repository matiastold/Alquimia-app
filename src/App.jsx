import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import Stock from './components/Stock'
import Ventas from './components/Ventas'
import HistorialVentas from './components/HistorialVentas'
import Turnos from './components/Turnos'
import TurnoFantasma from './components/TurnoFantasma'
import Libreta from './components/Libreta'
import Reportes from './components/Reportes'
import Notificaciones from './components/Notificaciones'
import CambiarPassword from './components/CambiarPassword'
import BottomNav from './components/BottomNav'
import MasSheet from './components/MasSheet'

function LogoMark({ size = 26 }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full" />
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="relative text-emerald-400">
        <path d="M16 4 L28 26 H4 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <rect x="12.5" y="16.5" width="7" height="7" transform="rotate(45 16 20)" fill="currentColor" />
      </svg>
    </div>
  )
}

const SECCIONES_PRINCIPALES = ['stock', 'ventas', 'turnos', 'libreta', 'reportes']

function App() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState('stock')
  const [masAbierto, setMasAbierto] = useState(false)
  const [mostrarCambiarPassword, setMostrarCambiarPassword] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCargando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (_event === 'PASSWORD_RECOVERY') {
        setMostrarCambiarPassword(true)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 gap-3">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
        <p className="font-mono text-xs text-slate-400 font-bold uppercase tracking-widest">
          Cargando Alquimia...
        </p>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  const masActivo = !SECCIONES_PRINCIPALES.includes(vista)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300 antialiased">
      {/* HEADER SUPERIOR */}
      <header
        className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-mono text-base font-extrabold tracking-widest uppercase text-slate-100">
              ALQUIMIA
            </span>
          </div>
          <Notificaciones />
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-2xl mx-auto px-4 py-5 pb-28">
        {vista === 'stock' && <Stock />}
        {vista === 'ventas' && <Ventas />}
        {vista === 'historial_ventas' && <HistorialVentas />}
        {vista === 'turnos' && <Turnos />}
        {vista === 'libreta' && <Libreta />}
        {vista === 'reportes' && <Reportes />}
        {vista === 'fantasma' && <TurnoFantasma />}
      </main>

      {/* NAVEGACIÓN INFERIOR */}
      <BottomNav
        vista={vista}
        setVista={setVista}
        onAbrirMas={() => setMasAbierto(true)}
        masActivo={masActivo}
      />

      {/* MODAL MÁS OPCIONES */}
      {masAbierto && (
        <MasSheet
          onCerrar={() => setMasAbierto(false)}
          onIrAHistorialVentas={() => {
            setVista('historial_ventas')
            setMasAbierto(false)
          }}
          onIrATurnoFantasma={() => {
            setVista('fantasma')
            setMasAbierto(false)
          }}
          onCambiarPassword={() => {
            setMostrarCambiarPassword(true)
            setMasAbierto(false)
          }}
          onCerrarSesion={cerrarSesion}
        />
      )}

      {/* MODAL CAMBIAR CONTRASEÑA */}
      {mostrarCambiarPassword && (
        <CambiarPassword onCerrar={() => setMostrarCambiarPassword(false)} />
      )}
    </div>
  )
}

export default App