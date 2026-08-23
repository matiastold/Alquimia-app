import { useState, useEffect } from 'react'
import { Play, Square, Clock, Calendar, CheckCircle2, User } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// Horarios fijos de referencia (Guía visual)
const HORARIOS_REFERENCIA = [
  { dia: 'Lunes', empleado: 'Matías Toledo', horario: '09:00 - 13:00 hs' },
  { dia: 'Lunes', empleado: 'Ariel', horario: '18:00 - 22:00 hs' },
  { dia: 'Martes', empleado: 'Ariel', horario: '09:15 - 13:15 hs' },
  { dia: 'Martes', empleado: 'Zoe', horario: '18:00 - 22:30 hs' },
  { dia: 'Miércoles', empleado: 'Matías Toledo', horario: '09:00 - 13:00 hs' },
  { dia: 'Jueves', empleado: 'Ariel', horario: '09:15 - 13:15 hs' },
  { dia: 'Jueves', empleado: 'Zoe', horario: '18:00 - 22:30 hs' },
]

export default function Turnos() {
  const [usuario, setUsuario] = useState(null)
  const [turnoActivo, setTurnoActivo] = useState(null)
  const [segundos, setSegundos] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [resumenUltimoTurno, setResumenUltimoTurno] = useState(null)

  useEffect(() => {
    comprobarEstadoTurno()
  }, [])

  // Cronómetro dinámico
  useEffect(() => {
    let intervalo = null
    if (turnoActivo) {
      intervalo = setInterval(() => {
        const inicio = new Date(turnoActivo.hora_inicio).getTime()
        const ahora = new Date().getTime()
        setSegundos(Math.floor((ahora - inicio) / 1000))
      }, 1000)
    } else {
      setSegundos(0)
    }
    return () => clearInterval(intervalo)
  }, [turnoActivo])

  const comprobarEstadoTurno = async () => {
    setCargando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUsuario(user)

    const { data } = await supabase
      .from('registro_turnos')
      .select('*')
      .eq('empleado_id', user.id)
      .eq('estado', 'en_curso')
      .maybeSingle()

    if (data) {
      setTurnoActivo(data)
    }
    setCargando(false)
  }

  const iniciarTurno = async () => {
    if (!usuario) return
    const nombre = usuario.user_metadata?.nombre || usuario.email.split('@')[0]
    const horaInicio = new Date().toISOString()

    const { data, error } = await supabase
      .from('registro_turnos')
      .insert([
        {
          empleado_id: usuario.id,
          nombre_empleado: nombre,
          hora_inicio: horaInicio,
          estado: 'en_curso'
        }
      ])
      .select()
      .single()

    if (!error && data) {
      setTurnoActivo(data)
      setResumenUltimoTurno(null)
    }
  }

  const finalizarTurno = async () => {
    if (!turnoActivo) return
    const horaFin = new Date().toISOString()
    const inicioMs = new Date(turnoActivo.hora_inicio).getTime()
    const duracionSeg = Math.floor((new Date().getTime() - inicioMs) / 1000)

    const { error } = await supabase
      .from('registro_turnos')
      .update({
        hora_fin: horaFin,
        duracion_segundos: duracionSeg,
        estado: 'finalizado'
      })
      .eq('id', turnoActivo.id)

    if (!error) {
      setResumenUltimoTurno({
        inicio: new Date(turnoActivo.hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duracion: formatearTiempo(duracionSeg),
        fecha: new Date().toLocaleDateString()
      })
      setTurnoActivo(null)
    }
  }

  const formatearTiempo = (totalSegundos) => {
    const hrs = Math.floor(totalSegundos / 3600)
    const mins = Math.floor((totalSegundos % 3600) / 60)
    const segs = totalSegundos % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`
  }

  if (cargando) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        Cargando cronómetro de turnos...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* SECCIÓN CRONÓMETRO DE TURNO */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-center gap-2 mb-2 text-slate-400">
          <Clock size={18} className="text-emerald-400" />
          <span className="text-xs font-semibold tracking-wider uppercase font-mono">
            Control de Jornada en Tiempo Real
          </span>
        </div>

        {/* DISPLAY DEL TIEMPO */}
        <div className="my-4">
          <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-100">
            {formatearTiempo(segundos)}
          </span>
        </div>

        {/* ACCIONES */}
        {!turnoActivo ? (
          <button
            onClick={iniciarTurno}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-xs active:scale-95 flex items-center justify-center gap-2 mx-auto"
          >
            <Play size={18} fill="currentColor" /> Iniciar Mi Turno
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-emerald-400 font-medium animate-pulse">
              ● Turno iniciado a las {new Date(turnoActivo.hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
            </p>
            <button
              onClick={finalizarTurno}
              className="w-full sm:w-auto px-8 py-3.5 bg-rose-500 hover:bg-rose-400 text-white font-extrabold rounded-2xl shadow-lg shadow-rose-500/20 transition-all text-xs active:scale-95 flex items-center justify-center gap-2 mx-auto"
            >
              <Square size={18} fill="currentColor" /> Finalizar y Registrar Turno
            </button>
          </div>
        )}

        {/* TARJETA RESUMEN POST-TURNO */}
        {resumenUltimoTurno && (
          <div className="mt-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-left text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
              <CheckCircle2 size={16} /> ¡Turno Guardado Correctamente!
            </div>
            <p className="text-slate-300"><b>Fecha:</b> {resumenUltimoTurno.fecha}</p>
            <p className="text-slate-300"><b>Horario real:</b> {resumenUltimoTurno.inicio} hs a {resumenUltimoTurno.fin} hs</p>
            <p className="text-slate-300"><b>Tiempo total trabajado:</b> {resumenUltimoTurno.duracion}</p>
          </div>
        )}
      </div>

      {/* HORARIOS FIJOS DE REFERENCIA */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-200">Horarios Fijos de Referencia</h3>
        </div>

        <div className="divide-y divide-slate-800/60">
          {HORARIOS_REFERENCIA.map((item, index) => (
            <div key={index} className="py-2.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-200">{item.dia}</span>
                <div className="flex items-center gap-1 text-slate-400">
                  <User size={12} /> {item.empleado}
                </div>
              </div>
              <span className="font-mono bg-slate-800/80 px-2.5 py-1 rounded-xl text-emerald-400 font-semibold border border-slate-700/50">
                {item.horario}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}