import { useState, useEffect } from 'react'
import { BarChart3, Trophy, Clock, Wallet, TrendingUp, Package, Tag, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Reportes() {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [totalVentas, setTotalVentas] = useState(0)
  const [cantidadVentas, setCantidadVentas] = useState(0)
  const [topProductos, setTopProductos] = useState([])
  const [ventasPorEmpleado, setVentasPorEmpleado] = useState([])
  const [rankingVentasMes, setRankingVentasMes] = useState([])
  const [rankingHorasMes, setRankingHorasMes] = useState([])
  const [cajaHoy, setCajaHoy] = useState({})
  const [ventasPorCategoria, setVentasPorCategoria] = useState([])

  const cargarReportes = async () => {
    setCargando(true)
    setError('')

    const { data: ventas, error: errorVentas } = await supabase
      .from('ventas')
      .select('id, total, vendedor_id, created_at, metodo_pago, perfiles(nombre)')

    if (errorVentas) {
      setError(errorVentas.message)
      setCargando(false)
      return
    }

    const total = ventas.reduce((acc, v) => acc + Number(v.total), 0)
    setTotalVentas(total)
    setCantidadVentas(ventas.length)

    const porEmpleado = {}
    ventas.forEach((v) => {
      const nombre = v.perfiles?.nombre || 'Sin nombre'
      porEmpleado[nombre] = (porEmpleado[nombre] || 0) + Number(v.total)
    })
    setVentasPorEmpleado(
      Object.entries(porEmpleado)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total)
    )

    // Caja de hoy por método de pago
    const hoy = new Date().toISOString().slice(0, 10)
    const ventasHoy = ventas.filter((v) => v.created_at.slice(0, 10) === hoy)
    const caja = { efectivo: 0, transferencia: 0, anotacion: 0 }
    ventasHoy.forEach((v) => {
      if (v.metodo_pago && caja[v.metodo_pago] !== undefined) {
        caja[v.metodo_pago] += Number(v.total)
      }
    })
    setCajaHoy(caja)

    const { data: items, error: errorItems } = await supabase
      .from('venta_items')
      .select('cantidad, precio_unitario, producto_id, productos(nombre, categoria)')

    if (errorItems) {
      setError(errorItems.message)
      setCargando(false)
      return
    }

    const porProducto = {}
    const porCategoria = {}
    items.forEach((it) => {
      const nombre = it.productos?.nombre || 'Producto eliminado'
      porProducto[nombre] = (porProducto[nombre] || 0) + it.cantidad

      const categoria = it.productos?.categoria || 'Sin categoría'
      porCategoria[categoria] =
        (porCategoria[categoria] || 0) + it.cantidad * Number(it.precio_unitario)
    })

    setTopProductos(
      Object.entries(porProducto)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)
    )

    setVentasPorCategoria(
      Object.entries(porCategoria)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total)
    )

    // Ranking del mes actual
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

    const ventasDelMes = ventas.filter((v) => new Date(v.created_at) >= inicioMes)
    const porEmpleadoMes = {}
    ventasDelMes.forEach((v) => {
      const nombre = v.perfiles?.nombre || 'Sin nombre'
      porEmpleadoMes[nombre] = (porEmpleadoMes[nombre] || 0) + Number(v.total)
    })
    setRankingVentasMes(
      Object.entries(porEmpleadoMes)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total)
    )

    const { data: asistencias, error: errorAsist } = await supabase
      .from('asistencias')
      .select('empleado_id, tipo, fecha, duracion_minutos, perfiles(nombre)')

    if (!errorAsist && asistencias) {
      const inicioMesStr = inicioMes.toISOString().slice(0, 10)
      const asistenciasDelMes = asistencias.filter((a) => a.fecha >= inicioMesStr)

      const { data: turnosFijos } = await supabase.from('turnos').select('empleado_id, hora_inicio, hora_fin')

      const minutosDeUnTurnoFijo = (empleadoId) => {
        const turno = turnosFijos?.find((t) => t.empleado_id === empleadoId)
        if (!turno) return 0
        const [h1, m1] = turno.hora_inicio.split(':').map(Number)
        const [h2, m2] = turno.hora_fin.split(':').map(Number)
        return h2 * 60 + m2 - (h1 * 60 + m1)
      }

      const porEmpleadoHoras = {}
      asistenciasDelMes.forEach((a) => {
        const nombre = a.perfiles?.nombre || 'Sin nombre'
        const minutos =
          a.tipo === 'fantasma' ? a.duracion_minutos || 0 : minutosDeUnTurnoFijo(a.empleado_id)
        porEmpleadoHoras[nombre] = (porEmpleadoHoras[nombre] || 0) + minutos
      })

      setRankingHorasMes(
        Object.entries(porEmpleadoHoras)
          .map(([nombre, minutos]) => ({ nombre, horas: minutos / 60 }))
          .sort((a, b) => b.horas - a.horas)
      )
    }

    setCargando(false)
  }

  useEffect(() => {
    cargarReportes()
  }, [])

  if (cargando) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-medium">Generando métricas del negocio...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-medium flex items-center gap-2">
        <AlertCircle size={16} className="shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  const nombreMes = new Date().toLocaleDateString('es-AR', { month: 'long' })
  const maxCantProd = topProductos[0]?.cantidad || 1
  const maxCatTotal = ventasPorCategoria[0]?.total || 1

  return (
    <div className="space-y-8 pb-20 lg:pb-6">
      {/* HEADER PRINCIPAL */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <BarChart3 size={22} />
          </div>
          Dashboard de Analytics
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Rendimiento comercial, flujo de caja diario e indicadores clave
        </p>
      </div>

      {/* TARJETAS KPI DE MÉTRICAS GENERALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ventas Totales
            </span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-slate-100 mt-3">
            ${totalVentas.toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-500 font-medium mt-1 block">Acumulado histórico</span>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Operaciones
            </span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <Package size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold font-mono text-slate-100 mt-3">
            {cantidadVentas}
          </p>
          <span className="text-[10px] text-slate-500 font-medium mt-1 block">Transacciones concretadas</span>
        </div>
      </div>

      {/* ARQUEO DE CAJA DE HOY */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Wallet size={16} className="text-emerald-400" /> Arqueo de Caja de Hoy
        </h3>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-3.5 text-center">
            <p className="text-[11px] text-slate-400 font-medium mb-1">Efectivo</p>
            <p className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
              ${cajaHoy.efectivo?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-3.5 text-center">
            <p className="text-[11px] text-slate-400 font-medium mb-1">Transferencia</p>
            <p className="font-mono font-bold text-blue-400 text-sm sm:text-base">
              ${cajaHoy.transferencia?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-3.5 text-center">
            <p className="text-[11px] text-slate-400 font-medium mb-1">Anotación</p>
            <p className="font-mono font-bold text-amber-400 text-sm sm:text-base">
              ${cajaHoy.anotacion?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
      </div>

      {/* GRÁFICOS DINÁMICOS: PRODUCTOS Y CATEGORÍAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos Más Vendidos */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-5 space-y-4 backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Package size={16} className="text-emerald-400" /> Productos más vendidos
          </h3>

          {topProductos.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Sin ventas registradas.</p>
          ) : (
            <div className="space-y-3">
              {topProductos.map((p) => {
                const porcentaje = Math.round((p.cantidad / maxCantProd) * 100)
                return (
                  <div key={p.nombre} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300 truncate">{p.nombre}</span>
                      <span className="font-mono font-bold text-emerald-400">{p.cantidad} u.</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Ventas por Categoría */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-5 space-y-4 backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Tag size={16} className="text-blue-400" /> Ventas por Categoría
          </h3>

          {ventasPorCategoria.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Sin ventas registradas.</p>
          ) : (
            <div className="space-y-3">
              {ventasPorCategoria.map((c) => {
                const porcentaje = Math.round((c.total / maxCatTotal) * 100)
                return (
                  <div key={c.nombre} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300 truncate">{c.nombre}</span>
                      <span className="font-mono font-bold text-blue-400">${c.total.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* VENTAS HISTÓRICAS POR EMPLEADO */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-5 space-y-3 backdrop-blur-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Ventas por Empleado (Histórico)
        </h3>
        {ventasPorEmpleado.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">Sin registro de ventas.</p>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {ventasPorEmpleado.map((e) => (
              <div key={e.nombre} className="py-2.5 flex justify-between items-center text-xs">
                <span className="text-slate-200 font-medium">{e.nombre}</span>
                <span className="font-mono font-bold text-emerald-400">${e.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PODIOS RANKING DEL MES */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100 capitalize flex items-center gap-2">
          <Trophy size={20} className="text-amber-400" /> Rankings de {nombreMes}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Más Ventas del Mes */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 space-y-3 backdrop-blur-md">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-400" /> Líderes en Ventas
            </p>

            {rankingVentasMes.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Sin ventas este mes.</p>
            ) : (
              <div className="space-y-2">
                {rankingVentasMes.map((e, i) => (
                  <div
                    key={e.nombre}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${
                      i === 0
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-slate-900/40 border-slate-700/30 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold ${
                          i === 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{i + 1}
                      </span>
                      <span className="text-xs font-semibold">{e.nombre}</span>
                    </div>
                    <span className="font-mono font-bold text-xs">${e.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Más Horas Trabajadas del Mes */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-5 space-y-3 backdrop-blur-md">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-blue-400" /> Líderes en Horas Trabajadas
            </p>

            {rankingHorasMes.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Sin asistencias este mes.</p>
            ) : (
              <div className="space-y-2">
                {rankingHorasMes.map((e, i) => (
                  <div
                    key={e.nombre}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${
                      i === 0
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                        : 'bg-slate-900/40 border-slate-700/30 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold ${
                          i === 0 ? 'bg-blue-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{i + 1}
                      </span>
                      <span className="text-xs font-semibold">{e.nombre}</span>
                    </div>
                    <span className="font-mono font-bold text-xs">{e.horas.toFixed(1)} hs</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}