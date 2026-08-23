import { useState, useEffect } from 'react'
import { BookOpen, ArrowLeft, Search, Plus, CheckCircle2, DollarSign, Calendar, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function Libreta() {
  const [clientes, setClientes] = useState([])
  const [saldos, setSaldos] = useState({})
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [error, setError] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)

  const cargarClientes = async () => {
    setCargando(true)
    const { data: clientesData, error: errorClientes } = await supabase
      .from('clientes_libreta')
      .select('*')
      .order('nombre', { ascending: true })

    if (errorClientes) {
      setError(errorClientes.message)
      setCargando(false)
      return
    }

    const { data: movimientos, error: errorMov } = await supabase
      .from('libreta_movimientos')
      .select('cliente_id, monto, pagado')

    if (!errorMov && movimientos) {
      const nuevosSaldos = {}
      movimientos.forEach((m) => {
        if (!m.pagado) {
          nuevosSaldos[m.cliente_id] = (nuevosSaldos[m.cliente_id] || 0) + Number(m.monto)
        }
      })
      setSaldos(nuevosSaldos)
    }

    setClientes(clientesData || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarClientes()
  }, [])

  const crearCliente = async (e) => {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('clientes_libreta').insert({ nombre: nombreNuevo })
    if (error) {
      setError(error.message)
      return
    }
    setNombreNuevo('')
    setMostrarForm(false)
    cargarClientes()
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (clienteSeleccionado) {
    return (
      <DetalleCliente
        cliente={clienteSeleccionado}
        onVolver={() => {
          setClienteSeleccionado(null)
          cargarClientes()
        }}
      />
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <BookOpen size={22} />
            </div>
            Libreta de Cuentas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de fiados y cuentas corrientes por cliente
          </p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-xs active:scale-95"
        >
          <Plus size={16} />
          {mostrarForm ? 'Cancelar' : 'Nuevo Cliente'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* FORMULARIO NUEVO CLIENTE */}
      {mostrarForm && (
        <form
          onSubmit={crearCliente}
          className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-4 backdrop-blur-md flex flex-col sm:flex-row gap-3 shadow-xl"
        >
          <input
            type="text"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre completo del cliente..."
            required
            className="flex-1 bg-slate-900/80 border border-slate-700/60 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
          />
          <button
            type="submit"
            className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all text-xs active:scale-95 shrink-0"
          >
            Guardar Cliente
          </button>
        </form>
      )}

      {/* BUSCADOR */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar cliente por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm shadow-inner"
        />
      </div>

      {/* LISTA DE CLIENTES */}
      {cargando ? (
        <div className="text-center py-12 text-xs text-slate-400 font-medium">
          Cargando libreta...
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-8 text-center text-xs text-slate-500">
          No hay clientes registrados en la libreta.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clientesFiltrados.map((c) => {
            const saldo = saldos[c.id] || 0
            const tieneDeuda = saldo > 0
            return (
              <button
                key={c.id}
                onClick={() => setClienteSeleccionado(c)}
                className="group bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4 flex items-center justify-between transition-all duration-200 hover:bg-slate-800/80 hover:border-emerald-500/40 active:scale-[0.98] text-left"
              >
                <div className="space-y-1 min-w-0 pr-2">
                  <p className="font-semibold text-slate-100 text-sm truncate">{c.nombre}</p>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Tocar para ver detalle de cuenta
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`font-mono text-sm font-bold block ${
                      tieneDeuda ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    ${saldo.toFixed(2)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                      tieneDeuda
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-700/30 text-slate-400'
                    }`}
                  >
                    {tieneDeuda ? 'Pendiente' : 'Al día'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DetalleCliente({ cliente, onVolver }) {
  const [movimientos, setMovimientos] = useState([])
  const [resumenes, setResumenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState('')

  const cargarDatos = async () => {
    setCargando(true)
    const { data: mov, error: errorMov } = await supabase
      .from('libreta_movimientos')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })

    if (errorMov) setError(errorMov.message)
    else setMovimientos(mov || [])

    const { data: res, error: errorRes } = await supabase
      .from('libreta_resumenes_mensuales')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    if (!errorRes) setResumenes(res || [])

    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const agregarMovimiento = async (e) => {
    e.preventDefault()
    setError('')

    const { error } = await supabase.from('libreta_movimientos').insert({
      cliente_id: cliente.id,
      descripcion,
      monto: parseFloat(monto),
    })

    if (error) {
      setError(error.message)
      return
    }

    setDescripcion('')
    setMonto('')
    setMostrarForm(false)
    cargarDatos()
  }

  const marcarPagado = async (movimiento) => {
    await supabase
      .from('libreta_movimientos')
      .update({ pagado: !movimiento.pagado })
      .eq('id', movimiento.id)
    cargarDatos()
  }

  const cerrarMes = async () => {
    setError('')
    const pendientes = movimientos.filter((m) => !m.pagado)
    if (pendientes.length === 0) {
      setError('No hay movimientos pendientes para cerrar.')
      return
    }

    const total = pendientes.reduce((acc, m) => acc + Number(m.monto), 0)
    const ahora = new Date()

    const { error: errorResumen } = await supabase.from('libreta_resumenes_mensuales').insert({
      cliente_id: cliente.id,
      mes: ahora.getMonth() + 1,
      anio: ahora.getFullYear(),
      total,
      cantidad_movimientos: pendientes.length,
    })

    if (errorResumen) {
      setError(errorResumen.message)
      return
    }

    const ids = pendientes.map((m) => m.id)
    await supabase.from('libreta_movimientos').update({ pagado: true }).in('id', ids)

    cargarDatos()
  }

  const saldoPendiente = movimientos
    .filter((m) => !m.pagado)
    .reduce((acc, m) => acc + Number(m.monto), 0)

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* BOTÓN REGRESAR */}
      <button
        onClick={onVolver}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors py-1"
      >
        <ArrowLeft size={16} /> Volver a Lista de Clientes
      </button>

      {/* TARJETA RESUMEN CLIENTE */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Cuenta Corriente
          </span>
          <h2 className="text-2xl font-extrabold text-slate-100">{cliente.nombre}</h2>
        </div>
        <div className="sm:text-right bg-slate-900/60 p-4 rounded-2xl border border-slate-700/40">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
            Saldo Pendiente
          </span>
          <p
            className={`text-3xl font-extrabold font-mono ${
              saldoPendiente > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            ${saldoPendiente.toFixed(2)}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ACCIONES RÁPIDAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-xs active:scale-95"
        >
          <Plus size={16} />
          {mostrarForm ? 'Cancelar' : 'Anotar Nuevo Fiado'}
        </button>
        <button
          onClick={cerrarMes}
          className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs active:scale-95"
        >
          <Calendar size={16} className="text-blue-400" />
          Cerrar Mes / Generar Boleta
        </button>
      </div>

      {/* FORMULARIO ANOTAR */}
      {mostrarForm && (
        <form
          onSubmit={agregarMovimiento}
          className="bg-slate-800/90 border border-slate-700/60 rounded-3xl p-5 space-y-4 backdrop-blur-xl shadow-2xl"
        >
          <h3 className="text-sm font-bold text-slate-200">Registrar Fiado</h3>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Descripción de lo que llevó
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
              className="w-full bg-slate-900/80 border border-slate-700/60 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              placeholder="Ej: 2 gaseosas y 1 paquete de galletas"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Monto Total ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              placeholder="0.00"
              className="w-full bg-slate-900/80 border border-slate-700/60 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all text-xs active:scale-95"
          >
            Guardar Anotación
          </button>
        </form>
      )}

      {/* DETALLE DE MOVIMIENTOS */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Histórico de Movimientos
        </h3>
        {cargando ? (
          <div className="text-center py-8 text-xs text-slate-400">Cargando movimientos...</div>
        ) : movimientos.length === 0 ? (
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-6 text-center text-xs text-slate-500">
            Sin movimientos registrados aún.
          </div>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl divide-y divide-slate-700/40 overflow-hidden backdrop-blur-md">
            {movimientos.map((m) => (
              <div
                key={m.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-slate-200 truncate">{m.descripcion}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {m.fecha} {m.hora?.slice(0, 5)}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span
                    className={`font-mono text-sm font-bold ${
                      m.pagado ? 'text-slate-500 line-through' : 'text-rose-400'
                    }`}
                  >
                    ${Number(m.monto).toFixed(2)}
                  </span>
                  <button
                    onClick={() => marcarPagado(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      m.pagado
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-700/40 text-slate-300 border border-slate-600/50 hover:bg-slate-700'
                    }`}
                  >
                    {m.pagado ? (
                      <>
                        <CheckCircle2 size={14} /> Pagado
                      </>
                    ) : (
                      'Marcar Pagado'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RESÚMENES MENSUALES */}
      {resumenes.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Resúmenes Mensuales Cerrados
          </h3>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl divide-y divide-slate-700/40 overflow-hidden backdrop-blur-md">
            {resumenes.map((r) => (
              <div key={r.id} className="p-4 flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">
                  {MESES[r.mes - 1]} {r.anio} ({r.cantidad_movimientos} fiados)
                </span>
                <span className="font-mono font-bold text-emerald-400">${Number(r.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}