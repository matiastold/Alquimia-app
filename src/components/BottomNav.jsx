import { Package, ShoppingCart, CalendarClock, BookOpen, BarChart3, MoreHorizontal } from 'lucide-react'

const TABS = [
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
  { id: 'turnos', label: 'Turnos', icon: CalendarClock },
  { id: 'libreta', label: 'Libreta', icon: BookOpen },
  { id: 'reportes', label: 'Reportes', icon: BarChart3 },
]

export default function BottomNav({ vista, setVista, onAbrirMas, masActivo }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-xl shadow-2xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-xl mx-auto grid grid-cols-6 items-center px-1">
        {TABS.map((t) => {
          const Icon = t.icon
          const activo = vista === t.id && !masActivo
          return (
            <button
              key={t.id}
              onClick={() => setVista(t.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-all duration-200 active:scale-95 ${
                activo ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
              aria-label={t.label}
              aria-current={activo ? 'page' : undefined}
            >
              <div className={`p-1 rounded-xl transition-all ${activo ? 'bg-emerald-500/10' : ''}`}>
                <Icon size={20} strokeWidth={activo ? 2.4 : 1.8} />
              </div>
              <span className="text-[10px] tracking-tight leading-none">{t.label}</span>
            </button>
          )
        })}

        <button
          onClick={onAbrirMas}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-all duration-200 active:scale-95 ${
            masActivo ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
          aria-label="Más opciones"
        >
          <div className={`p-1 rounded-xl transition-all ${masActivo ? 'bg-emerald-500/10' : ''}`}>
            <MoreHorizontal size={20} strokeWidth={masActivo ? 2.4 : 1.8} />
          </div>
          <span className="text-[10px] tracking-tight leading-none">Más</span>
        </button>
      </div>
    </nav>
  )
}