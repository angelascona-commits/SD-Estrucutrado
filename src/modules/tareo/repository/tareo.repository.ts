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
  TrabajadorItem,
  AgrupadorItem
} from '../interfaces/tareo.interfaces'

export async function getTareoCatalogs(): Promise<TareoCatalogs> {
  const [
    trabajadoresRes,
    teamsRes,
    solicitantesRes,
    agrupadoresRes,
    proyectosRes,
    estadosTareaRes,
    periodosRes,
    areasRes
  ] = await Promise.all([
    supabase
      .from('tareo_trabajador')
      .select('id, nombre, correo, telefono, horas_maximas')
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
      .select('id, nombre, area_id')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('tareo_proyecto')
      .select('id, nombre, agrupador_id, solicitante_id, team_id')
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
      .order('mes', { ascending: false }),
    supabase
      .from('tareo_area')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
  ])

  const errors = [
    trabajadoresRes.error,
    teamsRes.error,
    solicitantesRes.error,
    agrupadoresRes.error,
    proyectosRes.error,
    estadosTareaRes.error,
    periodosRes.error,
    areasRes.error
  ].filter(Boolean)

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error?.message).join(' | '))
  }

  return {
    trabajadores: (trabajadoresRes.data ?? []) as TrabajadorItem[],
    teams: (teamsRes.data ?? []) as Array<{ id: number; nombre: string }>,
    solicitantes: (solicitantesRes.data ?? []) as SolicitanteItem[],
    agrupadores: (agrupadoresRes.data ?? []) as AgrupadorItem[],
    proyectos: (proyectosRes.data ?? []) as Array<{ id: number; nombre: string; agrupador_id: number; solicitante_id: number | null; team_id: number | null }>,
    estadosTarea: (estadosTareaRes.data ?? []) as Array<{ id: number; nombre: string }>,
    periodos: (periodosRes.data ?? []) as PeriodoItem[],
    areas: (areasRes.data ?? []) as Array<{ id: number; nombre: string }>
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
    comentario_dm: item.comentario_dm,
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
      comentario_dm: payload.comentario_dm,
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
      comentario_dm: payload.comentario_dm,
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

export async function toggleTareaActivo(tareaId: number, activo: boolean): Promise<void> {
  const { error: errorTarea } = await supabase
    .from('tareo_tarea')
    .update({ activo })
    .eq('id', tareaId)

  if (errorTarea) throw new Error(errorTarea.message)

  const { error: errorPeriodo } = await supabase
    .from('tareo_tarea_periodo')
    .update({ activo })
    .eq('tarea_id', tareaId)

  if (errorPeriodo) throw new Error(errorPeriodo.message)
}

export async function upsertCatalogItem(tableName: string, payload: any): Promise<number> {
  if (payload.id) {
    const { id, ...updatePayload } = payload
    const { error } = await supabase.from(tableName).update(updatePayload).eq('id', id)
    if (error) throw new Error(error.message)
    return id
  } else {
    const { data, error } = await supabase.from(tableName).insert(payload).select('id').single()
    if (error) throw new Error(error.message)
    return data.id
  }
}

export async function deleteCatalogItem(tableName: string, id: number): Promise<void> {
  if (tableName === 'tareo_periodo') {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  // Logical delete by default for catalogs
  const { error } = await supabase.from(tableName).update({ activo: false }).eq('id', id)
  if (error) throw new Error(error.message)
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

/**
 * Valida que la fecha pertenezca al rango de fechas del período de la tarea_periodo.
 * Si no coincide, busca automáticamente la tarea_periodo correspondiente a esa fecha
 * o lanza un error descriptivo si no existe.
 */
export async function resolveValidTareaPeriodoForFecha(
  tareaPeriodoId: number,
  fecha: string
): Promise<{ tareaPeriodoId: number; tareaId: number }> {
  if (!fecha) {
    throw new Error('La fecha es obligatoria.')
  }
  if (!tareaPeriodoId) {
    throw new Error('La tarea del período es obligatoria.')
  }

  const parts = fecha.split('-').map(Number)
  const regAnio = parts[0]
  const regMes = parts[1]

  // 1. Obtener la tarea_periodo actual con su periodo y tarea
  const { data: currentTp, error: currentTpError } = await supabase
    .from('tareo_tarea_periodo')
    .select(`
      id,
      tarea_id,
      periodo_id,
      tareo_tarea (nombre),
      tareo_periodo (id, anio, mes, fecha_inicio, fecha_fin, cerrado)
    `)
    .eq('id', tareaPeriodoId)
    .single()

  if (currentTpError || !currentTp) {
    throw new Error('No se encontró la tarea del período seleccionada.')
  }

  const periodoActual = currentTp.tareo_periodo as any
  const tareaNombre = (currentTp.tareo_tarea as any)?.nombre ?? `ID ${currentTp.tarea_id}`

  // 2. Verificar si la fecha coincide con el periodo actual
  const coincidePeriodo =
    periodoActual &&
    ((periodoActual.anio === regAnio && periodoActual.mes === regMes) ||
      (periodoActual.fecha_inicio &&
        periodoActual.fecha_fin &&
        fecha >= periodoActual.fecha_inicio &&
        fecha <= periodoActual.fecha_fin))

  if (coincidePeriodo) {
    return { tareaPeriodoId: currentTp.id, tareaId: currentTp.tarea_id }
  }

  // 3. Si no coincide, buscar el período correspondiente a esa fecha en tareo_periodo
  const { data: periodosList, error: pErr } = await supabase
    .from('tareo_periodo')
    .select('id, anio, mes, cerrado, fecha_inicio, fecha_fin')

  if (pErr || !periodosList || periodosList.length === 0) {
    throw new Error('No se pudieron obtener los períodos configurados en el sistema.')
  }

  const targetPeriodo =
    periodosList.find(
      (p: any) => p.fecha_inicio && p.fecha_fin && fecha >= p.fecha_inicio && fecha <= p.fecha_fin
    ) ?? periodosList.find((p: any) => p.anio === regAnio && p.mes === regMes)

  if (!targetPeriodo) {
    throw new Error(
      `No existe un período configurado en el sistema para la fecha ${fecha} (${regAnio}-${String(regMes).padStart(2, '0')}).`
    )
  }

  if (targetPeriodo.cerrado) {
    throw new Error(
      `El período ${targetPeriodo.anio}-${String(targetPeriodo.mes).padStart(2, '0')} correspondiente a la fecha ${fecha} se encuentra cerrado.`
    )
  }

  // 4. Buscar automáticamente la tarea_periodo de la misma tarea en el periodo de destino
  const { data: targetTp, error: targetTpErr } = await supabase
    .from('tareo_tarea_periodo')
    .select('id, activo')
    .eq('tarea_id', currentTp.tarea_id)
    .eq('periodo_id', targetPeriodo.id)
    .single()

  if (targetTp && !targetTpErr) {
    return { tareaPeriodoId: targetTp.id, tareaId: currentTp.tarea_id }
  }

  // 5. Si no existe en el periodo de destino, rechazar con mensaje descriptivo
  throw new Error(
    `La fecha del registro (${fecha}) corresponde al período ${targetPeriodo.anio}-${String(targetPeriodo.mes).padStart(2, '0')}, pero la tarea "${tareaNombre}" no está asignada a dicho período. Por favor, asigna o arrastra la tarea al período ${targetPeriodo.anio}-${String(targetPeriodo.mes).padStart(2, '0')} antes de registrar horas.`
  )
}

export async function createRegistro(payload: RegistroFormData): Promise<number> {
  const { tareaPeriodoId, tareaId } = await resolveValidTareaPeriodoForFecha(
    payload.tarea_periodo_id,
    payload.fecha
  )

  const { data, error } = await supabase
    .from('tareo_registro')
    .insert({
      tarea_id: tareaId,
      tarea_periodo_id: tareaPeriodoId,
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
  const { tareaPeriodoId, tareaId } = await resolveValidTareaPeriodoForFecha(
    payload.tarea_periodo_id,
    payload.fecha
  )

  const { error } = await supabase
    .from('tareo_registro')
    .update({
      tarea_id: tareaId,
      tarea_periodo_id: tareaPeriodoId,
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

export async function getTrabajadorValidacion(trabajadorId: number): Promise<{ horas_maximas: number | null } | null> {
  const { data, error } = await supabase
    .from('tareo_trabajador')
    .select('horas_maximas')
    .eq('id', trabajadorId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(error.message)
  }

  return {
    horas_maximas: data.horas_maximas !== null ? Number(data.horas_maximas) : null
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

export async function getRegistrosByPeriodo(periodoId: number): Promise<RegistroDetalleItem[]> {
  const { data, error } = await supabase
    .from('v_tareo_registro_detalle')
    .select('*')
    .eq('periodo_id', periodoId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((item: any) => ({
    ...item,
    horas: Number(item.horas ?? 0)
  })) as RegistroDetalleItem[]
}

export async function getTareaHistorial(tareaId: number): Promise<RegistroDetalleItem[]> {
  const { data, error } = await supabase
    .from('v_tareo_registro_detalle')
    .select('*')
    .eq('tarea_id', tareaId)
    .order('fecha', { ascending: false })

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

/**
 * Ejecuta la función SQL de arrastre mensual automático.
 * Retorna un resumen de la operación: cuántas tareas fueron arrastradas
 * y los IDs de período de origen y destino.
 */
export async function ejecutarArrastreMensual(): Promise<{
  tareas_arrastradas: number
  periodo_origen_id: number | null
  periodo_destino_id: number | null
  mensaje: string
}> {
  const { data, error } = await supabase.rpc('tareo_arrastre_mensual_automatico')

  if (error) {
    throw new Error(error.message)
  }

  return data as {
    tareas_arrastradas: number
    periodo_origen_id: number | null
    periodo_destino_id: number | null
    mensaje: string
  }
}

export async function getRegistrosByCatalogItem(
  type: string,
  id: number,
  periodoId?: number | null
): Promise<RegistroDetalleItem[]> {
  let query = supabase
    .from('v_tareo_registro_detalle')
    .select('*')

  if (type === 'trabajadores') {
    query = query.eq('trabajador_id', id)
  } else if (type === 'teams') {
    query = query.eq('team_id', id)
  } else if (type === 'solicitantes') {
    query = query.eq('solicitante_id', id)
  } else if (type === 'agrupadores') {
    query = query.eq('agrupador_id', id)
  } else if (type === 'proyectos') {
    query = query.eq('proyecto_id', id)
  } else if (type === 'areas') {
    const { data: agrupadores, error: errAgrup } = await supabase
      .from('tareo_agrupador')
      .select('id')
      .eq('area_id', id)

    if (errAgrup) throw new Error(errAgrup.message)
    const agrupadorIds = (agrupadores || []).map((a: any) => a.id)
    if (agrupadorIds.length === 0) return []
    query = query.in('agrupador_id', agrupadorIds)
  }

  if (periodoId) {
    query = query.eq('periodo_id', periodoId)
  }

  const { data, error } = await query.order('fecha', { ascending: false })

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