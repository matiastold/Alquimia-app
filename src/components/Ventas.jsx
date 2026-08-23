import { useState, useEffect } from 'react'
import { Search, ShoppingCart, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { verificarLogrosVentas } from '../lib/logros'
import LogroModal from './LogroModal'

export default function Ventas() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [carrito, setCarrito] = useState([])
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [logroMensaje, setLogroMensaje] = useState('')

  const cargarProductos = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setProductos(data || [])
      const cats = [...new Set((data || []).map((p) => p.categoria).filter(Boolean))]
      setCategorias(cats)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarProductos()
  }, [])

  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_barras && p.codigo_barras.includes(busqueda))
    const coincideCategoria = !categoriaFiltro || p.categoria === categoriaFiltro
    return coincideBusqueda && coincideCategoria
  })

  const agregarAlCarrito = (producto) => {
    setError('')
    setMensajeExito('')
    setCarrito((prev) => {
      const existe = prev.find((item) => item.producto.id === producto.id)
      if (existe) {
        if (existe.cantidad >= producto.stock_actual) {
          setError(`No hay suficiente stock para ${producto.nombre}`)
          return prev
        }
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (productoId, nuevaCantidad) => {
    setError('')
    if (nuevaCantidad <= 0) {
      quitarDelCarrito(productoId)
      return
    }

    const itemExistente = carrito.find((i) => i.producto.id === productoId)
    if (itemExistente && nuevaCantidad > itemExistente.producto.stock_actual) {
      setError(`Stock máximo alcanzado para ${itemExistente.producto.nombre}`)
      return
    }

    setCarrito((prev) =>
      prev.map((item) =>
        item.producto.id === productoId ? { ...item, cantidad: nuevaCantidad } : item
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

  const confirmarVenta = async () => {
    if (carrito.length === 0) return
    setProcesando(true)
    setError('')
    setMensajeExito('')

    const { data: { user } } = await supabase.auth.getUser()

    // 1. Insertar Venta Principal
    const { data: ventaData, error: ventaError } = await supabase
      .from('ventas')
      .insert({
        vendedor_id: user.id,
        total,
        metodo_pago: metodoPago,
      })
      .select()
      .single()

    if (ventaError) {
      setError(ventaError.message)
      setProcesando(false)
      return
    }

    // 2. Insertar Detalle de Ventas y Actualizar Stock
    for (const item of carrito) {
      await supabase.from('detalles_venta').insert({
        venta_id: ventaData.id,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
        subtotal: item.producto.precio * item.cantidad,
      })

      const nuevoStock = item.producto.stock_actual - item.cantidad
      await supabase
        .from('productos')
        .update({ stock_actual: nuevoStock })
        .eq('id', item.producto.id)
    }

    // 3. Verificar Logros
    const nombre = user.user_metadata?.nombre || user.email
    const msg = await verificarLogrosVentas(user.id, nombre)
    if (msg) setLogroMensaje(msg)

    setMensajeExito('Venta registrada con éxito')
    setCarrito([])
    setProcesando(false)
    cargarProductos()
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* MENSAJES DE ESTADO */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {mensajeExito && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
        {/* SECCIÓN CATÁLOGO DE PRODUCTOS */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Header con Buscador e Insignias */}
          <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md pt-2 pb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm shadow-inner"
              />
            </div>

            {/* Categorías Chip Carousel */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setCategoriaFiltro('')}
                className={`px-4 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  categoriaFiltro === ''
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                }`}
              >
                Todos
              </button>
              {categorias.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoriaFiltro(c)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    categoriaFiltro === c
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Rejilla de Productos */}
          {cargando ? (
            <div className="text-center py-12 text-xs text-slate-400">Cargando catálogo...</div>
          ) : productosFiltrados.length === 0 ? (
            <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-8 text-center text-xs text-slate-500">
              No se encontraron productos disponibles.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {productosFiltrados.map((p) => {
                const sinStock = p.stock_actual <= 0
                return (
                  <div
                    key={p.id}
                    onClick={() => !sinStock && agregarAlCarrito(p)}
                    className={`group relative bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4 flex justify-between items-center transition-all duration-200 active:scale-[0.98] ${
                      sinStock
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:border-emerald-500/40 hover:bg-slate-800/80 cursor-pointer'
                    }`}
                  >
                    <div className="space-y-1 pr-2 min-w-0">
                      <p className="font-semibold text-slate-100 text-sm truncate">{p.nombre}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">${p.precio}</span>
                        <span className="text-[10px] text-slate-500 font-medium">Stock: {p.stock_actual}</span>
                      </div>
                    </div>
                    <button
                      disabled={sinStock}
                      className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shrink-0"
                    >
                      +
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* SECCIÓN CARRITO Y DETALLE DE COBRO */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-slate-800/90 border border-slate-700/60 rounded-3xl p-5 sticky top-6 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <ShoppingCart size={18} className="text-emerald-400" />
                Resumen de Venta
              </h3>
              <span className="text-xs bg-slate-700/50 text-slate-300 px-2.5 py-1 rounded-full font-mono">
                {carrito.reduce((acc, item) => acc + item.cantidad, 0)} items
              </span>
            </div>

            {/* Lista de Items seleccionados */}
            {carrito.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-medium">
                El carrito está vacío. Toca un producto para añadirlo.
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-700/30 my-3 pr-1">
                {carrito.map((item) => (
                  <div key={item.producto.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.producto.nombre}</p>
                      <p className="text-xs font-mono text-emerald-400/80">${item.producto.precio} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-700 rounded-xl bg-slate-900/60 overflow-hidden">
                        <button
                          onClick={() => cambiarCantidad(item.producto.id, item.cantidad - 1)}
                          className="px-2.5 py-1 text-slate-400 hover:text-slate-100 transition-colors"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono text-xs font-bold text-slate-200">{item.cantidad}</span>
                        <button
                          onClick={() => cambiarCantidad(item.producto.id, item.cantidad + 1)}
                          className="px-2.5 py-1 text-slate-400 hover:text-slate-100 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => quitarDelCarrito(item.producto.id)}
                        className="p-1.5 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Métodos de Pago y Total */}
            <div className="space-y-3 pt-3 border-t border-slate-700/50">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Método de Pago</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'efectivo', label: 'Efectivo' },
                  { id: 'transferencia', label: 'Transf.' },
                  { id: 'anotacion', label: 'Anotación' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMetodoPago(m.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-medium border transition-all text-center ${
                      metodoPago === m.id
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-700/30'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-sm text-slate-400">Total a Cobrar</span>
                  <span className="text-2xl font-bold font-mono text-slate-100">${total.toFixed(2)}</span>
                </div>
                <button
                  onClick={confirmarVenta}
                  disabled={procesando || !metodoPago || carrito.length === 0}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
                >
                  {procesando ? 'Procesando...' : 'Confirmar Venta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE LOGROS */}
      {logroMensaje && <LogroModal mensaje={logroMensaje} onCerrar={() => setLogroMensaje('')} />}
    </div>
  )
}