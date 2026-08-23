import { Trophy, Sparkles } from 'lucide-react'

export default function LogroModal({ mensaje, onCerrar }) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 px-4 py-6">
      <div className="relative w-full max-w-sm bg-slate-900/90 border border-emerald-500/30 p-6 sm:p-8 rounded-3xl text-center shadow-2xl shadow-emerald-500/10 overflow-hidden">
        {/* Luz ambiental tras el ícono */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Badge / Ícono de Logro */}
          <div className="relative mb-5">
            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500/20 to-emerald-400/10 border border-emerald-500/40 rounded-3xl flex items-center justify-center text-emerald-400 shadow-inner">
              <Trophy size={40} className="animate-bounce" />
            </div>
            <div className="absolute -top-2 -right-2 p-1.5 bg-slate-900 border border-emerald-500/40 rounded-full text-emerald-400">
              <Sparkles size={16} />
            </div>
          </div>

          <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 mb-1 font-mono">
            ¡Logro Desbloqueado!
          </span>

          <p className="font-extrabold text-lg text-slate-100 mb-6 leading-snug">
            {mensaje}
          </p>

          <button
            onClick={onCerrar}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-emerald-500/25 transition-all text-xs active:scale-95"
          >
            ¡Genial!
          </button>
        </div>
      </div>
    </div>
  )
}