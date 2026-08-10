import { useState, useEffect } from 'react'
import { Package } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Stock() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [precio, setPrecio] = useState('')
  const [stockActual, setStockActual] = useState('')
  const [stockMinimo, setStockMinimo] = useState('5')
  const [error, setError] = useState('')

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-2xl flex items-center gap-2 text-cream">
          <Package size={22} className="text-sage" /> Stock
        </h2>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="btn-primary">
          {mostrarForm ? 'Cancelar' : '+ Nuevo producto'}
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

      {cargando ? (
        <p className="text-cream/40">Cargando productos...</p>
      ) : productos.length === 0 ? (
        <p className="text-cream/40">No hay productos cargados todavía.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-light text-xs uppercase tracking-wide text-cream/40">
              <tr>
                <th className="px-5 py-3 font-medium">Producto</th>
                <th className="px-5 py-3 font-medium">Precio venta</th>
                <th className="px-5 py-3 font-medium">Ganancia u.</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">Ajustar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {productos.map((p) => {
                const bajo = p.stock_actual <= p.stock_minimo
                const ganancia = p.precio_compra ? p.precio - p.precio_compra : null
                return (
                  <tr key={p.id}>
                    <td className="px-5 py-3">
                      <span className="font-medium text-cream">{p.nombre}</span>
                      {bajo && <span className="badge-alert ml-2">Stock bajo</span>}
                    </td>
                    <td className="px-5 py-3 font-mono text-cream/70">${p.precio}</td>
                    <td className="px-5 py-3 font-mono text-cream/70">
                      {ganancia !== null ? `$${ganancia.toFixed(2)}` : '—'}
                    </td>
                    <td
                      className={`px-5 py-3 font-mono font-semibold ${
                        bajo ? 'text-ember' : 'text-cream'
                      }`}
                    >
                      {p.stock_actual}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => ajustarStock(p, -1)}
                        className="w-7 h-7 rounded-full border border-sage/20 text-cream/70 hover:bg-sage/10 mr-2"
                      >
                        −
                      </button>
                      <button
                        onClick={() => ajustarStock(p, 1)}
                        className="w-7 h-7 rounded-full border border-sage/20 text-cream/70 hover:bg-sage/10"
                      >
                        +
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}