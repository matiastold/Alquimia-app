import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
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

    if (!error) setNotificaciones(data)
  }

  useEffect(() => {
    cargarNotificaciones()

    const canal = supabase
      .channel('notificaciones-canal')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, () =>
        cargarNotificaciones()
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
      <button
        onClick={() => setAbierto(!abierto)}
        className="icon-btn relative text-sage"
        aria-label={`Notificaciones${sinLeer > 0 ? `, ${sinLeer} sin leer` : ''}`}
      >
        <Bell size={19} />
        {sinLeer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-ember text-void text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="fixed left-3 right-3 top-16 z-50 sheet-panel max-h-[70vh] overflow-y-auto md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 md:inset-x-auto">
            <div className="flex justify-between items-center px-4 py-3 border-b border-sage/10">
              <p className="font-medium text-cream text-sm">Notificaciones</p>
              <button
                onClick={() => setAbierto(false)}
                className="text-cream/40 hover:text-cream"
                aria-label="Cerrar notificaciones"
              >
                <X size={16} />
              </button>
            </div>
            {notificaciones.length === 0 ? (
              <p className="p-4 text-sm text-cream/40">No hay notificaciones.</p>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => marcarLeida(n.id)}
                  className={`p-3 border-b border-sage/10 text-sm cursor-pointer break-words last:border-0 ${
                    n.leida ? 'text-cream/40' : 'font-medium bg-sage/5 text-cream'
                  }`}
                >
                  {n.mensaje}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}