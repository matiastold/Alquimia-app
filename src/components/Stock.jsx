import { useState, useEffect } from 'react'
import { Package, Search } from 'lucide-react'
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-2xl flex items-center gap-2 text-cream">
          <Package size={22} className="text-sage" /> Stock
        </h2>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary">
          {mostrarForm ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {error && <p className="text-ember text-sm mb-4">{error}</p>}

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-cream/60 mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-cream/60 mb-1">
              Categoría (opcional)
            </label>
            <input
              type="text"
              list="lista-categorias"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ej: Librería"
              className="input-field"
            />
            <datalist id="lista-categorias">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-cream/60 mb-1">
              Precio de compra (opcional)
            </label>
            <input
              type="number"
              step="0.01"
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cream/60 mb-1">Precio de venta</label>
            <input
              type="number"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cream/60 mb-1">Stock inicial</label>
            <input
              type="number"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cream/60 mb-1">Stock mínimo</label>
            <input
              type="number"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div className="col-span-2">
            <button type="submit" className="btn-primary">
              Guardar producto
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 space-y-3">
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
        <p className="text-cream/40">Cargando productos...</p>
      ) : productosFiltrados.length === 0 ? (
        <p className="text-cream/40">No se encontraron productos.</p>
      ) : (
        <div className="space-y-3">
          {productosFiltrados.map((p) => {
            const bajo = p.stock_actual <= p.stock_minimo
            const ganancia = p.precio_compra ? p.precio - p.precio_compra : null
            return (
              <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-cream truncate">{p.nombre}</p>
                    {bajo && <span className="badge-alert">Stock bajo</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                    {p.categoria && (
                      <span className="bg-sage/10 text-sage px-2 py-0.5 rounded-full">
                        {p.categoria}
                      </span>
                    )}
                    <span className="font-mono text-cream/60">${p.precio}</span>
                    {ganancia !== null && (
                      <span className="font-mono text-cream/40">gan. ${ganancia.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`font-mono font-semibold ${bajo ? 'text-ember' : 'text-cream'}`}
                  >
                    {p.stock_actual}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => ajustarStock(p, -1)}
                      className="w-7 h-7 rounded-full border border-sage/20 text-cream/70 hover:bg-sage/10"
                    >
                      −
                    </button>
                    <button
                      onClick={() => ajustarStock(p, 1)}
                      className="w-7 h-7 rounded-full border border-sage/20 text-cream/70 hover:bg-sage/10"
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