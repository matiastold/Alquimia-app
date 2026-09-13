import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, Clock, User, Play, Square } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { verificarLogroDiasTrabajados } from '../lib/logros'
import LogroModal from './LogroModal'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DIAS_MAP_JS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function formatearDuracion(ms) {
  const seg = Math.floor((ms / 1000) % 60).toString().padStart(2, '0')
  const min = Math.floor((ms / (1000 * 60)) % 60).toString().padStart(2, '0')
  const hrs = Math.floor(ms / (1000 * 60 * 60)).toString().padStart(2, '0')
  return `${hrs}:${min}:${seg}`
}

export default function Turnos() {
  const [turnos, setTurnos] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [asistenciasHoy, setAsistenciasHoy] = useState([])
  const [usuarioActual, setUsuarioActual] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [ahora, setAhora] = useState(new Date())
  const [logroMensaje, setLogroMensaje] = useState('')

  const [dia, setDia] = useState('Lunes')
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFin, setHoraFin] = useState('13:00')
  const [empleadoId, setEmpleadoId] = useState('')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUsuarioActual(user))
  }, [])

  const cargarDatos = async () => {
    setCargando(true)

    const { data: turnosData } = await supabase
      .from('turnos')
      .select('*, perfiles(nombre)')
      .order('id', { ascending: true })
    if (turnosData) setTurnos(turnosData)

    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('*')
      .order('nombre', { ascending: true })
    if (perfilesData) {
      setPerfiles(perfilesData)
      setEmpleadoId((prev) => prev || perfilesData[0]?.id || '')
    }

    const hoyFecha = new Date().toISOString().slice(0, 10)
    const { data: asistData } = await supabase
      .from('asistencias')
      .select('*')
      .eq('tipo', 'fijo')
      .eq('fecha', hoyFecha)
    setAsistenciasHoy(asistData || [])

    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const diaActualNombre = DIAS_MAP_JS[ahora.getDay()]
  const asistenciaDe = (idEmpleado) => asistenciasHoy.find((a) => a.empleado_id === idEmpleado)

  const misTurnosHoy = turnos.filter(
    (t) => t.dia === diaActualNombre && t.empleado_id === usuarioActual?.id
  )
  const miAsistenciaHoy = usuarioActual ? asistenciaDe(usuarioActual.id) : null
  const miTurnoEnCurso = miAsistenciaHoy && !miAsistenciaHoy.hora_fin
  const turnoParaIniciar = misTurnosHoy[0]

  const iniciarJornada = async (turno) => {
    const { data: { user } } = await supabase.auth.getUser()
    const hoyFecha = new Date().toISOString().slice(0, 10)

    await supabase.from('asistencias').insert({
      empleado_id: user.id,
      tipo: 'fijo',
      fecha: hoyFecha,
      hora_inicio: new Date().toISOString(),
      turno_id: turno.id,
    })

    cargarDatos()
  }

  const finalizarJornada = async () => {
    if (!miAsistenciaHoy) return

    const { error: errorRpc } = await supabase.rpc('finalizar_turno_fijo', {
      p_asistencia_id: miAsistenciaHoy.id,
    })

    if (errorRpc) {
      alert('No se pudo finalizar el turno: ' + errorRpc.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const nombre = user.user_metadata?.nombre || user.email
    const msg = await verificarLogroDiasTrabajados(user.id, nombre)
    if (msg) setLogroMensaje(msg)

    cargarDatos()
  }

  const handleCrearTurno = async (e) => {
    e.preventDefault()
    const empleadoNombre = perfiles.find((p) => p.id === empleadoId)?.nombre || ''

    const { error } = await supabase.from('turnos').insert({
      dia,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      empleado_id: empleadoId,
      empleado: empleadoNombre,
      notas: notas.trim() || null,
    })

    if (!error) {
      setNotas('')
      setMostrarForm(false)
      cargarDatos()
    }
  }

  const handleEliminarTurno = async (id) => {
    if (!window.confirm('¿Eliminar esta asignación de turno?')) return
    const { error } = await supabase.from('turnos').delete().eq('id', id)
    if (!error) cargarDatos()
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Calendar size={22} />
            </div>
            Gestión de Turnos
          </h2>
          <p className="text-xs text-slate-400 mt-1">Control de horarios y fichaje en tiempo real</p>
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg active:scale-[0.98] ${
            mostrarForm ? 'bg-slate-800 text-slate-300' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
          }`}
        >
          <Plus size={16} /> {mostrarForm ? 'Cancelar' : 'Nuevo Turno Programado'}
        </button>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 p-5 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
              <span className={`w-2 h-2 rounded-full ${miTurnoEnCurso ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              {miTurnoEnCurso ? 'TU JORNADA EN CURSO' : 'CONTROL DE JORNADA'}
            </span>
            <p className="text-xs text-slate-300 font-medium">
              Hoy es <span className="font-bold text-slate-100">{diaActualNombre}</span>
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 px-6 py-3 rounded-2xl text-center shadow-inner">
            <span className="font-mono text-3xl font-extrabold text-emerald-400 tracking-wider">
              {miTurnoEnCurso
                ? formatearDuracion(ahora - new Date(miAsistenciaHoy.hora_inicio))
                : ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <p className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">
              {miTurnoEnCurso ? 'Tiempo de Trabajo Transcurrido' : 'Hora Actual'}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80">
          {miAsistenciaHoy && !miTurnoEnCurso ? (
            <p className="text-center text-[11px] text-emerald-400 font-semibold py-2">
              Ya completaste tu turno de hoy ✓
            </p>
          ) : miTurnoEnCurso ? (
            <button
              onClick={finalizarJornada}
              className="w-full py-3.5 bg-rose-500 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-500/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Square size={16} className="fill-slate-950" /> FINALIZAR TURNO
            </button>
          ) : turnoParaIniciar ? (
            <button
              onClick={() => iniciarJornada(turnoParaIniciar)}
              className="w-full py-3.5 bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Play size={16} className="fill-slate-950" /> INICIAR TURNO DE HOY ({turnoParaIniciar.hora_inicio} hs)
            </button>
          ) : (
            <p className="text-center text-[11px] text-slate-500 italic pt-1">
              No tenés un turno agendado para hoy ({diaActualNombre}).
            </p>
          )}
        </div>
      </div>

      {mostrarForm && (
        <form onSubmit={handleCrearTurno} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Día de la semana</label>
              <select value={dia} onChange={(e) => setDia(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100">
                {DIAS_SEMANA.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Empleado</label>
              <select value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100">
                {perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Hora Programada Inicio</label>
              <input type="time" required value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Hora Programada Fin</label>
              <input type="time" required value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono" />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs">
            Guardar Horario Programado
          </button>
        </form>
      )}

      <div className="space-y-4">
        {DIAS_SEMANA.map((diaNombre) => {
          const turnosDelDia = turnos.filter((t) => t.dia === diaNombre)
          const esHoy = diaNombre === diaActualNombre

          return (
            <div
              key={diaNombre}
              className={`border rounded-2xl p-4 space-y-3 transition-all ${
                esHoy ? 'bg-slate-900/90 border-emerald-500/40 shadow-md' : 'bg-slate-900/50 border-slate-800/80'
              }`}
            >
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <h4 className={`font-extrabold text-sm ${esHoy ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {diaNombre}
                  </h4>
                  {esHoy && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase rounded-md">
                      Hoy
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                  {turnosDelDia.length} TURNOS
                </span>
              </div>

              {turnosDelDia.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-1">Sin turnos asignados para este día.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {turnosDelDia.map((t) => {
                    const asistencia = esHoy ? asistenciaDe(t.empleado_id) : null
                    const estadoHoy = !asistencia ? null : asistencia.hora_fin ? 'completado' : 'en_curso'

                    return (
                      <div key={t.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex justify-between items-center gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                            <User size={13} className="text-emerald-400" />
                            <span>{t.perfiles?.nombre || t.empleado}</span>
                            {estadoHoy === 'en_curso' && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">En curso</span>
                            )}
                            {estadoHoy === 'completado' && (
                              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Completado</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                            <Clock size={12} className="text-slate-500" />
                            <span>{t.hora_inicio} hs - {t.hora_fin} hs</span>
                          </div>
                        </div>

                        <button onClick={() => handleEliminarTurno(t.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {logroMensaje && <LogroModal mensaje={logroMensaje} onCerrar={() => setLogroMensaje('')} />}
    </div>
  )
}