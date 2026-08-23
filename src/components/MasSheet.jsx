import { Ghost, Key, LogOut, X } from 'lucide-react'

export default function MasSheet({ onCerrar, onIrATurnoFantasma, onCambiarPassword, onCerrarSesion }) {
  const opciones = [
    { icon: Ghost, label: 'Turno fantasma', onClick: onIrATurnoFantasma },
    { icon: Key, label: 'Cambiar contraseña', onClick: onCambiarPassword },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* OVERLAY */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onCerrar} 
      />

      {/* BOTTOM SHEET */}
      <div
        className="relative w-full max-w-xl bg-slate-900 border-t border-slate-800 rounded-t-[32px] shadow-2xl p-5 z-10 space-y-4 animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        {/* INDICADOR DE ARRASTRE */}
        <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto" />

        <div className="flex justify-between items-center pt-1">
          <p className="font-extrabold text-base text-slate-100">Más opciones</p>
          <button 
            onClick={onCerrar} 
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          {opciones.map((op) => {
            const Icon = op.icon
            return (
              <button
                key={op.label}
                onClick={() => {
                  op.onClick()
                  onCerrar()
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/60 text-slate-200 text-left transition-all active:scale-[0.99]"
              >
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                  <Icon size={18} />
                </div>
                <span className="text-xs font-semibold">{op.label}</span>
              </button>
            )
          })}

          <div className="h-px bg-slate-800 my-2" />

          <button
            onClick={onCerrarSesion}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-left transition-all active:scale-[0.99]"
          >
            <div className="p-2 bg-rose-500/20 rounded-xl shrink-0">
              <LogOut size={18} />
            </div>
            <span className="text-xs font-bold">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  )
}