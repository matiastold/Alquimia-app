import { useState, useEffect } from 'react'
import { CalendarClock, Trash2 } from 'lucide-react'
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

  // Turnos por día (nuevo)
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
    <div>
      {misTurnosHoy.length > 0 && (
        <div className="card p-5 mb-6 border-sage/30">
          <p className="text-sm text-cream/50 uppercase tracking-wide mb-2">Tu turno de hoy</p>
          {misTurnosHoy.map((t) => (
            <p key={t.id} className="text-cream font-mono mb-2">
              {t.hora_inicio} - {t.hora_fin}
            </p>
          ))}
          {yaMarcadoHoy ? (
            <p className="text-success text-sm">Ya marcaste este turno como cumplido hoy.</p>
          ) : (
            <button onClick={marcarCumplido} className="btn-primary">
              Marcar turno cumplido hoy
            </button>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-2xl flex items-center gap-2 text-cream">
          <CalendarClock size={22} className="text-sage" /> Turnos
        </h2>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary">
          {mostrarForm ? 'Cancelar' : '+ Asignar turno fijo'}
        </button>
      </div>

      {error && <p className="text-ember text-sm mb-4">{error}</p>}

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-cream/60 mb-1">Empleado</label>
            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              required
              className="input-field"
            >
              <option value="">Seleccionar...</option>
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-cream/60 mb-2">Días</label>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((dia) => (
                <button
                  type="button"
                  key={dia}
                  onClick={() => toggleDia(dia)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    diasSeleccionados.includes(dia)
                      ? 'bg-sage text-void border-sage'
                      : 'bg-transparent text-cream/60 border-sage/20 hover:bg-sage/10'
                  }`}
                >
                  {DIAS_LABEL[dia]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cream/60 mb-1">Hora inicio</label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cream/60 mb-1">Hora fin</label>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div className="col-span-2">
            <button type="submit" className="btn-primary">Guardar turno</button>
          </div>
        </form>
      )}

      {cargando ? (
        <p className="text-cream/40">Cargando turnos...</p>
      ) : turnos.length === 0 ? (
        <p className="text-cream/40">No hay turnos fijos asignados todavía.</p>
      ) : (
        <div className="card overflow-x-auto mb-10">
          <table className="w-full text-left">
            <thead className="bg-surface-light text-xs uppercase tracking-wide text-cream/40">
              <tr>
                <th className="px-5 py-3 font-medium">Día</th>
                <th className="px-5 py-3 font-medium">Empleado</th>
                <th className="px-5 py-3 font-medium">Horario</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {turnos.map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3 font-medium text-cream">{DIAS_LABEL[t.dia_semana]}</td>
                  <td className="px-5 py-3 text-cream/80">{t.perfiles?.nombre || 'Sin nombre'}</td>
                  <td className="px-5 py-3 font-mono text-cream/70">
                    {t.hora_inicio} - {t.hora_fin}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => eliminarTurno(t.id)} className="text-ember text-sm">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display text-xl text-cream">Turnos por día</h3>
        <button onClick={() => setMostrarFormDia(!mostrarFormDia)} className="btn-primary">
          {mostrarFormDia ? 'Cancelar' : '+ Asignar por día'}
        </button>
      </div>

      <p className="text-cream/50 text-sm mb-4">
        Para un día puntual (no recurrente). El empleado arranca y para el cronómetro con la hora
        real, para un control exacto.
      </p>

      {mostrarFormDia && (
        <form onSubmit={asignarTurnoDia} className="card p-6 mb-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-cream/60 mb-1">Empleado</label>
            <select
              value={empleadoIdDia}
              onChange={(e) => setEmpleadoIdDia(e.target.value)}
              required
              className="input-field"
            >
              <option value="">Seleccionar...</option>
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-cream/60 mb-1">Fecha</label>
            <input
              type="date"
              value={fechaDia}
              onChange={(e) => setFechaDia(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div className="col-span-2">
            <button type="submit" className="btn-primary">Asignar</button>
          </div>
        </form>
      )}

      {turnosDia.length === 0 ? (
        <p className="text-cream/40">No hay turnos por día pendientes.</p>
      ) : (
        <div className="grid gap-4">
          {turnosDia.map((t) => {
            const esMio = t.empleado_id === usuarioActual?.id
            const segundos =
              t.estado === 'en_curso' && t.hora_inicio
                ? Math.floor((ahora - new Date(t.hora_inicio).getTime()) / 1000)
                : 0

            return (
              <div key={t.id} className="card p-5 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="text-cream font-medium">{t.perfiles?.nombre || 'Sin nombre'}</p>
                  <p className="text-cream/50 text-sm font-mono">{t.fecha}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.estado === 'pendiente' && esMio && (
                    <button onClick={() => iniciarTurnoDia(t)} className="btn-primary">
                      Iniciar turno
                    </button>
                  )}
                  {t.estado === 'pendiente' && !esMio && (
                    <span className="text-cream/40 text-sm">Pendiente de iniciar</span>
                  )}
                  {t.estado === 'en_curso' && (
                    <div className="text-right">
                      <p className="font-mono text-xl text-sage mb-2">
                        {formatearDuracion(segundos)}
                      </p>
                      {esMio && (
                        <button onClick={() => finalizarTurnoDia(t)} className="btn-primary">
                          Finalizar turno
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => eliminarTurnoDia(t)}
                    className="text-ember hover:bg-ember/10 p-1.5 rounded-lg"
                    title="Eliminar turno por día"
                  >
                    <Trash2 size={16} />
                  </button>
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