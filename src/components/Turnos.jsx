import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, Clock, User, AlertCircle, PlayCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function Turnos() {
  const [turnos, setTurnos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [ahora, setAhora] = useState(new Date())
  
  // Formulario
  const [dia, setDia] = useState('Lunes')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFin, setHoraFin] = useState('16:00')
  const [empleado, setEmpleado] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setCargando(true)
    setError('')

    const { data: turnosData, error: errTurnos } = await supabase
      .from('turnos')
      .select('*')
      .order('id', { ascending: true })

    if (!errTurnos) setTurnos(turnosData || [])

    const { data: profilesData } = await supabase.from('perfiles').select('nombre').order('nombre')
    
    if (profilesData && profilesData.length > 0) {
      const nombres = profilesData.map(p => p.nombre).filter(Boolean)
      setEmpleados(nombres)
      if (nombres.length > 0) setEmpleado(nombres[0])
    } else {
      const listaGenerica = ['Matías Toledo', 'Joaquín Lazarte', 'Pablo Fernández']
      setEmpleados(listaGenerica)
      setEmpleado(listaGenerica[0])
    }

    setCargando(false)
  }

  const handleCrearTurno = async (e) => {
    e.preventDefault()
    setError('')

    if (!empleado) {
      setError('Selecciona un empleado para asignar el turno.')
      return
    }

    const { error } = await supabase.from('turnos').insert({
      dia,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      empleado,
      notas: notas.trim() || null,
    })

    if (error) {
      setError(error.message)
      return
    }

    setNotas('')
    setMostrarForm(false)
    cargarDatos()
  }

  const handleEliminarTurno = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este turno?')) return

    const { error } = await supabase.from('turnos').delete().eq('id', id)
    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      cargarDatos()
    }
  }

  // Nombre del día actual traducido para comparar
  const diasMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const diaActualNombre = diasMap[ahora.getDay()]
  const horaActualStr = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Calendar size={22} />
            </div>
            Gestión de Turnos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Control de horarios y seguimiento de personal en tiempo real
          </p>
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg active:scale-[0.98] ${
            mostrarForm
              ? 'bg-slate-800 text-slate-300 border border-slate-700'
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
          }`}
        >
          <Plus size={16} />
          {mostrarForm ? 'Cancelar' : 'Nuevo Turno'}
        </button>
      </div>

      {/* WIDGET CRONÓMETRO / RELOJ EN VIVO */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Control de Jornada en Vivo
          </span>
          <p className="text-xs text-slate-300 font-medium">
            Hoy es <span className="font-bold text-slate-100">{diaActualNombre}</span>
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 px-5 py-2.5 rounded-2xl text-center shadow-inner">
          <span className="font-mono text-2xl font-extrabold text-emerald-400 tracking-wider">
            {horaActualStr}
          </span>
        </div>
      </div>

      {/* FORMULARIO CREAR TURNO */}
      {mostrarForm && (
        <form onSubmit={handleCrearTurno} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Plus size={14} className="text-emerald-400" /> Asignar Nuevo Horario
          </h3>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Día de la semana</label>
              <select
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {DIAS_SEMANA.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Empleado / Encargado</label>
              <select
                value={empleado}
                onChange={(e) => setEmpleado(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {empleados.map((emp) => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Hora Inicio</label>
              <input
                type="time"
                required
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Hora Fin</label>
              <input
                type="time"
                required
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Notas Adicionales (Opcional)</label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. Relevo de caja / Apertura de local"
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/10">
            Guardar Turno
          </button>
        </form>
      )}

      {/* CRONOGRAMA DE TURNOS POR DÍA */}
      {cargando ? (
        <div className="p-8 text-center text-slate-500 text-xs font-mono">Cargando turnos...</div>
      ) : (
        <div className="space-y-4">
          {DIAS_SEMANA.map((diaNombre) => {
            const turnosDelDia = turnos.filter((t) => t.dia === diaNombre)
            const esHoy = diaNombre === diaActualNombre

            return (
              <div 
                key={diaNombre} 
                className={`border rounded-2xl p-4 space-y-3 transition-all ${
                  esHoy ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/5' : 'bg-slate-900/50 border-slate-800/80'
                }`}
              >
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-extrabold text-sm tracking-wide ${esHoy ? 'text-emerald-400' : 'text-slate-200'}`}>
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
                    {turnosDelDia.map((t) => (
                      <div
                        key={t.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex justify-between items-center gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                            <User size={13} className="text-emerald-400" />
                            <span>{t.empleado}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                            <Clock size={12} className="text-slate-500" />
                            <span>{t.hora_inicio} hs - {t.hora_fin} hs</span>
                          </div>
                          {t.notas && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5">{t.notas}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleEliminarTurno(t.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                          title="Eliminar turno"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}