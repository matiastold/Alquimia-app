import { useState, useEffect } from 'react'
import { Bell, X, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState([])
  const [abierto, setAbierto] = useState(false)

  const cargarNotificaciones = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error) setNotificaciones(data || [])
  }

  useEffect(() => {
    cargarNotificaciones()

    const canal = supabase
      .channel('notificaciones-canal')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        () => cargarNotificaciones()
      )
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [])

  const marcarLeida = async (id) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    cargarNotificaciones()
  }

  const sinLeer = notificaciones.filter((n) => !n.leida).length

  return (
    <div className="relative">
      {/* Botón de Notificaciones con Badge */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="relative p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 active:scale-95 transition-all shadow-md"
        aria-label={`Notificaciones${sinLeer > 0 ? `, ${sinLeer} sin leer` : ''}`}
      >
        <Bell size={19} />
        {sinLeer > 0 && (
          <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 font-extrabold text-[10px] rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow-md shadow-emerald-500/30 animate-pulse">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <>
          {/* Overlay Oscuro */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setAbierto(false)}
          />

          {/* Panel Desplegable Adaptado a Móvil */}
          <div 
            className="fixed left-3 right-3 top-16 max-h-[70vh] z-50 bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80 sm:max-h-[420px]"
            style={{ marginTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
          >
            {/* Header del Panel */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-800/40 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">Notificaciones</span>
                {sinLeer > 0 && (
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {sinLeer} nuevas
                  </span>
                )}
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                aria-label="Cerrar notificaciones"
              >
                <X size={16} />
              </button>
            </div>

            {/* Lista de Notificaciones con scroll propio */}
            <div className="overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
              {notificaciones.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-medium">
                  No tienes notificaciones pendientes.
                </div>
              ) : (
                notificaciones.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => marcarLeida(n.id)}
                    className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 ${
                      n.leida
                        ? 'text-slate-400 hover:bg-slate-800/30'
                        : 'bg-emerald-500/10 text-slate-100 font-medium border border-emerald-500/20 hover:bg-emerald-500/15'
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      {n.leida ? (
                        <div className="w-2 h-2 rounded-full bg-slate-600" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                      )}
                    </div>
                    <div className="space-y-1 text-xs break-words min-w-0 flex-1">
                      <p className={n.leida ? 'text-slate-400' : 'text-slate-100 font-semibold'}>
                        {n.mensaje}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}