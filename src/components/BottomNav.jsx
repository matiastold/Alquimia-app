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
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-sage/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-2xl mx-auto grid grid-cols-6">
        {TABS.map((t) => {
          const Icon = t.icon
          const activo = vista === t.id
          return (
            <button
              key={t.id}
              onClick={() => setVista(t.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-14 transition-colors ${
                activo ? 'text-sage' : 'text-cream/40'
              }`}
              aria-label={t.label}
              aria-current={activo ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={activo ? 2.4 : 2} />
              <span className="text-[10px] font-medium leading-none">{t.label}</span>
            </button>
          )
        })}
        <button
          onClick={onAbrirMas}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-14 transition-colors ${
            masActivo ? 'text-sage' : 'text-cream/40'
          }`}
          aria-label="Más opciones"
        >
          <MoreHorizontal size={20} strokeWidth={masActivo ? 2.4 : 2} />
          <span className="text-[10px] font-medium leading-none">Más</span>
        </button>
      </div>
    </nav>
  )
}