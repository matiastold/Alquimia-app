import { useState, useEffect } from 'react'
import { ShoppingCart, Search, Folder, ArrowLeft, Plus, Trash2, CreditCard, Banknote, BookOpen, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Ventas() {
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const { data: catData } = await supabase.from('categorias').select('*').order('nombre')
    const { data: prodData } = await supabase.from('productos').select('*').order('nombre')

    const listaCats = catData || []
    if (!listaCats.some(c => c.nombre.toLowerCase() === 'general')) {
      listaCats.unshift({ id: 'general', nombre: 'General' })
    }

    setCategorias(listaCats)
    setProductos(prodData || [])
  }

  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) {
      alert('Sin stock suficiente')
      return
    }

    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id)
      if (existe) {
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item)
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  const eliminarDelCarrito = (id) => {
    setCarrito(prev => prev.filter(item => item.id !== id))
  }

  const totalCarrito = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)

  const handleConfirmarVenta = async () => {
    if (carrito.length === 0) return
    setProcesando(true)

    // Formatear detalle para guardar en la base de datos
    const detallesVenta = carrito.map(item => ({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      cantidad: item.cantidad,
      subtotal: item.precio * item.cantidad
    }))

    const { error } = await supabase.from('ventas').insert({
      total: totalCarrito,
      metodo_pago: metodoPago,
      detalles: detallesVenta
    })

    if (!error) {
      // Descontar Stock
      for (const item of carrito) {
        await supabase.from('productos').update({ stock: item.stock - item.cantidad }).eq('id', item.id)
      }
      setCarrito([])
      cargarDatos()
      alert('¡Venta realizada con éxito!')
    } else {
      alert('Error al procesar la venta: ' + error.message)
    }

    setProcesando(false)
  }

  const productosFiltrados = productos.filter(p => {
    if (busqueda.trim() !== '') return p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return (p.categoria || 'General').toLowerCase() === (categoriaSeleccionada?.nombre || 'general').toLowerCase()
  })

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <ShoppingCart size={22} />
          </div>
          Punto de Venta
        </h2>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-3.5 text-slate-500" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto para venta rápida..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
        />
      </div>

      {/* SELECCIÓN DE CATEGORÍAS EN CARDS EN Malla 2 COLUMNAS */}
      {!categoriaSeleccionada && busqueda.trim() === '' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categorias.map((cat) => (
            <button
              key={cat.id || cat.nombre}
              onClick={() => setCategoriaSeleccionada(cat)}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl flex flex-col justify-between text-left transition-all active:scale-[0.98] group"
            >
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 w-fit mb-3">
                <Folder size={20} />
              </div>
              <h4 className="font-bold text-slate-100 text-sm capitalize group-hover:text-emerald-400">{cat.nombre}</h4>
            </button>
          ))}
        </div>
      ) : (
        /* PRODUCTOS DE LA CATEGORÍA */
        <div className="space-y-3">
          <button
            onClick={() => { setCategoriaSeleccionada(null); setBusqueda('') }}
            className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl"
          >
            <ArrowLeft size={16} /> Volver a Categorías
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {productosFiltrados.map((p) => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-xs text-slate-100 capitalize">{p.nombre}</h4>
                  <p className="text-[11px] font-mono text-emerald-400 font-bold">${p.precio}</p>
                </div>
                <button
                  onClick={() => agregarAlCarrito(p)}
                  className="px-3 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TICKET ACTUAL / DETALLE DE PAGO Y CANCELACIÓN */}
      {carrito.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Ticket Actual</h3>
            <button
              onClick={() => setCarrito([])}
              className="text-xs text-rose-400 font-bold hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
            >
              <X size={14} /> Cancelar Ticket
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {carrito.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-100 capitalize">{item.nombre}</span>
                  <p className="text-[10px] text-slate-400 font-mono">${item.precio} c/u x {item.cantidad}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-emerald-400 font-bold text-xs">${item.precio * item.cantidad}</span>
                  <button onClick={() => eliminarDelCarrito(item.id)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* SELECCIÓN MÉTODO DE PAGO */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Método de Pago</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  metodoPago === 'efectivo'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Banknote size={14} /> Efectivo
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago('transferencia')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  metodoPago === 'transferencia'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <CreditCard size={14} /> Transf.
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago('libreta')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  metodoPago === 'libreta'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <BookOpen size={14} /> Libreta
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800 pt-3">
            <span className="text-sm font-bold text-slate-100">Total a Cobrar:</span>
            <span className="text-xl font-mono font-extrabold text-emerald-400">${totalCarrito}</span>
          </div>

          <button
            disabled={procesando}
            onClick={handleConfirmarVenta}
            className="w-full py-3.5 bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
          >
            {procesando ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      )}
    </div>
  )
}