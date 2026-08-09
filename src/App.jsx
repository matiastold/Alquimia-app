import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import Stock from './components/Stock'
import Ventas from './components/Ventas'
import Turnos from './components/Turnos'
import Reportes from './components/Reportes'
import Notificaciones from './components/Notificaciones'
import CambiarPassword from './components/CambiarPassword'
import { Package, ShoppingCart, CalendarClock, BarChart3, Ghost } from 'lucide-react'
import TurnoFantasma from './components/TurnoFantasma'

const TABS = [
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
  { id: 'turnos', label: 'Turnos', icon: CalendarClock },
  { id: 'fantasma', label: 'Turno fantasma', icon: Ghost },
  { id: 'reportes', label: 'Reportes', icon: BarChart3 },
]

function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="text-sage">
      <path d="M16 4 L28 26 H4 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="12.5" y="16.5" width="7" height="7" transform="rotate(45 16 20)" fill="currentColor" />
    </svg>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState('stock')
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

  return (
    <div className="min-h-screen bg-void text-cream">
      <header className="bg-surface border-b border-sage/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LogoMark />
            <h1 className="font-display text-xl tracking-widest uppercase">Alquimia</h1>
          </div>
          <div className="flex items-center gap-4">
            <Notificaciones />
<button
  onClick={() => setMostrarCambiarPassword(true)}
  className="text-sm text-cream/50 hover:text-cream font-medium"
>
  Cambiar contraseña
</button>
<button
  onClick={cerrarSesion}
  className="text-sm text-cream/50 hover:text-cream font-medium"
>
  Cerrar sesión
</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <nav className="flex gap-2 mb-8">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setVista(t.id)}
                className={`nav-tab ${vista === t.id ? 'nav-tab-active' : 'nav-tab-inactive'}`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            )
          })}
        </nav>

        {vista === 'stock' && <Stock />}
        {vista === 'ventas' && <Ventas />}
        {vista === 'turnos' && <Turnos />}
        {vista === 'reportes' && <Reportes />}
        {mostrarCambiarPassword && (
  <CambiarPassword onCerrar={() => setMostrarCambiarPassword(false)} />
)}
        {vista === 'fantasma' && <TurnoFantasma />}

      </div>
    </div>
  )
}

export default App