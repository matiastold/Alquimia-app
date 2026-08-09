import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CambiarPassword({ onCerrar }) {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setCargando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setCargando(false)

    if (error) {
      setError(error.message)
    } else {
      setExito(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-void/70 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-sm p-6">
        <h2 className="font-display text-xl mb-4 text-cream">Cambiar contraseña</h2>

        {exito ? (
          <div>
            <p className="text-success text-sm mb-4">Contraseña actualizada correctamente.</p>
            <button onClick={onCerrar} className="btn-primary w-full">
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-cream/60 mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-field"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-cream/60 mb-1">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                minLength={6}
                className="input-field"
              />
            </div>

            {error && <p className="text-ember text-sm mb-4">{error}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={cargando} className="btn-primary flex-1">
                {cargando ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={onCerrar} className="btn-ghost flex-1">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}