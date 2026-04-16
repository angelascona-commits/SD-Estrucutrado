import { supabase } from '@/modules/shared/infra/supabase'
import type {
  PeriodoItem,
  RegistroDetalleItem,
  RegistroFormData,
  ResumenDiarioGeneralItem,
  ResumenDiarioSolicitanteItem,
  ResumenDiarioTrabajadorItem,
  SolicitanteItem,
  TareaFormData,
  TareaPeriodoListItem,
  TareoCatalogs,
  TrabajadorItem
} from '../interfaces/tareo.interfaces'

export async function getTareoCatalogs(): Promise<TareoCatalogs> {
  const [
    trabajadoresRes,
    teamsRes,
    solicitantesRes,
    agrupadoresRes,
    proyectosRes,
    estadosTareaRes,
    periodosRes
  ] = await Promise.all([
    supabase
      .from('tareo_trabajador')
      .select('id, nombre, correo, telefono')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('tareo_team')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('tareo_solicitante')
      .select('id, nombre, horas_maximas_estimadas')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('tareo_agrupador')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('tareo_proyecto')
      .select('id, nombre, agrupador_id')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('tareo_estado_tarea')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('tareo_periodo')
      .select('id, anio, mes, fecha_inicio, fecha_fin, cerrado')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
  ])

  const errors = [
    trabajadoresRes.error,
    teamsRes.error,
    solicitantesRes.error,
    agrupadoresRes.error,
    proyectosRes.error,
    estadosTareaRes.error,
    periodosRes.error
  ].filter(Boolean)

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error?.message).join(' | '))
  }

  return {
    trabajadores: (trabajadoresRes.data ?? []) as TrabajadorItem[],
    teams: (teamsRes.data ?? []) as Array<{ id: number; nombre: string }>,
    solicitantes: (solicitantesRes.data ?? []) as SolicitanteItem[],
    agrupadores: (agrupadoresRes.data ?? []) as Array<{ id: number; nombre: string }>,
    proyectos: (proyectosRes.data ?? []) as Array<{ id: number; nombre: string; agrupador_id: number }>,
    estadosTarea: (estadosTareaRes.data ?? []) as Array<{ id: number; nombre: string }>,
    periodos: (periodosRes.data ?? []) as PeriodoItem[]
  }
}

function mapTareaPeriodoRow(item: any): TareaPeriodoListItem {
  return {
    tarea_periodo_id: item.tarea_periodo_id,
    tarea_id: item.tarea_id,
    tarea_nombre: item.tarea_nombre,
    team_id: item.team_id,
    team_nombre: item.team_nombre,
    solicitante_id: item.solicitante_id,
    solicitante_nombre: item.solicitante_nombre,
    horas_maximas_estimadas:
      item.horas_maximas_estimadas !== null ? Number(item.horas_maximas_estimadas) : null,
    proyecto_id: item.proyecto_id,
    proyecto_nombre: item.proyecto_nombre,
    agrupador_id: item.agrupador_id,
    agrupador_nombre: item.agrupador_nombre,
    estado_id: item.estado_id,
    estado_nombre: item.estado_nombre,
    activo: item.activo,
    periodo_id: item.periodo_id,
    periodo_anio: item.anio,
    periodo_mes: item.mes,
    periodo_cerrado: item.cerrado,
    horas_historicas_arrastre: Number(item.horas_historicas_arrastre ?? 0),
    horas_asignadas_periodo: Number(item.horas_asignadas_periodo ?? 0),
    horas_consumidas_periodo: Number(item.horas_consumidas_periodo ?? 0),
    horas_disponibles_periodo: Number(item.horas_disponibles_periodo ?? 0),
    horas_totales_acumuladas: Number(item.horas_totales_acumuladas ?? 0),
    comentario_periodo: item.comentario_periodo,
    created_at: item.created_at,
    updated_at: item.updated_at
  }
}

export async function getAllTareasPeriodo(): Promise<TareaPeriodoListItem[]> {
  const { data, error } = await supabase
    .from('v_tareo_tarea_periodo_detalle')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapTareaPeriodoRow)
}

export async function getTareaPeriodoById(id: number): Promise<TareaPeriodoListItem | null> {
  const { data, error } = await supabase
    .from('v_tareo_tarea_periodo_detalle')
    .select('*')
    .eq('tarea_periodo_id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw new Error(error.message)
  }

  return mapTareaPeriodoRow(data)
}

