import { useState, useEffect } from 'react'
import { BarChart3, Trophy, Clock, Wallet } from 'lucide-react'
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

  if (cargando) return <p className="text-cream/40">Cargando reportes...</p>
  if (error) return <p className="text-ember text-sm">{error}</p>

  const nombreMes = new Date().toLocaleDateString('es-AR', { month: 'long' })

  return (
    <div>
      <h2 className="font-display text-2xl flex items-center gap-2 mb-6 text-cream">
        <BarChart3 size={22} className="text-sage" /> Reportes
      </h2>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-sm text-cream/50 uppercase tracking-wide">Ventas totales</p>
          <p className="text-2xl font-bold font-mono text-sage">${totalVentas.toFixed(2)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-cream/50 uppercase tracking-wide">Cantidad de ventas</p>
          <p className="text-2xl font-bold font-mono text-sage">{cantidadVentas}</p>
        </div>
      </div>

      <h3 className="font-semibold mb-2 text-cream/80 text-sm uppercase tracking-wide flex items-center gap-2">
        <Wallet size={16} className="text-sage" /> Caja de hoy
      </h3>
      <div className="grid grid-cols-3 gap-3 mb-10">
        <div className="card p-4 text-center">
          <p className="text-xs text-cream/50">Efectivo</p>
          <p className="font-mono font-semibold text-cream">${cajaHoy.efectivo?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-cream/50">Transferencia</p>
          <p className="font-mono font-semibold text-cream">${cajaHoy.transferencia?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-cream/50">Anotación</p>
          <p className="font-mono font-semibold text-ember">${cajaHoy.anotacion?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div>
          <h3 className="font-semibold mb-2 text-cream/80 text-sm uppercase tracking-wide">
            Productos más vendidos
          </h3>
          <div className="card divide-y divide-sage/10">
            {topProductos.length === 0 ? (
              <p className="p-4 text-sm text-cream/40">Sin ventas todavía.</p>
            ) : (
              topProductos.map((p) => (
                <div key={p.nombre} className="flex justify-between px-4 py-2">
                  <span className="text-cream">{p.nombre}</span>
                  <span className="font-mono font-medium text-sage">{p.cantidad} u.</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-cream/80 text-sm uppercase tracking-wide">
            Ventas por categoría
          </h3>
          <div className="card divide-y divide-sage/10">
            {ventasPorCategoria.length === 0 ? (
              <p className="p-4 text-sm text-cream/40">Sin ventas todavía.</p>
            ) : (
              ventasPorCategoria.map((c) => (
                <div key={c.nombre} className="flex justify-between px-4 py-2">
                  <span className="text-cream">{c.nombre}</span>
                  <span className="font-mono font-medium text-sage">${c.total.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="font-semibold mb-2 text-cream/80 text-sm uppercase tracking-wide">
          Ventas por empleado (histórico)
        </h3>
        <div className="card divide-y divide-sage/10">
          {ventasPorEmpleado.length === 0 ? (
            <p className="p-4 text-sm text-cream/40">Sin ventas todavía.</p>
          ) : (
            ventasPorEmpleado.map((e) => (
              <div key={e.nombre} className="flex justify-between px-4 py-2">
                <span className="text-cream">{e.nombre}</span>
                <span className="font-mono font-medium text-sage">${e.total.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <h3 className="font-display text-xl mb-4 text-cream capitalize">Ranking de {nombreMes}</h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2 text-cream/80 text-sm uppercase tracking-wide flex items-center gap-2">
            <Trophy size={16} className="text-sage" /> Más ventas del mes
          </h3>
          <div className="card divide-y divide-sage/10">
            {rankingVentasMes.length === 0 ? (
              <p className="p-4 text-sm text-cream/40">Sin ventas este mes.</p>
            ) : (
              rankingVentasMes.map((e, i) => (
                <div key={e.nombre} className="flex justify-between items-center px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-sage text-void' : 'bg-sage/10 text-cream/60'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-cream">{e.nombre}</span>
                  </div>
                  <span className="font-mono font-medium text-sage">${e.total.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-cream/80 text-sm uppercase tracking-wide flex items-center gap-2">
            <Clock size={16} className="text-sage" /> Más horas trabajadas del mes
          </h3>
          <div className="card divide-y divide-sage/10">
            {rankingHorasMes.length === 0 ? (
              <p className="p-4 text-sm text-cream/40">Sin asistencias este mes.</p>
            ) : (
              rankingHorasMes.map((e, i) => (
                <div key={e.nombre} className="flex justify-between items-center px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-sage text-void' : 'bg-sage/10 text-cream/60'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-cream">{e.nombre}</span>
                  </div>
                  <span className="font-mono font-medium text-sage">{e.horas.toFixed(1)} hs</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}