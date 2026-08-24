import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, Clock, User, AlertCircle, CheckCircle2 } from 'lucide-react'
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

  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setCargando(true)
    const { data: turnosData } = await supabase.from('turnos').select('*').order('id', { ascending: true })
    if (turnosData) setTurnos(turnosData)

    const { data: profilesData } = await supabase.from('perfiles').select('nombre').order('nombre')
    
    if (profilesData && profilesData.length > 0) {
      const nombres = profilesData.map(p => p.nombre).filter(Boolean)
      setEmpleados(nombres)
      if (nombres.length > 0) setEmpleado(nombres[0])
    } else {
      const listaGenerica = ['Matías Toledo', 'Ariel', 'Zoe']
      setEmpleados(listaGenerica)
      setEmpleado(listaGenerica[0])
    }

    setCargando(false)
  }

  const handleCrearTurno = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('turnos').insert({
      dia,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      empleado,
      estado: 'pendiente',
      notas: notas.trim() || null,
    })

    if (!error) {
      setNotas('')
      setMostrarForm(false)
      cargarDatos()
    } else {
      setError(error.message)
    }
  }

  // Marcar como Finalizado
  const handleFinalizarTurno = async (id) => {
    const { error } = await supabase.from('turnos').update({ estado: 'finalizado' }).eq('id', id)
    if (!error) cargarDatos()
  }

  const handleEliminarTurno = async (id) => {
    if (!window.confirm('¿Eliminar este turno?')) return
    const { error } = await supabase.from('turnos').delete().eq('id', id)
    if (!error) cargarDatos()
  }

  const diasMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const diaActualNombre = diasMap[ahora.getDay()]

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
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg active:scale-[0.98] ${
            mostrarForm ? 'bg-slate-800 text-slate-300' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
          }`}
        >
          <Plus size={16} /> {mostrarForm ? 'Cancelar' : 'Nuevo Turno'}
        </button>
      </div>

      {/* RELOJ EN VIVO */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> CONTROL DE JORNADA EN VIVO
          </span>
          <p className="text-xs text-slate-300 font-medium">Hoy es <span className="font-bold text-slate-100">{diaActualNombre}</span></p>
        </div>
        <div className="bg-slate-950 border border-slate-800 px-5 py-2.5 rounded-2xl font-mono text-2xl font-extrabold text-emerald-400">
          {ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* FORMULARIO */}
      {mostrarForm && (
        <form onSubmit={handleCrearTurno} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Día</label>
              <select value={dia} onChange={(e) => setDia(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100">
                {DIAS_SEMANA.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Empleado</label>
              <select value={empleado} onChange={(e) => setEmpleado(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100">
                {empleados.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Hora Inicio</label>
              <input type="time" required value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Hora Fin</label>
              <input type="time" required value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100" />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs">Guardar Turno</button>
        </form>
      )}

      {/* VISTA DÍAS */}
      <div className="space-y-4">
        {DIAS_SEMANA.map((diaNombre) => {
          const turnosDelDia = turnos.filter((t) => t.dia === diaNombre)
          return (
            <div key={diaNombre} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                <h4 className="font-extrabold text-emerald-400 text-sm">{diaNombre}</h4>
                <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                  {turnosDelDia.length} TURNOS
                </span>
              </div>

              {turnosDelDia.length === 0 ? (
                <p className="text-xs text-slate-600 italic">Sin turnos asignados para este día.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {turnosDelDia.map((t) => (
                    <div key={t.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex justify-between items-center gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                          <User size={13} className="text-emerald-400" />
                          <span>{t.empleado}</span>
                          {t.estado === 'finalizado' && (
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Finalizado</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                          <Clock size={12} className="text-slate-500" />
                          <span>{t.hora_inicio} hs - {t.hora_fin} hs</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {t.estado !== 'finalizado' && (
                          <button
                            onClick={() => handleFinalizarTurno(t.id)}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                            title="Finalizar turno"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button onClick={() => handleEliminarTurno(t.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}