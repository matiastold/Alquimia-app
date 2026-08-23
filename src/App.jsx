import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import Stock from './components/Stock'
import Ventas from './components/Ventas'
import Turnos from './components/Turnos'
import TurnoFantasma from './components/TurnoFantasma'
import Libreta from './components/Libreta'
import Reportes from './components/Reportes'
import Notificaciones from './components/Notificaciones'
import CambiarPassword from './components/CambiarPassword'
import BottomNav from './components/BottomNav'
import MasSheet from './components/MasSheet'

function LogoMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="text-sage">
      <path d="M16 4 L28 26 H4 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="12.5" y="16.5" width="7" height="7" transform="rotate(45 16 20)" fill="currentColor" />
    </svg>
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
      <div className="min-h-screen flex items-center justify-center bg-void">
        <p className="font-display text-sage text-lg">Cargando...</p>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  const masActivo = !SECCIONES_PRINCIPALES.includes(vista)

  return (
    <div className="min-h-screen bg-void text-cream">
      <header
        className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-sage/10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-lg tracking-widest uppercase">Alquimia</span>
          </div>
          <Notificaciones />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-28">
        {vista === 'stock' && <Stock />}
        {vista === 'ventas' && <Ventas />}
        {vista === 'turnos' && <Turnos />}
        {vista === 'libreta' && <Libreta />}
        {vista === 'reportes' && <Reportes />}
        {vista === 'fantasma' && <TurnoFantasma />}
      </main>

      <BottomNav
        vista={vista}
        setVista={setVista}
        onAbrirMas={() => setMasAbierto(true)}
        masActivo={masActivo}
      />

      {masAbierto && (
        <MasSheet
          onCerrar={() => setMasAbierto(false)}
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

      {mostrarCambiarPassword && (
        <CambiarPassword onCerrar={() => setMostrarCambiarPassword(false)} />
      )}
    </div>
  )
}

export default App