import { useState, useEffect } from 'react'
import { DollarSign, Calendar, CreditCard, User, ShoppingBag, Search, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [metodoFiltro, setMetodoFiltro] = useState('Todos')

  const cargarVentas = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('fecha', { ascending: false })

    if (!error) setVentas(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarVentas()
  }, [])

  // Métricas rápidas del día de hoy
  const hoyStr = new Date().toISOString().split('T')[0]
  const ventasHoy = ventas.filter((v) => new Date(v.fecha).toISOString().split('T')[0] === hoyStr)
  const totalFacturadoHoy = ventasHoy.reduce((acc, v) => acc + parseFloat(v.total || 0), 0)

  // Filtrado de la lista
  const ventasFiltradas = ventas.filter((v) => {
    const coincideEmpleado = (v.nombre_empleado || '').toLowerCase().includes(busqueda.toLowerCase())
    const coincideMetodo = metodoFiltro === 'Todos' || v.metodo_pago === metodoFiltro
    return coincideEmpleado && coincideMetodo
  })

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* HEADER Y MÉTRICAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <DollarSign size={22} />
            </div>
            Historial de Ventas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registro transaccional y arqueo de caja diario
          </p>
        </div>

        <button
          onClick={cargarVentas}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl font-bold text-xs text-slate-300 hover:bg-slate-800 active:scale-95 transition-all self-start sm:self-auto"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* TARJETA TOTAL DEL DÍA */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-slate-900 border border-emerald-500/20 p-5 rounded-3xl flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider font-mono">
            Facturado Hoy ({ventasHoy.length} ventas)
          </span>
          <p className="text-3xl font-extrabold font-mono text-slate-100 mt-0.5">
            ${totalFacturadoHoy.toFixed(2)}
          </p>
        </div>
        <div className="p-3 bg-emerald-500 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/20">
          <ShoppingBag size={24} />
        </div>
      </div>

      {/* CONTROLES DE FILTRO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre de empleado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <select
          value={metodoFiltro}
          onChange={(e) => setMetodoFiltro(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
        >
          <option value="Todos">Todos los Medios de Pago</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Débito / Crédito">Débito / Crédito</option>
        </select>
      </div>

      {/* LISTADO DE TRANSACCIONES */}
      {cargando ? (
        <div className="p-8 text-center text-slate-500 text-xs font-mono">Cargando ventas...</div>
      ) : ventasFiltradas.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-slate-400 text-xs">
          No se registraron ventas coincidentes.
        </div>
      ) : (
        <div className="space-y-3">
          {ventasFiltradas.map((v) => {
            const fechaObj = new Date(v.fecha)
            const fechaFormatted = fechaObj.toLocaleDateString()
            const horaFormatted = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

            return (
              <div
                key={v.id}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar size={14} className="text-emerald-400" />
                    <span>{fechaFormatted} - {horaFormatted} hs</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-extrabold text-base">
                    +${parseFloat(v.total).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-slate-500" />
                    <span>{v.nombre_empleado || 'Vendedor sin identificar'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 font-mono text-[11px]">
                    <CreditCard size={12} className="text-slate-400" />
                    <span>{v.metodo_pago || 'Efectivo'}</span>
                  </div>
                </div>

                {/* DETALLE DE PRODUCTOS VENDIDOS */}
                {v.detalles && Array.isArray(v.detalles) && v.detalles.length > 0 && (
                  <div className="bg-slate-950/60 rounded-xl p-2.5 text-[11px] font-mono space-y-1 border border-slate-800/40">
                    {v.detalles.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-400">
                        <span>{item.cantidad}x {item.nombre}</span>
                        <span>${(item.precio * item.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}