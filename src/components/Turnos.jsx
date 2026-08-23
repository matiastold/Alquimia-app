import { useState, useEffect } from 'react'
import { CalendarClock, Trash2, Plus, X, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { verificarLogroDiasTrabajados } from '../lib/logros'
import LogroModal from './LogroModal'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const DIA_JS_A_NOMBRE = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIAS_LABEL = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

function formatearDuracion(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function Turnos() {
  const [turnos, setTurnos] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [empleadoId, setEmpleadoId] = useState('')
  const [diasSeleccionados, setDiasSeleccionados] = useState([])
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [error, setError] = useState('')
  const [misTurnosHoy, setMisTurnosHoy] = useState([])
  const [yaMarcadoHoy, setYaMarcadoHoy] = useState(false)
  const [logroMensaje, setLogroMensaje] = useState('')
  const [usuarioActual, setUsuarioActual] = useState(null)

  // Turnos por día
  const [turnosDia, setTurnosDia] = useState([])
  const [mostrarFormDia, setMostrarFormDia] = useState(false)
  const [empleadoIdDia, setEmpleadoIdDia] = useState('')
  const [fechaDia, setFechaDia] = useState('')
  const [ahora, setAhora] = useState(Date.now())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUsuarioActual(user))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const cargarDatos = async () => {
    setCargando(true)

    const { data: turnosData, error: errorTurnos } = await supabase
      .from('turnos')
      .select('*, perfiles(nombre)')

    const { data: perfilesData, error: errorPerfiles } = await supabase
      .from('perfiles')
      .select('*')
      .order('nombre', { ascending: true })

    if (errorTurnos) setError(errorTurnos.message)
    else {
      const ordenados = [...turnosData].sort(
        (a, b) => DIAS.indexOf(a.dia_semana) - DIAS.indexOf(b.dia_semana)
      )
      setTurnos(ordenados)
    }

    if (errorPerfiles) setError(errorPerfiles.message)
    else setPerfiles(perfilesData)

    setCargando(false)
  }

  const cargarTurnosDia = async () => {
    const { data, error } = await supabase
      .from('turnos_dia')
      .select('*, perfiles(nombre)')
      .neq('estado', 'finalizado')
      .order('fecha', { ascending: true })

    if (error) setError(error.message)
    else setTurnosDia(data)
  }

  const cargarMiTurnoHoy = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hoyNombre = DIA_JS_A_NOMBRE[new Date().getDay()]
    const hoyFecha = new Date().toISOString().slice(0, 10)

    const { data: turnosHoy } = await supabase
      .from('turnos')
      .select('*')
      .eq('empleado_id', user.id)
      .eq('dia_semana', hoyNombre)

    setMisTurnosHoy(turnosHoy || [])

    const { data: asistenciaHoy } = await supabase
      .from('asistencias')
      .select('id')
      .eq('empleado_id', user.id)
      .eq('tipo', 'fijo')
      .eq('fecha', hoyFecha)
      .maybeSingle()

    setYaMarcadoHoy(!!asistenciaHoy)
  }

  useEffect(() => {
    cargarDatos()
    cargarTurnosDia()
    cargarMiTurnoHoy()
  }, [])

  const marcarCumplido = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const hoyFecha = new Date().toISOString().slice(0, 10)

    await supabase.from('asistencias').insert({
      empleado_id: user.id,
      tipo: 'fijo',
      fecha: hoyFecha,
    })

    setYaMarcadoHoy(true)

    const nombre = user.user_metadata?.nombre || user.email
    const msg = await verificarLogroDiasTrabajados(user.id, nombre)
    if (msg) setLogroMensaje(msg)
  }

  const toggleDia = (dia) => {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (diasSeleccionados.length === 0) {
      setError('Elegí al menos un día.')
      return
    }

    const nuevosT = diasSeleccionados.map((dia) => ({
      empleado_id: empleadoId,
      dia_semana: dia,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
    }))

    const { error: errorTurno } = await supabase.from('turnos').insert(nuevosT)

    if (errorTurno) {
      setError(errorTurno.message)
      return
    }

    const diasTexto = diasSeleccionados.map((d) => DIAS_LABEL[d]).join(' y ')
    await supabase.from('notificaciones').insert({
      usuario_id: empleadoId,
      mensaje: `Tu turno fijo: ${diasTexto} de ${horaInicio} a ${horaFin}`,
    })

    setEmpleadoId('')
    setDiasSeleccionados([])
    setHoraInicio('')
    setHoraFin('')
    setMostrarForm(false)
    cargarDatos()
    cargarMiTurnoHoy()
  }

  const eliminarTurno = async (id) => {
    const { error } = await supabase.from('turnos').delete().eq('id', id)
    if (error) setError(error.message)
    else {
      cargarDatos()
      cargarMiTurnoHoy()
    }
  }

  // --- Turnos por día ---

  const asignarTurnoDia = async (e) => {
    e.preventDefault()
    setError('')

    const { error } = await supabase.from('turnos_dia').insert({
      empleado_id: empleadoIdDia,
      fecha: fechaDia,
    })

    if (error) {
      setError(error.message)
      return
    }

    await supabase.from('notificaciones').insert({
      usuario_id: empleadoIdDia,
      mensaje: `Se te asignó un turno para el ${fechaDia}`,
    })

    setEmpleadoIdDia('')
    setFechaDia('')
    setMostrarFormDia(false)
    cargarTurnosDia()
  }

  const iniciarTurnoDia = async (turno) => {
    setError('')
    const { error } = await supabase.rpc('iniciar_turno_dia', { turno_id: turno.id })
    if (error) setError(error.message)
    cargarTurnosDia()
  }

  const finalizarTurnoDia = async (turno) => {
    setError('')
    const { error: errorRpc } = await supabase.rpc('finalizar_turno_dia', { turno_id: turno.id })

    if (errorRpc) {
      setError('No se pudo finalizar el turno: ' + errorRpc.message)
      return
    }

    const { data: turnoActualizado } = await supabase
      .from('turnos_dia')
      .select('empleado_id, hora_inicio, hora_fin, duracion_minutos, fecha')
      .eq('id', turno.id)
      .single()

    if (turnoActualizado) {
      await supabase.from('asistencias').insert({
        empleado_id: turnoActualizado.empleado_id,
        tipo: 'dia',
        fecha: turnoActualizado.fecha,
        hora_inicio: turnoActualizado.hora_inicio,
        hora_fin: turnoActualizado.hora_fin,
        duracion_minutos: turnoActualizado.duracion_minutos,
        turno_dia_id: turno.id,
      })

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre')
        .eq('id', turnoActualizado.empleado_id)
        .maybeSingle()

      const msg = await verificarLogroDiasTrabajados(
        turnoActualizado.empleado_id,
        perfil?.nombre || 'el empleado'
      )
      if (msg) setLogroMensaje(msg)
    }

    cargarTurnosDia()
  }

  const eliminarTurnoDia = async (turno) => {
    const confirmar = window.confirm('¿Eliminar este turno por día?')
    if (!confirmar) return

    setError('')
    const { error } = await supabase.from('turnos_dia').delete().eq('id', turno.id)
    if (error) setError(error.message)
    cargarTurnosDia()
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-6">
      {/* TARJETA DE MI TURNO HOY (ACCESO RÁPIDO PARA EL EMPLEADO) */}
      {misTurnosHoy.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-slate-800/80 to-slate-800/80 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-2">
            <Clock size={16} /> Tu Turno Fijo de Hoy
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {misTurnosHoy.map((t) => (
                <p key={t.id} className="text-2xl font-mono font-bold text-slate-100">
                  {t.hora_inicio} <span className="text-slate-500 text-lg">-</span> {t.hora_fin} hs
                </p>
              ))}
              <p className="text-xs text-slate-400 mt-1">Registra tu cumplimiento diario para actualizar tu asistencia.</p>
            </div>

            {yaMarcadoHoy ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-bold text-xs">
                <CheckCircle2 size={18} /> Turno marcado como cumplido
              </div>
            ) : (
              <button
                onClick={marcarCumplido}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                Marcar Cumplido Hoy
              </button>
            )}
          </div>
        </div>
      )}

      {/* MENSAJE DE ERROR GLOBAL */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECCIÓN 1: TURNOS FIJOS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <CalendarClock size={20} />
              </div>
              Turnos Fijos Semanales
            </h2>
            <p className="text-xs text-slate-400 mt-1">Horarios recurrentes por día de la semana para el personal regular</p>
          </div>

          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md active:scale-[0.98] ${
              mostrarForm
                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
            }`}
          >
            {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Asignar Turno Fijo</>}
          </button>
        </div>

        {/* FORMULARIO TURNO FIJO */}
        {mostrarForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4 animate-in fade-in duration-200"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Empleado
              </label>
              <select
                value={empleadoId}
                onChange={(e) => setEmpleadoId(e.target.value)}
                required
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              >
                <option value="">Seleccionar empleado...</option>
                {perfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Días Semanales
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS.map((dia) => {
                  const selec = diasSeleccionados.includes(dia)
                  return (
                    <button
                      type="button"
                      key={dia}
                      onClick={() => toggleDia(dia)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        selec
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                          : 'bg-slate-900/60 text-slate-400 border border-slate-700/60 hover:bg-slate-700/50'
                      }`}
                    >
                      {DIAS_LABEL[dia]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Hora Inicio
                </label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  required
                  className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Hora Fin
                </label>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  required
                  className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all mt-2"
            >
              Guardar Turno Fijo
            </button>
          </form>
        )}

        {/* LISTADO DE TURNOS FIJOS */}
        {cargando ? (
          <div className="text-center py-8 text-xs text-slate-400 font-medium">Cargando turnos fijos...</div>
        ) : turnos.length === 0 ? (
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-6 text-center text-xs text-slate-500">
            No hay turnos fijos asignados aún.
          </div>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-md backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/60 border-b border-slate-700/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Día</th>
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3">Horario</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {turnos.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-200 text-xs">
                        {DIAS_LABEL[t.dia_semana]}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        {t.perfiles?.nombre || 'Sin nombre'}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-400 text-xs font-semibold">
                        {t.hora_inicio} - {t.hora_fin}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => eliminarTurno(t.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Eliminar turno"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <hr className="border-slate-800" />

      {/* SECCIÓN 2: TURNOS POR DÍA (CRONÓMETRO EXACTO) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Calendar size={18} className="text-amber-400" /> Turnos Eventuales por Día
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Asignaciones puntuales no recurrentes con fichaje y cronómetro en tiempo real.
            </p>
          </div>

          <button
            onClick={() => setMostrarFormDia(!mostrarFormDia)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md active:scale-[0.98] ${
              mostrarFormDia
                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            {mostrarFormDia ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Asignar por Día</>}
          </button>
        </div>

        {/* FORMULARIO TURNO POR DÍA */}
        {mostrarFormDia && (
          <form
            onSubmit={asignarTurnoDia}
            className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4 animate-in fade-in duration-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Empleado
                </label>
                <select
                  value={empleadoIdDia}
                  onChange={(e) => setEmpleadoIdDia(e.target.value)}
                  required
                  className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                >
                  <option value="">Seleccionar empleado...</option>
                  {perfiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Fecha Puntual
                </label>
                <input
                  type="date"
                  value={fechaDia}
                  onChange={(e) => setFechaDia(e.target.value)}
                  required
                  className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
            >
              Asignar Turno Eventual
            </button>
          </form>
        )}

        {/* LISTADO TARJETAS TURNOS POR DÍA */}
        {turnosDia.length === 0 ? (
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-6 text-center text-xs text-slate-500">
            No hay turnos por día pendientes de iniciar o en curso.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {turnosDia.map((t) => {
              const esMio = t.empleado_id === usuarioActual?.id
              const segundos =
                t.estado === 'en_curso' && t.hora_inicio
                  ? Math.floor((ahora - new Date(t.hora_inicio).getTime()) / 1000)
                  : 0

              return (
                <div
                  key={t.id}
                  className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4 flex flex-col justify-between gap-4 backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-100 text-sm">{t.perfiles?.nombre || 'Sin nombre'}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{t.fecha}</p>
                    </div>

                    <button
                      onClick={() => eliminarTurnoDia(t)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-all"
                      title="Eliminar turno por día"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between gap-2">
                    {/* ESTADO PENDIENTE */}
                    {t.estado === 'pendiente' && esMio && (
                      <button
                        onClick={() => iniciarTurnoDia(t)}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                      >
                        Iniciar Turno Ahora
                      </button>
                    )}
                    {t.estado === 'pendiente' && !esMio && (
                      <span className="text-xs text-slate-500 italic font-medium">Pendiente de iniciar por el empleado</span>
                    )}

                    {/* ESTADO EN CURSO */}
                    {t.estado === 'en_curso' && (
                      <div className="w-full flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="font-mono text-lg font-bold text-emerald-400">
                            {formatearDuracion(segundos)}
                          </span>
                        </div>

                        {esMio && (
                          <button
                            onClick={() => finalizarTurnoDia(t)}
                            className="px-4 py-2 bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-bold text-xs rounded-xl transition-all active:scale-95"
                          >
                            Finalizar Turno
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
      </div>

      {/* MODAL DE LOGROS */}
      {logroMensaje && <LogroModal mensaje={logroMensaje} onCerrar={() => setLogroMensaje('')} />}
    </div>
  )
}