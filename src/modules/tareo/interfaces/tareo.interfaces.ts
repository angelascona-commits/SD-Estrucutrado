export interface CatalogItem {
  id: number
  nombre: string
}

export interface TrabajadorItem extends CatalogItem {
  correo: string | null
  telefono: string | null
}

export interface SolicitanteItem extends CatalogItem {
  horas_maximas_estimadas: number | null
}

export interface PeriodoItem {
  id: number
  anio: number
  mes: number
  fecha_inicio: string
  fecha_fin: string
  cerrado: boolean
}

export interface ProyectoItem extends CatalogItem {
  agrupador_id: number
}

export interface TareoCatalogs {
  trabajadores: TrabajadorItem[]
  teams: CatalogItem[]
  solicitantes: SolicitanteItem[]
  agrupadores: CatalogItem[]
  proyectos: ProyectoItem[]
  estadosTarea: CatalogItem[]
  periodos: PeriodoItem[]
}

export interface TareaFormData {
  id?: number
  periodo_id: number
  nombre: string
  proyecto_id: number
  team_id: number | null
  solicitante_id: number
  estado_id: number
  horas_historicas_arrastre: number
  horas_asignadas_periodo: number
  comentario_periodo: string | null
  activo?: boolean
}

export interface RegistroFormData {
  id?: number
  tarea_periodo_id: number
  fecha: string
  trabajador_id: number
  horas: number
  comentario: string | null
}

export interface TareaFilters {
  periodo_id?: number | null
  agrupador_id?: number | null
  proyecto_id?: number | null
  solicitante_id?: number | null
  estado_id?: number | null
  team_id?: number | null
  activo?: boolean | null
  search?: string
}

export interface TareaPeriodoListItem {
  tarea_periodo_id: number
  tarea_id: number
  tarea_nombre: string
  team_id: number | null
  team_nombre: string | null
  solicitante_id: number
  solicitante_nombre: string
  horas_maximas_estimadas: number | null
  proyecto_id: number
  proyecto_nombre: string
  agrupador_id: number
  agrupador_nombre: string
  estado_id: number
  estado_nombre: string
  activo: boolean
  periodo_id: number
  periodo_anio: number
  periodo_mes: number
  periodo_cerrado: boolean
  horas_historicas_arrastre: number
  horas_asignadas_periodo: number
  horas_consumidas_periodo: number
  horas_disponibles_periodo: number
  horas_totales_acumuladas: number
  comentario_periodo: string | null
  created_at: string
  updated_at: string
}

export interface RegistroDetalleItem {
  id: number
  fecha: string
  horas: number
  comentario: string | null
  created_at: string
  updated_at: string
  tarea_periodo_id: number
  tarea_id: number
  tarea_nombre: string
  horas_historicas_arrastre: number
  horas_asignadas_periodo: number
  horas_consumidas_periodo: number
  horas_disponibles_periodo: number
  horas_totales_acumuladas: number
  estado_tarea: string
  trabajador_id: number
  trabajador_nombre: string
  team_id: number | null
  team_nombre: string | null
  solicitante_id: number
  solicitante_nombre: string
  solicitante_horas_maximas_estimadas: number | null
  proyecto_id: number
  proyecto_nombre: string
  agrupador_id: number
  agrupador_nombre: string
  periodo_id: number
  anio: number
  mes: number
  cerrado: boolean
}

export interface ResumenDiarioGeneralItem {
  anio: number
  mes: number
  fecha: string
  horas_dia: number
  horas_acumuladas_mes: number
}

export interface ResumenDiarioTrabajadorItem {
  anio: number
  mes: number
  fecha: string
  trabajador_id: number
  trabajador_nombre: string
  horas_dia: number
  horas_acumuladas_mes: number
}

export interface ResumenDiarioSolicitanteItem {
  anio: number
  mes: number
  fecha: string
  solicitante_id: number
  solicitante_nombre: string
  horas_maximas_estimadas: number | null
  horas_dia: number
  horas_acumuladas_mes: number
}

export interface ActionResult<T = null> {
  success: boolean
  data?: T
  error?: string
}
export interface RegistroRealtimeValidationResult {
  horas_trabajador_dia: number
  horas_ingresadas: number
  total_horas_resultante: number
  horas_disponibles_periodo: number
  excede_maximo_dia: boolean
  excede_horas_disponibles: boolean
  periodo_cerrado: boolean
  can_save: boolean
  messages: string[]
}