import { useState, useEffect } from 'react'
import { Package, Search, Plus, X, AlertTriangle, Tag, FolderPlus, ArrowRightLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Stock() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarNuevaCat, setMostrarNuevaCat] = useState(false)
  
  // Campos del Formulario
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('General')
  const [nuevaCatNombre, setNuevaCatNombre] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [precio, setPrecio] = useState('')
  const [stockActual, setStockActual] = useState('')
  const [stockMinimo, setStockMinimo] = useState('5')
  
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setCargando(true)
    // 1. Cargar Categorías
    const { data: catData } = await supabase.from('categorias').select('*').order('nombre')
    if (catData && catData.length > 0) {
      setCategorias(catData.map(c => c.nombre))
    } else {
      setCategorias(['General', 'Librería', 'Perfumería'])
    }

    // 2. Cargar Productos
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) setError(error.message)
    else setProductos(data || [])
    setCargando(false)
  }

  // Mover producto de categoría
  const moverDeCategoria = async (productoId, nuevaCategoria) => {
    const { error } = await supabase
      .from('productos')
      .update({ categoria: nuevaCategoria })
      .eq('id', productoId)

    if (error) setError(error.message)
    else cargarDatos()
  }

  // Crear nueva categoría dinámicamente
  const handleCrearCategoria = async (e) => {
    e.preventDefault()
    if (!nuevaCatNombre.trim()) return

    const { error } = await supabase
      .from('categorias')
      .insert([{ nombre: nuevaCatNombre.trim() }])

    if (!error) {
      setCategorias(prev => [...prev, nuevaCatNombre.trim()])
      setCategoria(nuevaCatNombre.trim())
      setNuevaCatNombre('')
      setMostrarNuevaCat(false)
    } else {
      setError("La categoría ya existe o hubo un error.")
    }
  }

  // Crear producto
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const { error } = await supabase.from('productos').insert({
      nombre,
      categoria: categoria || 'General',
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
    setPrecioCompra('')
    setPrecio('')
    setStockActual('')
    setStockMinimo('5')
    setMostrarForm(false)
    cargarDatos()
  }

  const ajustarStock = async (producto, cambio) => {
    const nuevoStock = producto.stock_actual + cambio
    if (nuevoStock < 0) return

    const { error } = await supabase
      .from('productos')
      .update({ stock_actual: nuevoStock })
      .eq('id', producto.id)

    if (error) setError(error.message)
    else cargarDatos()
  }

  // BÚSQUEDA GLOBAL: Si hay texto en 'busqueda', ignora el filtro de categoría seleccionada
  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    if (busqueda.trim() !== '') {
      return coincideBusqueda
    }
    if (categoriaFiltro === 'Todas') return true
    return (p.categoria || 'General') === categoriaFiltro
  })

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Package size={22} />
            </div>
            Gestión de Stock
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Categorización de productos e inventario global
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMostrarNuevaCat(!mostrarNuevaCat)}
            className="flex items-center gap-2 px-4 py-3 bg-slate-800 text-slate-200 border border-slate-700/80 rounded-2xl font-bold text-xs hover:bg-slate-700 active:scale-95 transition-all"
          >
            <FolderPlus size={16} className="text-emerald-400" /> Nueva Cat.
          </button>

          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg active:scale-[0.98] ${
              mostrarForm
                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
            }`}
          >
            {mostrarForm ? <X size={16} /> : <Plus size={16} />}
            {mostrarForm ? 'Cancelar' : 'Nuevo Producto'}
          </button>
        </div>
      </div>

      {/* MODAL / FORMULARIO CREAR CATEGORÍA */}
      {mostrarNuevaCat && (
        <form onSubmit={handleCrearCategoria} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex gap-2 items-center">
          <input
            type="text"
            placeholder="Nombre de la nueva categoría (ej: Perfumería)..."
            value={nuevaCatNombre}
            onChange={(e) => setNuevaCatNombre(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button type="submit" className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs">
            Crear
          </button>
        </form>
      )}

      {/* FORMULARIO CREAR PRODUCTO */}
      {mostrarForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Plus size={14} className="text-emerald-400" /> Agregar Producto Al Inventario
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Nombre del Producto</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Cuaderno A4 / Perfume Hugo Boss"
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Precio Venta</label>
              <input
                type="number"
                step="0.01"
                required
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="0.00"
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Stock Inicial</label>
              <input
                type="number"
                required
                value={stockActual}
                onChange={(e) => setStockActual(e.target.value)}
                placeholder="0"
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase">Stock Mínimo</label>
              <input
                type="number"
                required
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                placeholder="5"
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/10">
            Guardar Producto
          </button>
        </form>
      )}

      {/* BUSCADOR GLOBAL Y SELECTOR DE CATEGORÍAS */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="🔍 Buscar producto en TODAS las categorías..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-xs font-medium"
          />
        </div>

        {/* Pestañas de categorías (Ocultas visualmente mientras se escribe en el buscador) */}
        {busqueda.trim() === '' && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setCategoriaFiltro('Todas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                categoriaFiltro === 'Todas'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Todas
            </button>
            {categorias.map((c) => (
              <button
                key={c}
                onClick={() => setCategoriaFiltro(c)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  categoriaFiltro === c
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TARJETAS DE PRODUCTOS */}
      {cargando ? (
        <div className="p-8 text-center text-slate-500 text-xs font-mono">Cargando inventario...</div>
      ) : productosFiltrados.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-slate-400 text-xs">
          No hay productos disponibles.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {productosFiltrados.map((p) => {
            const bajo = p.stock_actual <= p.stock_minimo
            return (
              <div
                key={p.id}
                className={`bg-slate-900/80 border p-4 rounded-2xl flex flex-col justify-between gap-3 ${
                  bajo ? 'border-rose-500/30' : 'border-slate-800/80'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">{p.nombre}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Tag size={12} className="text-emerald-400" />
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {p.categoria || 'General'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-emerald-400 font-extrabold text-base">${p.precio}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                  {/* SELECTOR RÁPIDO PARA MOVER CATEGORÍA */}
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                    <ArrowRightLeft size={12} className="text-slate-400" />
                    <select
                      value={p.categoria || 'General'}
                      onChange={(e) => moverDeCategoria(p.id, e.target.value)}
                      className="bg-transparent text-[11px] text-slate-300 font-medium focus:outline-none cursor-pointer"
                    >
                      {categorias.map((cat) => (
                        <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                          Mover a {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CONTROLES DE STOCK */}
                  <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => ajustarStock(p, -1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold text-sm"
                    >
                      -
                    </button>
                    <span className={`font-mono text-xs font-bold px-1 ${bajo ? 'text-rose-400' : 'text-slate-100'}`}>
                      {p.stock_actual}
                    </span>
                    <button
                      onClick={() => ajustarStock(p, 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}