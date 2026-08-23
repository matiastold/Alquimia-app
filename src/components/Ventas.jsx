import { useState, useEffect } from 'react'
import { ShoppingCart, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import LogroModal from './LogroModal'

const UMBRALES_VENTA = [50000, 70000, 80000, 90000, 100000]

const METODO_LABEL = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  anotacion: 'Anotación',
}

export default function Ventas() {
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [logroMensaje, setLogroMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [clientesLibreta, setClientesLibreta] = useState([])
  const [clienteLibretaId, setClienteLibretaId] = useState('')
  const [nombreNuevoCliente, setNombreNuevoCliente] = useState('')
  const [ventasHoy, setVentasHoy] = useState([])

  const cargarProductos = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) setError(error.message)
    else setProductos(data)
    setCargando(false)
  }

  const cargarClientesLibreta = async () => {
    const { data } = await supabase
      .from('clientes_libreta')
      .select('*')
      .order('nombre', { ascending: true })
    if (data) setClientesLibreta(data)
  }

  const cargarVentasHoy = async () => {
    const hoy = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('ventas')
      .select('id, total, metodo_pago, created_at, venta_items(cantidad, producto_id, productos(nombre))')
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)
      .order('created_at', { ascending: false })

    if (!error) setVentasHoy(data)
  }

  useEffect(() => {
    cargarProductos()
    cargarClientesLibreta()
    cargarVentasHoy()
  }, [])

  const categorias = Array.from(
    new Set(productos.map((p) => p.categoria).filter(Boolean))
  ).sort()

  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = !categoriaFiltro || p.categoria === categoriaFiltro
    return coincideBusqueda && coincideCategoria
  })

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.producto.id === producto.id)
      if (existente) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (productoId, cantidad) => {
    if (cantidad <= 0) {
      setCarrito((prev) => prev.filter((item) => item.producto.id !== productoId))
      return
    }
    setCarrito((prev) =>
      prev.map((item) =>
        item.producto.id === productoId ? { ...item, cantidad } : item
      )
    )
  }

  const quitarDelCarrito = (productoId) => {
    setCarrito((prev) => prev.filter((item) => item.producto.id !== productoId))
  }

  const total = carrito.reduce(
    (acc, item) => acc + item.producto.precio * item.cantidad,
    0
  )

  const crearClienteLibretaRapido = async () => {
    if (!nombreNuevoCliente.trim()) return
    const { data, error } = await supabase
      .from('clientes_libreta')
      .insert({ nombre: nombreNuevoCliente })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setClientesLibreta((prev) => [...prev, data])
    setClienteLibretaId(data.id)
    setNombreNuevoCliente('')
  }

  const verificarLogroVentaDiaria = async (userId, nombre) => {
    const hoy = new Date().toISOString().slice(0, 10)

    const { data: ventasDia } = await supabase
      .from('ventas')
      .select('total, created_at')
      .eq('vendedor_id', userId)
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)

    if (!ventasDia) return

    const totalHoy = ventasDia.reduce((acc, v) => acc + Number(v.total), 0)
    const alcanzados = UMBRALES_VENTA.filter((u) => totalHoy >= u)
    if (alcanzados.length === 0) return
    const mayorAlcanzado = Math.max(...alcanzados)

    const { data: existente } = await supabase
      .from('logros')
      .select('id')
      .eq('empleado_id', userId)
      .eq('tipo', 'venta_diaria')
      .eq('valor', mayorAlcanzado)
      .eq('fecha', hoy)
      .maybeSingle()

    if (existente) return

    await supabase.from('logros').insert({
      empleado_id: userId,
      tipo: 'venta_diaria',
      valor: mayorAlcanzado,
      fecha: hoy,
    })

    setLogroMensaje(
      `¡Felicidades ${nombre}! Vendiste $${mayorAlcanzado.toLocaleString()} hoy`
    )
  }

  const confirmarVenta = async () => {
    if (carrito.length === 0 || !metodoPago) return
    if (metodoPago === 'anotacion' && !clienteLibretaId) {
      setError('Elegí a qué cliente de la libreta anotarle esta venta.')
      return
    }

    setProcesando(true)
    setError('')
    setMensajeExito('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data: venta, error: errorVenta } = await supabase
      .from('ventas')
      .insert({
        vendedor_id: user.id,
        total,
        metodo_pago: metodoPago,
        cliente_libreta_id: metodoPago === 'anotacion' ? clienteLibretaId : null,
      })
      .select()
      .single()

    if (errorVenta) {
      setError(errorVenta.message)
      setProcesando(false)
      return
    }

    const items = carrito.map((item) => ({
      venta_id: venta.id,
      producto_id: item.producto.id,
      cantidad: item.cantidad,
      precio_unitario: item.producto.precio,
    }))

    const { error: errorItems } = await supabase.from('venta_items').insert(items)

    if (errorItems) {
      setError(errorItems.message)
      setProcesando(false)
      return
    }

    for (const item of carrito) {
      const nuevoStock = item.producto.stock_actual - item.cantidad
      await supabase
        .from('productos')
        .update({ stock_actual: nuevoStock })
        .eq('id', item.producto.id)
    }

    if (metodoPago === 'anotacion' && clienteLibretaId) {
      const descripcion = carrito.map((i) => `${i.cantidad}x ${i.producto.nombre}`).join(', ')
      await supabase.from('libreta_movimientos').insert({
        cliente_id: clienteLibretaId,
        descripcion,
        monto: total,
        venta_id: venta.id,
      })
    }

    const nombre = user.user_metadata?.nombre || user.email
    await verificarLogroVentaDiaria(user.id, nombre)

    setMensajeExito('Venta registrada correctamente.')
    setCarrito([])
    setMetodoPago('')
    setClienteLibretaId('')
    cargarProductos()
    cargarVentasHoy()
    setProcesando(false)
  }

  const eliminarVenta = async (venta) => {
    const confirmar = window.confirm(
      '¿Eliminar esta venta? Se va a restaurar el stock de los productos vendidos.'
    )
    if (!confirmar) return

    setError('')

    for (const item of venta.venta_items) {
      const { data: prodActual } = await supabase
        .from('productos')
        .select('stock_actual')
        .eq('id', item.producto_id)
        .maybeSingle()

      if (prodActual) {
        await supabase
          .from('productos')
          .update({ stock_actual: prodActual.stock_actual + item.cantidad })
          .eq('id', item.producto_id)
      }
    }

    const { error: errorDelete } = await supabase.from('ventas').delete().eq('id', venta.id)

    if (errorDelete) {
      setError(errorDelete.message)
      return
    }

    cargarProductos()
    cargarVentasHoy()
  }

  return (
    <div>
      <h2 className="font-display text-2xl flex items-center gap-2 mb-4 text-cream">
        <ShoppingCart size={22} className="text-sage" /> Registrar venta
      </h2>

      {error && <p className="text-ember text-sm mb-4">{error}</p>}
      {mensajeExito && <p className="text-success text-sm mb-4">{mensajeExito}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="mb-3 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            {categorias.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setCategoriaFiltro('')}
                  className={`shrink-0 px-3 py-1 rounded-full text-sm border transition-colors ${
                    categoriaFiltro === ''
                      ? 'bg-sage text-void border-sage'
                      : 'text-cream/60 border-sage/20 hover:bg-sage/10'
                  }`}
                >
                  Todas
                </button>
                {categorias.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoriaFiltro(c)}
                    className={`shrink-0 px-3 py-1 rounded-full text-sm border transition-colors ${
                      categoriaFiltro === c
                        ? 'bg-sage text-void border-sage'
                        : 'text-cream/60 border-sage/20 hover:bg-sage/10'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {cargando ? (
            <p className="text-cream/40">Cargando...</p>
          ) : (
            <div className="card divide-y divide-sage/10">
              {productosFiltrados.map((p) => (
                <div key={p.id} className="flex justify-between items-center px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-cream truncate">{p.nombre}</p>
                    <p className="text-sm text-cream/50 font-mono">
                      ${p.precio} — Stock: {p.stock_actual}
                    </p>
                  </div>
                  <button
                    onClick={() => agregarAlCarrito(p)}
                    disabled={p.stock_actual <= 0}
                    className="bg-sage/15 text-sage px-3 py-1 rounded-lg text-sm hover:bg-sage/25 disabled:opacity-30 shrink-0 ml-2"
                  >
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-cream/80 text-sm uppercase tracking-wide">
            Carrito
          </h3>
          <div className="card p-4">
            {carrito.length === 0 ? (
              <p className="text-cream/40 text-sm">No agregaste productos todavía.</p>
            ) : (
              <>
                <div className="divide-y divide-sage/10">
                  {carrito.map((item) => (
                    <div
                      key={item.producto.id}
                      className="flex justify-between items-center py-2"
                    >
                      <div>
                        <p className="font-medium text-cream">{item.producto.nombre}</p>
                        <p className="text-sm text-cream/50 font-mono">
                          ${item.producto.precio} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) =>
                            cambiarCantidad(item.producto.id, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-16 bg-void/40 border border-sage/20 rounded-lg px-2 py-1 text-cream font-mono"
                        />
                        <button
                          onClick={() => quitarDelCarrito(item.producto.id)}
                          className="text-ember text-sm"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-sage/10 font-bold text-cream">
                  <span>Total</span>
                  <span className="font-mono">${total.toFixed(2)}</span>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-cream/60 mb-2">Método de pago</p>
                  <div className="flex gap-2">
                    {[
                      { valor: 'efectivo', label: 'Efectivo' },
                      { valor: 'transferencia', label: 'Transferencia' },
                      { valor: 'anotacion', label: 'Anotación' },
                    ].map((op) => (
                      <button
                        key={op.valor}
                        type="button"
                        onClick={() => setMetodoPago(op.valor)}
                        className={`flex-1 px-2 py-2 rounded-lg text-sm border transition-colors ${
                          metodoPago === op.valor
                            ? 'bg-sage text-void border-sage'
                            : 'text-cream/60 border-sage/20 hover:bg-sage/10'
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                {metodoPago === 'anotacion' && (
                  <div className="mt-4 card p-3">
                    <p className="text-sm font-medium text-cream/60 mb-2">
                      ¿A nombre de quién anotamos?
                    </p>
                    <select
                      value={clienteLibretaId}
                      onChange={(e) => setClienteLibretaId(e.target.value)}
                      className="input-field mb-2"
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clientesLibreta.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nombreNuevoCliente}
                        onChange={(e) => setNombreNuevoCliente(e.target.value)}
                        placeholder="O cliente nuevo..."
                        className="input-field flex-1"
                      />
                      <button
                        type="button"
                        onClick={crearClienteLibretaRapido}
                        className="btn-ghost shrink-0"
                      >
                        + Crear
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={confirmarVenta}
                  disabled={procesando || !metodoPago}
                  className="btn-primary w-full mt-4 disabled:opacity-50"
                >
                  {procesando ? 'Procesando...' : 'Confirmar venta'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="font-semibold mb-2 text-cream/80 text-sm uppercase tracking-wide">
          Ventas de hoy
        </h3>
        {ventasHoy.length === 0 ? (
          <p className="text-cream/40 text-sm">Todavía no hay ventas hoy.</p>
        ) : (
          <div className="space-y-2">
            {ventasHoy.map((v) => {
              const resumen = v.venta_items
                .map((it) => `${it.cantidad}x ${it.productos?.nombre || 'producto eliminado'}`)
                .join(', ')
              const hora = new Date(v.created_at).toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <div key={v.id} className="card p-3 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-cream truncate">{resumen}</p>
                    <p className="text-xs text-cream/40">
                      {hora} · {METODO_LABEL[v.metodo_pago] || v.metodo_pago}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-sage font-medium">
                      ${Number(v.total).toFixed(2)}
                    </span>
                    <button
                      onClick={() => eliminarVenta(v)}
                      className="text-ember hover:bg-ember/10 p-1.5 rounded-lg"
                      title="Eliminar venta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {logroMensaje && (
        <LogroModal mensaje={logroMensaje} onCerrar={() => setLogroMensaje('')} />
      )}
    </div>
  )
}