import { useState, useEffect } from 'react'
import { ShoppingCart, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import LogroModal from './LogroModal'

const UMBRALES_VENTA = [50000, 70000, 80000, 90000, 100000]

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

  useEffect(() => {
    cargarProductos()
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

  const verificarLogroVentaDiaria = async (userId, nombre) => {
    const hoy = new Date().toISOString().slice(0, 10)

    const { data: ventasHoy } = await supabase
      .from('ventas')
      .select('total, created_at')
      .eq('vendedor_id', userId)
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)

    if (!ventasHoy) return

    const totalHoy = ventasHoy.reduce((acc, v) => acc + Number(v.total), 0)
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
    setProcesando(true)
    setError('')
    setMensajeExito('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data: venta, error: errorVenta } = await supabase
      .from('ventas')
      .insert({ vendedor_id: user.id, total, metodo_pago: metodoPago })
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

    const nombre = user.user_metadata?.nombre || user.email
    await verificarLogroVentaDiaria(user.id, nombre)

    setMensajeExito('Venta registrada correctamente.')
    setCarrito([])
    setMetodoPago('')
    cargarProductos()
    setProcesando(false)
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

      {logroMensaje && (
        <LogroModal mensaje={logroMensaje} onCerrar={() => setLogroMensaje('')} />
      )}
    </div>
  )
}