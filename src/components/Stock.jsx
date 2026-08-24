import { useState, useEffect } from 'react'
import { Package, Plus, FolderPlus, Folder, ArrowLeft, Search, Edit, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Stock() {
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  
  // Modales y Búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [mostrarModalProd, setMostrarModalProd] = useState(false)
  const [mostrarModalCat, setMostrarModalCat] = useState(false)

  // Formulario Producto
  const [nombreProd, setNombreProd] = useState('')
  const [precioProd, setPrecioProd] = useState('')
  const [stockProd, setStockProd] = useState('')
  const [catProd, setCatProd] = useState('General')

  // Formulario Categoría
  const [nombreNuevaCat, setNombreNuevaCat] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setCargando(true)

    // Cargar Categorías
    const { data: catData } = await supabase.from('categorias').select('*').order('nombre')
    
    // Cargar Productos
    const { data: prodData } = await supabase.from('productos').select('*').order('nombre')

    const listaCats = catData || []
    // Garantizar que la categoría 'General' siempre exista en la lista
    if (!listaCats.some(c => c.nombre.toLowerCase() === 'general')) {
      listaCats.unshift({ id: 'general', nombre: 'General' })
    }

    setCategorias(listaCats)
    setProductos(prodData || [])
    setCargando(false)
  }

  // Modificar Stock rápido (+ / -)
  const handleAjustarStock = async (id, stockActual, cambio) => {
    const nuevoStock = Math.max(0, stockActual + cambio)
    setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: nuevoStock } : p))
    await supabase.from('productos').update({ stock: nuevoStock }).eq('id', id)
  }

  // Crear Producto
  const handleCrearProducto = async (e) => {
    e.preventDefault()
    const nuevaCat = catProd || 'General'

    const { data, error } = await supabase.from('productos').insert({
      nombre: nombreProd.trim(),
      precio: parseFloat(precioProd) || 0,
      stock: parseInt(stockProd) || 0,
      categoria: nuevaCat
    }).select()

    if (!error && data) {
      setProductos([...productos, ...data])
      setMostrarModalProd(false)
      setNombreProd('')
      setPrecioProd('')
      setStockProd('')
    }
  }

  // Crear Categoría
  const handleCrearCategoria = async (e) => {
    e.preventDefault()
    if (!nombreNuevaCat.trim()) return

    const { data, error } = await supabase.from('categorias').insert({
      nombre: nombreNuevaCat.trim()
    }).select()

    if (!error && data) {
      setCategorias([...categorias, ...data])
      setMostrarModalCat(false)
      setNombreNuevaCat('')
    }
  }

  // Mover producto a otra categoría
  const handleMoverCategoria = async (prodId, nuevaCat) => {
    setProductos(prev => prev.map(p => p.id === prodId ? { ...p, categoria: nuevaCat } : p))
    await supabase.from('productos').update({ categoria: nuevaCat }).eq('id', prodId)
  }

  // Filtrado de productos dentro de una categoría o por búsqueda
  const productosFiltrados = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    if (busqueda.trim() !== '') return coincideBusqueda
    
    // Si no hay búsqueda, se muestran solo los productos de la categoría seleccionada
    const catProducto = p.categoria || 'General'
    return catProducto.toLowerCase() === (categoriaSeleccionada?.nombre || 'general').toLowerCase()
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
            Organización de productos por categorías
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMostrarModalCat(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl font-bold text-xs hover:bg-slate-800 transition-all"
          >
            <FolderPlus size={16} className="text-emerald-400" />
            Nueva Cat.
          </button>
          <button
            onClick={() => setMostrarModalProd(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-bold text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={16} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* BUSCADOR GLOBAL */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-3.5 text-slate-500" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto globalmente en el inventario..."
          className="w-full bg-slate-900 border border-slate-800/80 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
        />
      </div>

      {/* VISTA 1: CARDS DE CATEGORÍAS (Si no hay búsqueda activa y no se seleccionó categoría) */}
      {!categoriaSeleccionada && busqueda.trim() === '' ? (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Categorías Disponibles
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categorias.map((cat) => {
              const cantidadProd = productos.filter(
                (p) => (p.categoria || 'General').toLowerCase() === cat.nombre.toLowerCase()
              ).length

              return (
                <button
                  key={cat.id || cat.nombre}
                  onClick={() => setCategoriaSeleccionada(cat)}
                  className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl flex flex-col justify-between text-left transition-all active:scale-[0.98] shadow-md group"
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 group-hover:scale-105 transition-transform">
                      <Folder size={20} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md">
                      {cantidadProd} prod.
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors capitalize">
                      {cat.nombre}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Ver artículos</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* VISTA 2: LISTA DE PRODUCTOS DENTRO DE LA CATEGORÍA */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setCategoriaSeleccionada(null)
                setBusqueda('')
              }}
              className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-slate-900/80 border border-slate-800 px-3.5 py-2 rounded-xl hover:bg-slate-800 transition-all"
            >
              <ArrowLeft size={16} />
              Volver a Categorías
            </button>

            <span className="text-xs font-semibold text-slate-400 capitalize">
              {busqueda ? `Resultados para: "${busqueda}"` : `Categoría: ${categoriaSeleccionada?.nombre}`}
            </span>
          </div>

          {productosFiltrados.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500 text-xs">
              No hay productos registrados en esta categoría.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {productosFiltrados.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm capitalize">{p.nombre}</h4>
                      <div className="mt-1">
                        <select
                          value={p.categoria || 'General'}
                          onChange={(e) => handleMoverCategoria(p.id, e.target.value)}
                          className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                          {categorias.map((c) => (
                            <option key={c.id || c.nombre} value={c.nombre}>{c.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-bold text-sm font-mono">${p.precio}</span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-950 border border-slate-800/80 rounded-xl p-2">
                    <span className="text-[11px] text-slate-400 font-medium pl-2">Stock:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAjustarStock(p.id, p.stock, -1)}
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold text-slate-100 w-6 text-center">{p.stock}</span>
                      <button
                        onClick={() => handleAjustarStock(p.id, p.stock, 1)}
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL NUEVA CATEGORÍA */}
      {mostrarModalCat && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCrearCategoria} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FolderPlus size={18} className="text-emerald-400" /> Crear Categoría
            </h3>
            <input
              type="text"
              required
              value={nombreNuevaCat}
              onChange={(e) => setNombreNuevaCat(e.target.value)}
              placeholder="Nombre de la categoría (ej. Kiosco)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMostrarModalCat(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL NUEVO PRODUCTO */}
      {mostrarModalProd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCrearProducto} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Plus size={18} className="text-emerald-400" /> Nuevo Producto
            </h3>
            <input
              type="text"
              required
              value={nombreProd}
              onChange={(e) => setNombreProd(e.target.value)}
              placeholder="Nombre del producto"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                required
                value={precioProd}
                onChange={(e) => setPrecioProd(e.target.value)}
                placeholder="Precio ($)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
              <input
                type="number"
                required
                value={stockProd}
                onChange={(e) => setStockProd(e.target.value)}
                placeholder="Stock Inicial"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
            <select
              value={catProd}
              onChange={(e) => setCatProd(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {categorias.map((c) => (
                <option key={c.id || c.nombre} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalProd(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}