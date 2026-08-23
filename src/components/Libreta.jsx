import { useState, useEffect } from 'react'
import { BookOpen, ArrowLeft, Search } from 'lucide-react'
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

    setClientes(clientesData)
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-2xl flex items-center gap-2 text-cream">
          <BookOpen size={22} className="text-sage" /> Libreta
        </h2>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary">
          {mostrarForm ? 'Cancelar' : '+ Cliente'}
        </button>
      </div>

      <p className="text-cream/50 text-sm mb-4">
        Clientes que se llevan productos fiado. Tocá un nombre para ver su cuenta.
      </p>

      {error && <p className="text-ember text-sm mb-4">{error}</p>}

      {mostrarForm && (
        <form onSubmit={crearCliente} className="card p-4 mb-4 flex gap-2">
          <input
            type="text"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre del cliente"
            required
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary shrink-0">
            Guardar
          </button>
        </form>
      )}

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {cargando ? (
        <p className="text-cream/40">Cargando...</p>
      ) : clientesFiltrados.length === 0 ? (
        <p className="text-cream/40">No hay clientes cargados todavía.</p>
      ) : (
        <div className="space-y-3">
          {clientesFiltrados.map((c) => {
            const saldo = saldos[c.id] || 0
            return (
              <button
                key={c.id}
                onClick={() => setClienteSeleccionado(c)}
                className="card p-4 w-full flex justify-between items-center text-left hover:bg-sage/5 transition-colors"
              >
                <span className="font-medium text-cream">{c.nombre}</span>
                <span
                  className={`font-mono font-semibold ${
                    saldo > 0 ? 'text-ember' : 'text-cream/40'
                  }`}
                >
                  ${saldo.toFixed(2)}
                </span>
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
    else setMovimientos(mov)

    const { data: res, error: errorRes } = await supabase
      .from('libreta_resumenes_mensuales')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    if (!errorRes) setResumenes(res)

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
    <div>
      <button
        onClick={onVolver}
        className="flex items-center gap-1 text-cream/60 hover:text-cream text-sm mb-4"
      >
        <ArrowLeft size={16} /> Volver a Libreta
      </button>

      <div className="card p-5 mb-6">
        <p className="text-sm text-cream/50 uppercase tracking-wide">{cliente.nombre}</p>
        <p className={`text-2xl font-bold font-mono ${saldoPendiente > 0 ? 'text-ember' : 'text-sage'}`}>
          ${saldoPendiente.toFixed(2)}
        </p>
        <p className="text-xs text-cream/40 mt-1">Saldo pendiente</p>
      </div>

      {error && <p className="text-ember text-sm mb-4">{error}</p>}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary flex-1">
          {mostrarForm ? 'Cancelar' : '+ Anotar'}
        </button>
        <button onClick={cerrarMes} className="btn-ghost flex-1">
          Cerrar mes / Generar boleta
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={agregarMovimiento} className="card p-4 mb-6">
          <label className="block text-sm font-medium text-cream/60 mb-1">Qué se llevó</label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            className="input-field mb-3"
            placeholder="Ej: 2 cuadernos y una lapicera"
          />
          <label className="block text-sm font-medium text-cream/60 mb-1">Monto</label>
          <input
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
            className="input-field mb-3"
          />
          <button type="submit" className="btn-primary w-full">
            Guardar
          </button>
        </form>
      )}

      <h3 className="font-semibold mb-2 text-cream/80 text-sm uppercase tracking-wide">
        Movimientos
      </h3>
      {cargando ? (
        <p className="text-cream/40">Cargando...</p>
      ) : movimientos.length === 0 ? (
        <p className="text-cream/40">Todavía no hay movimientos.</p>
      ) : (
        <div className="card divide-y divide-sage/10 mb-6">
          {movimientos.map((m) => (
            <div key={m.id} className="p-3 flex justify-between items-center gap-3">
              <div className="min-w-0">
                <p className="text-cream text-sm truncate">{m.descripcion}</p>
                <p className="text-xs text-cream/40 font-mono">
                  {m.fecha} {m.hora?.slice(0, 5)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`font-mono ${m.pagado ? 'text-cream/40' : 'text-ember'}`}>
                  ${Number(m.monto).toFixed(2)}
                </span>
                <button
                  onClick={() => marcarPagado(m)}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    m.pagado
                      ? 'border-success/30 text-success'
                      : 'border-sage/20 text-cream/50 hover:bg-sage/10'
                  }`}
                >
                  {m.pagado ? 'Pagado' : 'Marcar pagado'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resumenes.length > 0 && (
        <>
          <h3 className="font-semibold mb-2 text-cream/80 text-sm uppercase tracking-wide">
            Resúmenes mensuales
          </h3>
          <div className="card divide-y divide-sage/10">
            {resumenes.map((r) => (
              <div key={r.id} className="p-3 flex justify-between items-center">
                <span className="text-cream text-sm">
                  {MESES[r.mes - 1]} {r.anio} ({r.cantidad_movimientos} items)
                </span>
                <span className="font-mono text-sage font-medium">
                  ${Number(r.total).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}