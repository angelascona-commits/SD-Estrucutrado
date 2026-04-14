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
  horas_totales: number
  comentario_ps: string | null
  activo?: boolean
}

export interface RegistroFormData {
  id?: number
  tarea_id: number
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

export interface TareaListItem {
  id: number
  nombre: string
  periodo_id: number
  periodo_anio: number | null
  periodo_mes: number | null
  periodo_cerrado: boolean | null
  proyecto_id: number
  proyecto_nombre: string
  agrupador_id: number
  agrupador_nombre: string
  team_id: number | null
  team_nombre: string | null
  solicitante_id: number
  solicitante_nombre: string
  estado_id: number
  estado_nombre: string
  horas_totales: number
  horas_consumidas: number
  horas_disponibles: number
  comentario_ps: string | null
  activo: boolean
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
  tarea_id: number
  tarea_nombre: string
  horas_totales: number
  horas_consumidas: number
  horas_disponibles: number
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