export async function createTarea(payload: TareaFormData): Promise<number> {
  const horasTotalesLegacy =
    Number(payload.horas_historicas_arrastre || 0) +
    Number(payload.horas_asignadas_periodo || 0)

  const { data: tareaData, error: tareaError } = await supabase
    .from('tareo_tarea')
    .insert({
      periodo_id: payload.periodo_id,
      nombre: payload.nombre,
      proyecto_id: payload.proyecto_id,
      team_id: payload.team_id,
      solicitante_id: payload.solicitante_id,
      estado_id: payload.estado_id,
      horas_totales: horasTotalesLegacy,
      horas_consumidas: 0,
      comentario_ps: payload.comentario_periodo,
      activo: payload.activo ?? true
    })
    .select('id')
    .single()

  if (tareaError) {
    throw new Error(tareaError.message)
  }

  const { data: periodoData, error: periodoError } = await supabase
    .from('tareo_tarea_periodo')
    .insert({
      tarea_id: tareaData.id,
      periodo_id: payload.periodo_id,
      horas_historicas_arrastre: payload.horas_historicas_arrastre,
      horas_asignadas_periodo: payload.horas_asignadas_periodo,
      comentario_periodo: payload.comentario_periodo,
      activo: payload.activo ?? true
    })
    .select('id')
    .single()

  if (periodoError) {
    throw new Error(periodoError.message)
  }

  return periodoData.id
}

export async function updateTareaPeriodo(id: number, payload: TareaFormData): Promise<void> {
  const current = await getTareaPeriodoById(id)

  if (!current) {
    throw new Error('No se encontró la tarea del período')
  }

  const horasTotalesLegacy =
    Number(payload.horas_historicas_arrastre || 0) +
    Number(payload.horas_asignadas_periodo || 0)

  const { error: tareaError } = await supabase
    .from('tareo_tarea')
    .update({
      periodo_id: payload.periodo_id,
      nombre: payload.nombre,
      proyecto_id: payload.proyecto_id,
      team_id: payload.team_id,
      solicitante_id: payload.solicitante_id,
      estado_id: payload.estado_id,
      horas_totales: horasTotalesLegacy,
      comentario_ps: payload.comentario_periodo,
      activo: payload.activo ?? true
    })
    .eq('id', current.tarea_id)

  if (tareaError) {
    throw new Error(tareaError.message)
  }

  const { error: periodoError } = await supabase
    .from('tareo_tarea_periodo')
    .update({
      periodo_id: payload.periodo_id,
      horas_historicas_arrastre: payload.horas_historicas_arrastre,
      horas_asignadas_periodo: payload.horas_asignadas_periodo,
      comentario_periodo: payload.comentario_periodo,
      activo: payload.activo ?? true
    })
    .eq('id', id)

  if (periodoError) {
    throw new Error(periodoError.message)
  }
}

export async function getRegistrosByFecha(fecha: string): Promise<RegistroDetalleItem[]> {
  const { data, error } = await supabase
    .from('v_tareo_registro_detalle')
    .select('*')
    .eq('fecha', fecha)
    .order('trabajador_nombre')
    .order('tarea_nombre')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((item: any) => ({
    ...item,
    horas: Number(item.horas ?? 0),
    horas_historicas_arrastre: Number(item.horas_historicas_arrastre ?? 0),
    horas_asignadas_periodo: Number(item.horas_asignadas_periodo ?? 0),
    horas_consumidas_periodo: Number(item.horas_consumidas_periodo ?? 0),
    horas_disponibles_periodo: Number(item.horas_disponibles_periodo ?? 0),
    horas_totales_acumuladas: Number(item.horas_totales_acumuladas ?? 0),
    solicitante_horas_maximas_estimadas:
      item.solicitante_horas_maximas_estimadas !== null
        ? Number(item.solicitante_horas_maximas_estimadas)
        : null
  })) as RegistroDetalleItem[]
}

export async function getRegistroById(id: number): Promise<RegistroDetalleItem | null> {
  const { data, error } = await supabase
    .from('v_tareo_registro_detalle')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw new Error(error.message)
  }

  return {
    ...data,
    horas: Number(data.horas ?? 0),
    horas_historicas_arrastre: Number(data.horas_historicas_arrastre ?? 0),
    horas_asignadas_periodo: Number(data.horas_asignadas_periodo ?? 0),
    horas_consumidas_periodo: Number(data.horas_consumidas_periodo ?? 0),
    horas_disponibles_periodo: Number(data.horas_disponibles_periodo ?? 0),
    horas_totales_acumuladas: Number(data.horas_totales_acumuladas ?? 0),
    solicitante_horas_maximas_estimadas:
      data.solicitante_horas_maximas_estimadas !== null
        ? Number(data.solicitante_horas_maximas_estimadas)
        : null
  } as RegistroDetalleItem
}

