import { useState, useEffect } from 'react'
import { Ghost } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { verificarLogroDiasTrabajados } from '../lib/logros'
import LogroModal from './LogroModal'

function formatearDuracion(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function TurnoFantasma() {
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [logroMensaje, setLogroMensaje] = useState('')
  const [ahora, setAhora] = useState(Date.now())
  const [usuarioActual, setUsuarioActual] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUsuarioActual(user))
  }, [])

  const cargarTurnos = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('turnos_fantasma')
      .select('*, creador:creado_por(nombre), tomador:tomado_por(nombre)')
      .neq('estado', 'finalizado')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setTurnos(data)
    setCargando(false)
  }

  useEffect(() => {
    cargarTurnos()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const crearTurno = async (e) => {
    e.preventDefault()
    setError('')
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('turnos_fantasma').insert({
      creado_por: user.id,
      motivo: motivo || null,
    })

    if (error) setError(error.message)
    else {
      setMotivo('')
      setMostrarForm(false)
      cargarTurnos()
    }
  }

  const tomarTurno = async (turno) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('turnos_fantasma')
      .update({
        tomado_por: user.id,
        estado: 'en_curso',
        hora_inicio: new Date().toISOString(),
      })
      .eq('id', turno.id)
      .eq('estado', 'disponible')

    if (error) setError(error.message)
    cargarTurnos()
  }

  const finalizarTurno = async (turno) => {
    const horaFin = new Date()
    const horaInicio = new Date(turno.hora_inicio)
    const duracionMinutos = Math.round((horaFin - horaInicio) / 60000)

    const { error } = await supabase
      .from('turnos_fantasma')
      .update({
        estado: 'finalizado',
        hora_fin: horaFin.toISOString(),
        duracion_minutos: duracionMinutos,
      })
      .eq('id', turno.id)

    if (error) {
      setError(error.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('asistencias').insert({
      empleado_id: user.id,
      tipo: 'fantasma',
      fecha: new Date().toISOString().slice(0, 10),
      hora_inicio: turno.hora_inicio,
      hora_fin: horaFin.toISOString(),
      duracion_minutos: duracionMinutos,
    })

    const nombre = user.user_metadata?.nombre || user.email
    const msg = await verificarLogroDiasTrabajados(user.id, nombre)
    if (msg) setLogroMensaje(msg)

    cargarTurnos()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-2xl flex items-center gap-2 text-cream">
          <Ghost size={22} className="text-sage" /> Turno fantasma
        </h2>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary">
          {mostrarForm ? 'Cancelar' : '+ Pedir cobertura'}
        </button>
      </div>

      <p className="text-cream/50 text-sm mb-6">
        Si no podés cumplir tu turno, pedí cobertura acá. Cualquier compañero puede tomarlo, y
        el sistema registra las horas reales trabajadas.
      </p>

      {error && <p className="text-ember text-sm mb-4">{error}</p>}

      {mostrarForm && (
        <form onSubmit={crearTurno} className="card p-6 mb-6">
          <label className="block text-sm font-medium text-cream/60 mb-1">
            Motivo (opcional)
          </label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: no puedo ir hoy por..."
            className="input-field mb-4"
          />
          <button type="submit" className="btn-primary">
            Publicar turno fantasma
          </button>
        </form>
      )}

      {cargando ? (
        <p className="text-cream/40">Cargando...</p>
      ) : turnos.length === 0 ? (
        <p className="text-cream/40">No hay turnos fantasma pendientes.</p>
      ) : (
        <div className="grid gap-4">
          {turnos.map((t) => {
            const esMio = t.tomado_por === usuarioActual?.id
            const segundos =
              t.estado === 'en_curso' && t.hora_inicio
                ? Math.floor((ahora - new Date(t.hora_inicio).getTime()) / 1000)
                : 0

            return (
              <div key={t.id} className="card p-5 flex justify-between items-center">
                <div>
                  <p className="text-cream font-medium">{t.motivo || 'Cobertura solicitada'}</p>
                  <p className="text-cream/50 text-sm">
                    Pedido por {t.creador?.nombre || 'alguien'}
                    {t.estado === 'en_curso' && (
                      <>
                        {' '}
                        — cubriendo: <span className="text-sage">{t.tomador?.nombre}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="text-right">
                  {t.estado === 'disponible' && (
                    <button onClick={() => tomarTurno(t)} className="btn-primary">
                      Tomar turno
                    </button>
                  )}
                  {t.estado === 'en_curso' && (
                    <div>
                      <p className="font-mono text-xl text-sage mb-2">
                        {formatearDuracion(segundos)}
                      </p>
                      {esMio && (
                        <button onClick={() => finalizarTurno(t)} className="btn-primary">
                          Finalizar turno
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {logroMensaje && <LogroModal mensaje={logroMensaje} onCerrar={() => setLogroMensaje('')} />}
    </div>
  )
}