import { supabase } from './supabaseClient'

export const UMBRALES_DIAS = [10, 25, 50, 75, 100]

export async function verificarLogroDiasTrabajados(empleadoId, nombre) {
  const { data } = await supabase
    .from('asistencias')
    .select('fecha')
    .eq('empleado_id', empleadoId)

  if (!data) return null

  const diasUnicos = new Set(data.map((a) => a.fecha)).size
  const alcanzados = UMBRALES_DIAS.filter((u) => diasUnicos >= u)
  if (alcanzados.length === 0) return null
  const mayor = Math.max(...alcanzados)

  const { data: existente } = await supabase
    .from('logros')
    .select('id')
    .eq('empleado_id', empleadoId)
    .eq('tipo', 'dias_trabajados')
    .eq('valor', mayor)
    .maybeSingle()

  if (existente) return null

  await supabase.from('logros').insert({
    empleado_id: empleadoId,
    tipo: 'dias_trabajados',
    valor: mayor,
    fecha: new Date().toISOString().slice(0, 10),
  })

  return `¡Felicidades ${nombre}! Llegaste a ${mayor} días trabajados`
}