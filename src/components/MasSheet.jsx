import { Ghost, Key, Bell, LogOut, X } from 'lucide-react'
import { activarNotificacionesPush } from '../lib/pushNotifications'

export default function MasSheet({ onCerrar, onIrATurnoFantasma, onCambiarPassword, onCerrarSesion }) {
  const handleActivarPush = async () => {
    try {
      await activarNotificacionesPush()
      alert('¡Notificaciones activadas!')
    } catch (e) {
      alert(e.message)
    }
  }

  const opciones = [
    { icon: Ghost, label: 'Turno fantasma', onClick: onIrATurnoFantasma },
    { icon: Bell, label: 'Activar notificaciones push', onClick: handleActivarPush },
    { icon: Key, label: 'Cambiar contraseña', onClick: onCambiarPassword },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-void/70" onClick={onCerrar} />
      <div
        className="relative w-full max-w-2xl bg-surface rounded-t-3xl border-t border-sage/10 shadow-2xl shadow-black/50 p-4"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        <div className="w-10 h-1 bg-cream/20 rounded-full mx-auto mb-4" />

        <div className="flex justify-between items-center mb-3">
          <p className="font-display text-lg text-cream">Más</p>
          <button onClick={onCerrar} className="icon-btn text-cream/50 hover:text-cream" aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-1">
          {opciones.map((op) => {
            const Icon = op.icon
            return (
              <button
                key={op.label}
                onClick={op.onClick}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-sage/10 text-cream text-left transition-colors min-h-12"
              >
                <Icon size={18} className="text-sage shrink-0" />
                <span className="text-sm font-medium">{op.label}</span>
              </button>
            )
          })}

          <div className="h-px bg-sage/10 my-2" />

          <button
            onClick={onCerrarSesion}
            className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-ember/10 text-ember text-left transition-colors min-h-12"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  )
}