export async function createRegistro(payload: RegistroFormData): Promise<number> {
  const { data: tareaPeriodo, error: tareaPeriodoError } = await supabase
    .from('tareo_tarea_periodo')
    .select('tarea_id')
    .eq('id', payload.tarea_periodo_id)
    .single()

  if (tareaPeriodoError) {
    throw new Error(tareaPeriodoError.message)
  }

  const { data, error } = await supabase
    .from('tareo_registro')
    .insert({
      tarea_id: tareaPeriodo.tarea_id,
      tarea_periodo_id: payload.tarea_periodo_id,
      fecha: payload.fecha,
      trabajador_id: payload.trabajador_id,
      horas: payload.horas,
      comentario: payload.comentario
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data.id
}
export async function updateRegistro(id: number, payload: RegistroFormData): Promise<void> {
  const { data: tareaPeriodo, error: tareaPeriodoError } = await supabase
    .from('tareo_tarea_periodo')
    .select('tarea_id')
    .eq('id', payload.tarea_periodo_id)
    .single()

  if (tareaPeriodoError) {
    throw new Error(tareaPeriodoError.message)
  }

  const { error } = await supabase
    .from('tareo_registro')
    .update({
      tarea_id: tareaPeriodo.tarea_id,
      tarea_periodo_id: payload.tarea_periodo_id,
      fecha: payload.fecha,
      trabajador_id: payload.trabajador_id,
      horas: payload.horas,
      comentario: payload.comentario
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
export async function deleteRegistro(id: number): Promise<void> {
  const { error } = await supabase
    .from('tareo_registro')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

async function resolvePeriodo(periodoId: number): Promise<{ anio: number; mes: number }> {
  const { data, error } = await supabase
    .from('tareo_periodo')
    .select('anio, mes')
    .eq('id', periodoId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getResumenDiarioGeneral(
  periodoId?: number
): Promise<ResumenDiarioGeneralItem[]> {
  let query = supabase
    .from('v_tareo_resumen_diario_general')
    .select('*')
    .order('fecha')

  if (periodoId) {
    const periodo = await resolvePeriodo(periodoId)
    query = query.eq('anio', periodo.anio).eq('mes', periodo.mes)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((item: any) => ({
    ...item,
    horas_dia: Number(item.horas_dia ?? 0),
    horas_acumuladas_mes: Number(item.horas_acumuladas_mes ?? 0)
  })) as ResumenDiarioGeneralItem[]
}

export async function getResumenDiarioTrabajador(
  periodoId?: number
): Promise<ResumenDiarioTrabajadorItem[]> {
  let query = supabase
    .from('v_tareo_resumen_diario_trabajador')
    .select('*')
    .order('fecha')
    .order('trabajador_nombre')

  if (periodoId) {
    const periodo = await resolvePeriodo(periodoId)
    query = query.eq('anio', periodo.anio).eq('mes', periodo.mes)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((item: any) => ({
    ...item,
    horas_dia: Number(item.horas_dia ?? 0),
    horas_acumuladas_mes: Number(item.horas_acumuladas_mes ?? 0)
  })) as ResumenDiarioTrabajadorItem[]
}

export async function getResumenDiarioSolicitante(
  periodoId?: number
): Promise<ResumenDiarioSolicitanteItem[]> {
  let query = supabase
    .from('v_tareo_resumen_diario_solicitante')
    .select('*')
    .order('fecha')
    .order('solicitante_nombre')

  if (periodoId) {
    const periodo = await resolvePeriodo(periodoId)
    query = query.eq('anio', periodo.anio).eq('mes', periodo.mes)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((item: any) => ({
    ...item,
    horas_dia: Number(item.horas_dia ?? 0),
    horas_acumuladas_mes: Number(item.horas_acumuladas_mes ?? 0),
    horas_maximas_estimadas:
      item.horas_maximas_estimadas !== null
        ? Number(item.horas_maximas_estimadas)
        : null
  })) as ResumenDiarioSolicitanteItem[]
}
export async function getHorasTrabajadorByFecha(
  trabajadorId: number,
  fecha: string,
  excludeRegistroId?: number
): Promise<number> {
  let query = supabase
    .from('tareo_registro')
    .select('horas')
    .eq('trabajador_id', trabajadorId)
    .eq('fecha', fecha)

  if (excludeRegistroId) {
    query = query.neq('id', excludeRegistroId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).reduce((acc, item) => acc + Number(item.horas ?? 0), 0)
}

export async function getTareaPeriodoValidacion(tareaPeriodoId: number): Promise<{
  horas_disponibles_periodo: number
  periodo_cerrado: boolean
} | null> {
  const { data, error } = await supabase
    .from('v_tareo_tarea_periodo_detalle')
    .select('horas_disponibles_periodo, cerrado')
    .eq('tarea_periodo_id', tareaPeriodoId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw new Error(error.message)
  }

  return {
    horas_disponibles_periodo: Number(data.horas_disponibles_periodo ?? 0),
    periodo_cerrado: Boolean(data.cerrado)
  }
}
export async function closePeriodoAndCarryOverTasks(
  periodoActualId: number,
  periodoSiguienteId: number
): Promise<void> {
  const { error } = await supabase.rpc('tareo_cerrar_periodo_y_arrastrar', {
    p_periodo_actual_id: periodoActualId,
    p_periodo_siguiente_id: periodoSiguienteId
  })

  if (error) {
    throw new Error(error.message)
  }
}