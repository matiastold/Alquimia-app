import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
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
      <button
        onClick={() => setAbierto(!abierto)}
        className="relative bg-sage/10 hover:bg-sage/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors text-sage"
      >
        <Bell size={18} />
        {sinLeer > 0 && (
          <span className="absolute -top-1 -right-1 bg-ember text-void text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
            {sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setAbierto(false)}
          />
          <div className="fixed left-4 right-4 top-20 z-50 card max-h-[70vh] overflow-y-auto md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 md:inset-x-auto">
            {notificaciones.length === 0 ? (
              <p className="p-4 text-sm text-cream/40">No hay notificaciones.</p>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => marcarLeida(n.id)}
                  className={`p-3 border-b border-sage/10 text-sm cursor-pointer break-words ${
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