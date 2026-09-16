import { useState, useEffect } from 'react'
import {
  ShoppingCart, Search, Folder, ArrowLeft, Plus, Trash2, CreditCard, Banknote,
  BookOpen, X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useEsAdmin } from '../lib/useEsAdmin'
import LogroModal from './LogroModal'

const UMBRALES_VENTA = [50000, 70000, 80000, 90000, 100000]
const METODO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', anotacion: 'Libreta' }

export default function Ventas() {
  const esAdmin = useEsAdmin()
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [logroMensaje, setLogroMensaje] = useState('')
  const [clientesLibreta, setClientesLibreta] = useState([])
  const [clienteLibretaId, setClienteLibretaId] = useState('')
  const [nombreNuevoCliente, setNombreNuevoCliente] = useState('')
  const [ventasHoy, setVentasHoy] = useState([])

  useEffect(() => {
    cargarDatos()
    cargarClientesLibreta()
    cargarVentasHoy()
  }, [])

  const cargarDatos = async () => {
    const { data: catData } = await supabase.from('categorias').select('*').order('nombre')
    const { data: prodData } = await supabase.from('productos').select('*').order('nombre')

    const listaCats = catData || []
    if (!listaCats.some((c) => c.nombre.toLowerCase() === 'general')) {
      listaCats.unshift({ id: 'general', nombre: 'General' })
    }

    setCategorias(listaCats)
    setProductos(prodData || [])
  }

  const cargarClientesLibreta = async () => {
    const { data } = await supabase.from('clientes_libreta').select('*').order('nombre')
    if (data) setClientesLibreta(data)
  }

  const cargarVentasHoy = async () => {
    const hoy = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('ventas')
      .select('id, total, metodo_pago, created_at, venta_items(cantidad, producto_id, productos(nombre))')
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)
      .order('created_at', { ascending: false })

    if (data) setVentasHoy(data)
  }

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

  const agregarAlCarrito = (producto) => {
    if (producto.stock_actual <= 0) {
      alert('Sin stock suficiente')
      return
    }

    setCarrito((prev) => {
      const existe = prev.find((item) => item.id === producto.id)
      if (existe) {
        return prev.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id))
  }

  const totalCarrito = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0)

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
    const mayor = Math.max(...alcanzados)

    const { data: existente } = await supabase
      .from('logros')
      .select('id')
      .eq('empleado_id', userId)
      .eq('tipo', 'venta_diaria')
      .eq('valor', mayor)
      .eq('fecha', hoy)
      .maybeSingle()

    if (existente) return

    await supabase.from('logros').insert({
      empleado_id: userId, tipo: 'venta_diaria', valor: mayor, fecha: hoy,
    })
    setLogroMensaje(`¡Felicidades ${nombre}! Vendiste $${mayor.toLocaleString()} hoy`)
  }

  const handleConfirmarVenta = async () => {
    if (carrito.length === 0) return
    if (metodoPago === 'anotacion' && !clienteLibretaId) {
      setError('Elegí a qué cliente de la libreta anotarle esta venta.')
      return
    }

    setProcesando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data: venta, error: errorVenta } = await supabase
      .from('ventas')
      .insert({
        vendedor_id: user.id,
        total: totalCarrito,
        metodo_pago: metodoPago,
        cliente_libreta_id: metodoPago === 'anotacion' ? clienteLibretaId : null,
      })
      .select()
      .single()

    if (errorVenta) {
      alert('Error al procesar la venta: ' + errorVenta.message)
      setProcesando(false)
      return
    }

    const items = carrito.map((item) => ({
      venta_id: venta.id,
      producto_id: item.id,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
    }))
    await supabase.from('venta_items').insert(items)

    for (const item of carrito) {
      await supabase
        .from('productos')
        .update({ stock_actual: item.stock_actual - item.cantidad })
        .eq('id', item.id)
    }

    if (metodoPago === 'anotacion' && clienteLibretaId) {
      const descripcion = carrito.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ')
      await supabase.from('libreta_movimientos').insert({
        cliente_id: clienteLibretaId,
        descripcion,
        monto: totalCarrito,
        venta_id: venta.id,
      })
    }

    const nombre = user.user_metadata?.nombre || user.email
    await verificarLogroVentaDiaria(user.id, nombre)

    setCarrito([])
    setClienteLibretaId('')
    cargarDatos()
    cargarVentasHoy()
    setProcesando(false)
  }

  const eliminarVenta = async (venta) => {
    if (!window.confirm('¿Eliminar esta venta? Se va a restaurar el stock.')) return
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
    cargarDatos()
    cargarVentasHoy()
  }

  const productosFiltrados = productos.filter((p) => {
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

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

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
                  <p className="text-[11px] font-mono text-emerald-400 font-bold">
                    ${p.precio} · stock: {p.stock_actual}
                  </p>
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

          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Método de Pago</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  metodoPago === 'efectivo' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Banknote size={14} /> Efectivo
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago('transferencia')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  metodoPago === 'transferencia' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <CreditCard size={14} /> Transf.
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago('anotacion')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  metodoPago === 'anotacion' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <BookOpen size={14} /> Libreta
              </button>
            </div>
          </div>

          {metodoPago === 'anotacion' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase">¿A nombre de quién?</label>
              <select
                value={clienteLibretaId}
                onChange={(e) => setClienteLibretaId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              >
                <option value="">Seleccionar cliente...</option>
                {clientesLibreta.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nombreNuevoCliente}
                  onChange={(e) => setNombreNuevoCliente(e.target.value)}
                  placeholder="O cliente nuevo..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
                <button type="button" onClick={crearClienteLibretaRapido} className="px-3 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-bold">
                  + Crear
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-slate-800 pt-3">
            <span className="text-sm font-bold text-slate-100">Total a Cobrar:</span>
            <span className="text-xl font-mono font-extrabold text-emerald-400">${totalCarrito}</span>
          </div>

          <button
            disabled={procesando}
            onClick={handleConfirmarVenta}
            className="w-full py-3.5 bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {procesando ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas de hoy</h3>
        {ventasHoy.length === 0 ? (
          <p className="text-xs text-slate-500">Todavía no hay ventas hoy.</p>
        ) : (
          <div className="space-y-2">
            {ventasHoy.map((v) => {
              const resumen = v.venta_items.map((it) => `${it.cantidad}x ${it.productos?.nombre || '?'}`).join(', ')
              const hora = new Date(v.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-200 truncate">{resumen}</p>
                    <p className="text-[10px] text-slate-500">{hora} · {METODO_LABEL[v.metodo_pago] || v.metodo_pago}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-emerald-400 text-xs font-bold">${Number(v.total).toFixed(2)}</span>
                    {esAdmin && (
                      <button onClick={() => eliminarVenta(v)} className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {logroMensaje && <LogroModal mensaje={logroMensaje} onCerrar={() => setLogroMensaje('')} />}
    </div>
  )
}