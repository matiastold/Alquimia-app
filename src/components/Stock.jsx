import { useState, useEffect } from 'react'
import { Package, Search, Plus, X, AlertTriangle, TrendingUp, Tag, Layers } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Stock() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [precio, setPrecio] = useState('')
  const [stockActual, setStockActual] = useState('')
  const [stockMinimo, setStockMinimo] = useState('5')
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const { error } = await supabase.from('productos').insert({
      nombre,
      categoria: categoria || null,
      precio_compra: precioCompra ? parseFloat(precioCompra) : null,
      precio: parseFloat(precio),
      stock_actual: parseInt(stockActual, 10),
      stock_minimo: parseInt(stockMinimo, 10),
    })

    if (error) {
      setError(error.message)
      return
    }

    setNombre('')
    setCategoria('')
    setPrecioCompra('')
    setPrecio('')
    setStockActual('')
    setStockMinimo('5')
    setMostrarForm(false)
    cargarProductos()
  }

  const ajustarStock = async (producto, cambio) => {
    const nuevoStock = producto.stock_actual + cambio
    if (nuevoStock < 0) return

    const { error } = await supabase
      .from('productos')
      .update({ stock_actual: nuevoStock })
      .eq('id', producto.id)

    if (error) setError(error.message)
    else cargarProductos()
  }

  const categorias = Array.from(
    new Set(productos.map((p) => p.categoria).filter(Boolean))
  ).sort()

  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = !categoriaFiltro || p.categoria === categoriaFiltro
    return coincideBusqueda && coincideCategoria
  })

  // Estadísticas rápidas para el header
  const totalProductos = productos.length
  const productosBajoStock = productos.filter((p) => p.stock_actual <= p.stock_minimo).length

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* HEADER Y ESTADÍSTICAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Package size={22} />
            </div>
            Gestión de Stock
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Control de inventario, precios y alertas de reabastecimiento
          </p>
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg active:scale-[0.98] ${
            mostrarForm
              ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
          }`}
        >
          {mostrarForm ? (
            <>
              <X size={16} /> Cancelar
            </>
          ) : (
            <>
              <Plus size={16} /> Nuevo Producto
            </>
          )}
        </button>
      </div>

      {/* TARJETAS DE RESUMEN RÁPIDO */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md">
          <div className="p-2.5 bg-slate-700/40 rounded-xl text-slate-300">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Ítems</p>
            <p className="text-xl font-bold font-mono text-slate-100 mt-0.5">{totalProductos}</p>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md">
          <div className={`p-2.5 rounded-xl ${productosBajoStock > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700/40 text-slate-300'}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bajo Stock</p>
            <p className={`text-xl font-bold font-mono mt-0.5 ${productosBajoStock > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
              {productosBajoStock}
            </p>
          </div>
        </div>
      </div>

      {/* MENSAJE DE ERROR */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* FORMULARIO AGREGAR PRODUCTO */}
      {mostrarForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <h3 className="text-sm font-bold text-slate-200 mb-4 pb-3 border-b border-slate-700/60 flex items-center gap-2">
            <Plus size={16} className="text-emerald-400" /> Registrar Nuevo Producto
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Nombre del producto
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Ej. Galletas de Chocolate 200g"
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Categoría <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                list="lista-categorias"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej. Almacén, Bebidas, Golosinas..."
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
              <datalist id="lista-categorias">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Precio compra <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={precioCompra}
                  onChange={(e) => setPrecioCompra(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl pl-8 pr-3.5 py-2.5 text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Precio venta
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl pl-8 pr-3.5 py-2.5 text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Stock inicial
              </label>
              <input
                type="number"
                value={stockActual}
                onChange={(e) => setStockActual(e.target.value)}
                required
                placeholder="0"
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Stock mínimo
              </label>
              <input
                type="number"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                required
                placeholder="5"
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700/60 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
            >
              Guardar Producto
            </button>
          </div>
        </form>
      )}

      {/* CONTROLES DE FILTRO Y BÚSQUEDA */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre de producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm shadow-inner"
          />
        </div>

        {/* Carrusel horizontal de categorías */}
        {categorias.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            <button
              onClick={() => setCategoriaFiltro('')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                categoriaFiltro === ''
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
              }`}
            >
              Todas
            </button>
            {categorias.map((c) => (
              <button
                key={c}
                onClick={() => setCategoriaFiltro(c)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  categoriaFiltro === c
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LISTADO DE PRODUCTOS */}
      {cargando ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Cargando inventario...</p>
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-8 text-center space-y-2">
          <Package size={32} className="mx-auto text-slate-600" />
          <p className="text-sm font-medium text-slate-300">No se encontraron productos</p>
          <p className="text-xs text-slate-500">Prueba ajustando la búsqueda o agregando un nuevo ítem.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {productosFiltrados.map((p) => {
            const bajo = p.stock_actual <= p.stock_minimo
            const ganancia = p.precio_compra ? p.precio - p.precio_compra : null

            return (
              <div
                key={p.id}
                className={`bg-slate-800/50 border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${
                  bajo
                    ? 'border-rose-500/30 bg-rose-500/[0.02]'
                    : 'border-slate-700/40 hover:border-slate-600/60'
                }`}
              >
                {/* Info del Producto */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-100 text-sm truncate">{p.nombre}</h4>
                    {bajo && (
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle size={10} /> Bajo stock
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {p.categoria && (
                      <span className="bg-slate-700/50 text-slate-300 border border-slate-600/30 px-2 py-0.5 rounded-lg text-[11px] font-medium flex items-center gap-1">
                        <Tag size={10} className="text-slate-400" />
                        {p.categoria}
                      </span>
                    )}
                    <span className="font-mono text-emerald-400 font-bold">${p.precio}</span>
                    {ganancia !== null && (
                      <span className="font-mono text-slate-500 text-[11px] flex items-center gap-0.5">
                        <TrendingUp size={10} /> +${ganancia.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ajustador Táctil de Stock */}
                <div className="flex items-center gap-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => ajustarStock(p, -1)}
                    className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 flex items-center justify-center font-bold text-base active:scale-95 transition-all"
                    title="Disminuir stock"
                  >
                    −
                  </button>
                  <span
                    className={`font-mono font-bold text-sm min-w-[24px] text-center ${
                      bajo ? 'text-rose-400' : 'text-slate-100'
                    }`}
                  >
                    {p.stock_actual}
                  </span>
                  <button
                    onClick={() => ajustarStock(p, 1)}
                    className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 flex items-center justify-center font-bold text-base active:scale-95 transition-all"
                    title="Aumentar stock"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}