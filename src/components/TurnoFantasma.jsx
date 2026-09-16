import { useState, useEffect } from 'react'
import { Ghost, Trash2, Plus, X, UserCheck, AlertCircle, Clock, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { verificarLogroDiasTrabajados } from '../lib/logros'
import LogroModal from './LogroModal'
import { useEsAdmin } from '../lib/useEsAdmin'

function formatearDuracion(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function TurnoFantasma() {
  const esAdmin = useEsAdmin()
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
    setError('')
    const { error: errorRpc } = await supabase.rpc('finalizar_turno_fantasma', {
      turno_id: turno.id,
    })

    if (errorRpc) {
      setError('No se pudo finalizar el turno: ' + errorRpc.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { data: turnoActualizado } = await supabase
      .from('turnos_fantasma')
      .select('hora_inicio, hora_fin, duracion_minutos')
      .eq('id', turno.id)
      .single()

    if (turnoActualizado) {
      await supabase.from('asistencias').insert({
        empleado_id: user.id,
        tipo: 'fantasma',
        fecha: new Date().toISOString().slice(0, 10),
        hora_inicio: turnoActualizado.hora_inicio,
        hora_fin: turnoActualizado.hora_fin,
        duracion_minutos: turnoActualizado.duracion_minutos,
        turno_fantasma_id: turno.id,
      })

      const nombre = user.user_metadata?.nombre || user.email
      const msg = await verificarLogroDiasTrabajados(user.id, nombre)
      if (msg) setLogroMensaje(msg)
    }

    cargarTurnos()
  }

  const eliminarTurno = async (turno) => {
    const confirmar = window.confirm(
      '¿Eliminar este turno fantasma? Si ya generó horas trabajadas, también se van a borrar.'
    )
    if (!confirmar) return

    setError('')
    const { error } = await supabase.from('turnos_fantasma').delete().eq('id', turno.id)
    if (error) setError(error.message)
    cargarTurnos()
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Ghost size={22} />
            </div>
            Coberturas & Turnos Fantasma
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Bolsa de suplencias imprevistas e intercambios de turnos entre compañeros
          </p>
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg active:scale-[0.98] ${
            mostrarForm
              ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 shadow-amber-500/10'
          }`}
        >
          {mostrarForm ? (
            <>
              <X size={16} /> Cancelar
            </>
          ) : (
            <>
              <Plus size={16} /> Pedir Cobertura
            </>
          )}
        </button>
      </div>

      {/* MENSAJE DE ERROR */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* FORMULARIO PUBLICAR SOLICITUD DE COBERTURA */}
      {mostrarForm && (
        <form
          onSubmit={crearTurno}
          className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert size={16} /> Solicitar Reemplazo Imprevisto
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Motivo o Observación <span className="text-slate-500 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. No llego al turno tarde por trámite de salud..."
              className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
          >
            Publicar Turno Fantasma
          </button>
        </form>
      )}

      {/* LISTADO / MARKETPLACE DE COBERTURAS */}
      {cargando ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Buscando solicitudes de cobertura...</p>
        </div>
      ) : turnos.length === 0 ? (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-8 text-center space-y-2">
          <Ghost size={32} className="mx-auto text-slate-600" />
          <p className="text-sm font-medium text-slate-300">No hay turnos fantasma pendientes</p>
          <p className="text-xs text-slate-500">
            Todos los turnos están cubiertos o no hay solicitudes activas en este momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {turnos.map((t) => {
            const esMio = t.tomado_por === usuarioActual?.id
            const segundos =
              t.estado === 'en_curso' && t.hora_inicio
                ? Math.floor((ahora - new Date(t.hora_inicio).getTime()) / 1000)
                : 0

            return (
              <div
                key={t.id}
                className={`bg-slate-800/50 border rounded-2xl p-4 flex flex-col justify-between gap-4 backdrop-blur-md transition-all ${
                  t.estado === 'en_curso'
                    ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                    : 'border-slate-700/40 hover:border-slate-600/60'
                }`}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          t.estado === 'disponible'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {t.estado === 'disponible' ? 'Disponible para tomar' : 'En Curso'}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-100 text-sm truncate mt-1">
                      {t.motivo || 'Cobertura de Turno Solicitada'}
                    </p>

                    <p className="text-xs text-slate-400">
                      Pedido por: <span className="text-slate-200 font-medium">{t.creador?.nombre || 'Compañero'}</span>
                    </p>

                    {t.estado === 'en_curso' && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <UserCheck size={12} className="text-emerald-400" /> Cubriendo:{' '}
                        <span className="text-emerald-400 font-semibold">{t.tomador?.nombre}</span>
                      </p>
                    )}
                  </div>
                  {esAdmin &&(
                  <button
                    onClick={() => eliminarTurno(t)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all shrink-0"
                    title="Eliminar solicitud"
                  >
                    <Trash2 size={16} />
                  </button>
                  )}

                </div>

                {/* Acciones del Turno Fantasma */}
                <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between gap-2">
                  {t.estado === 'disponible' && (
                    <button
                      onClick={() => tomarTurno(t)}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                    >
                      Tomar esta Cobertura
                    </button>
                  )}

                  {t.estado === 'en_curso' && (
                    <div className="w-full flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-emerald-400 animate-spin" />
                        <span className="font-mono text-lg font-bold text-emerald-400">
                          {formatearDuracion(segundos)}
                        </span>
                      </div>

                      {esMio && (
                        <button
                          onClick={() => finalizarTurno(t)}
                          className="px-4 py-2 bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-bold text-xs rounded-xl transition-all active:scale-95"
                        >
                          Finalizar Cobertura
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

      {/* MODAL DE LOGROS */}
      {logroMensaje && <LogroModal mensaje={logroMensaje} onCerrar={() => setLogroMensaje('')} />}
    </div>
  )
}