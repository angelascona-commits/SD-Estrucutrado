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
  TareaListItem,
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

function mapTareaRow(item: any): TareaListItem {
  const proyecto = Array.isArray(item.tareo_proyecto) ? item.tareo_proyecto[0] : item.tareo_proyecto
  const agrupador = Array.isArray(proyecto?.tareo_agrupador)
    ? proyecto?.tareo_agrupador[0]
    : proyecto?.tareo_agrupador
  const team = Array.isArray(item.tareo_team) ? item.tareo_team[0] : item.tareo_team
  const solicitante = Array.isArray(item.tareo_solicitante)
    ? item.tareo_solicitante[0]
    : item.tareo_solicitante
  const estado = Array.isArray(item.tareo_estado_tarea)
    ? item.tareo_estado_tarea[0]
    : item.tareo_estado_tarea
  const periodo = Array.isArray(item.tareo_periodo) ? item.tareo_periodo[0] : item.tareo_periodo

  return {
    id: item.id,
    nombre: item.nombre,
    periodo_id: item.periodo_id,
    periodo_anio: periodo?.anio ?? null,
    periodo_mes: periodo?.mes ?? null,
    periodo_cerrado: periodo?.cerrado ?? null,
    proyecto_id: item.proyecto_id,
    proyecto_nombre: proyecto?.nombre ?? '',
    agrupador_id: agrupador?.id ?? 0,
    agrupador_nombre: agrupador?.nombre ?? '',
    team_id: item.team_id,
    team_nombre: team?.nombre ?? null,
    solicitante_id: item.solicitante_id,
    solicitante_nombre: solicitante?.nombre ?? '',
    estado_id: item.estado_id,
    estado_nombre: estado?.nombre ?? '',
    horas_totales: Number(item.horas_totales ?? 0),
    horas_consumidas: Number(item.horas_consumidas ?? 0),
    horas_disponibles: Number(item.horas_disponibles ?? 0),
    comentario_ps: item.comentario_ps,
    activo: item.activo,
    created_at: item.created_at,
    updated_at: item.updated_at
  }
}

export async function getAllTareas(): Promise<TareaListItem[]> {
  const { data, error } = await supabase
    .from('tareo_tarea')
    .select(`
      id,
      nombre,
      periodo_id,
      proyecto_id,
      team_id,
      solicitante_id,
      estado_id,
      horas_totales,
      horas_consumidas,
      horas_disponibles,
      comentario_ps,
      activo,
      created_at,
      updated_at,
      tareo_periodo:periodo_id (
        id,
        anio,
        mes,
        cerrado
      ),
      tareo_proyecto:proyecto_id (
        id,
        nombre,
        agrupador_id,
        tareo_agrupador:agrupador_id (
          id,
          nombre
        )
      ),
      tareo_team:team_id (
        id,
        nombre
      ),
      tareo_solicitante:solicitante_id (
        id,
        nombre
      ),
      tareo_estado_tarea:estado_id (
        id,
        nombre
      )
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapTareaRow)
}

export async function getTareaById(id: number): Promise<TareaListItem | null> {
  const { data, error } = await supabase
    .from('tareo_tarea')
    .select(`
      id,
      nombre,
      periodo_id,
      proyecto_id,
      team_id,
      solicitante_id,
      estado_id,
      horas_totales,
      horas_consumidas,
      horas_disponibles,
      comentario_ps,
      activo,
      created_at,
      updated_at,
      tareo_periodo:periodo_id (
        id,
        anio,
        mes,
        cerrado
      ),
      tareo_proyecto:proyecto_id (
        id,
        nombre,
        agrupador_id,
        tareo_agrupador:agrupador_id (
          id,
          nombre
        )
      ),
      tareo_team:team_id (
        id,
        nombre
      ),
      tareo_solicitante:solicitante_id (
        id,
        nombre
      ),
      tareo_estado_tarea:estado_id (
        id,
        nombre
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw new Error(error.message)
  }

  return mapTareaRow(data)
}

export async function createTarea(payload: TareaFormData): Promise<number> {
  const { data, error } = await supabase
    .from('tareo_tarea')
    .insert({
      periodo_id: payload.periodo_id,
      nombre: payload.nombre,
      proyecto_id: payload.proyecto_id,
      team_id: payload.team_id,
      solicitante_id: payload.solicitante_id,
      estado_id: payload.estado_id,
      horas_totales: payload.horas_totales,
      comentario_ps: payload.comentario_ps,
      activo: payload.activo ?? true
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data.id
}

export async function updateTarea(id: number, payload: TareaFormData): Promise<void> {
  const { error } = await supabase
    .from('tareo_tarea')
    .update({
      periodo_id: payload.periodo_id,
      nombre: payload.nombre,
      proyecto_id: payload.proyecto_id,
      team_id: payload.team_id,
      solicitante_id: payload.solicitante_id,
      estado_id: payload.estado_id,
      horas_totales: payload.horas_totales,
      comentario_ps: payload.comentario_ps,
      activo: payload.activo ?? true
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
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
    horas_totales: Number(item.horas_totales ?? 0),
    horas_consumidas: Number(item.horas_consumidas ?? 0),
    horas_disponibles: Number(item.horas_disponibles ?? 0),
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
    horas_totales: Number(data.horas_totales ?? 0),
    horas_consumidas: Number(data.horas_consumidas ?? 0),
    horas_disponibles: Number(data.horas_disponibles ?? 0),
    solicitante_horas_maximas_estimadas:
      data.solicitante_horas_maximas_estimadas !== null
        ? Number(data.solicitante_horas_maximas_estimadas)
        : null
  } as RegistroDetalleItem
}

export async function createRegistro(payload: RegistroFormData): Promise<number> {
  const { data, error } = await supabase
    .from('tareo_registro')
    .insert({
      tarea_id: payload.tarea_id,
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
  const { error } = await supabase
    .from('tareo_registro')
    .update({
      tarea_id: payload.tarea_id,
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