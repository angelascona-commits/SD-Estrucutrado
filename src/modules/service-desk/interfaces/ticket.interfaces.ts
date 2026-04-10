export interface RawDashboardTicket {
  id: number
  numero_ticket: number
  descripcion: string
  estado_nombre: string
  aplicacion_nombre: string | null
  responsable_nombre: string | null
  fecha_creacion_sd: string | null
  fecha_asignacion: string | null
  fecha_maxima_atencion: string | null
  fecha_atencion: string | null
}

export interface TicketTableRow {
  id: number
  numero_ticket: number
  fecha_asignacion: string | null
  fecha_creacion_sd: string | null
  estado: string
  descripcion: string
  aplicacion: string
  designado_a: string | null
  tAreaAsignacionHoras: number | null
  tAreaAsignacionLabel: string
  tAreaAsignacionExcede: boolean
  tiempoLimiteHoras: number | null
  tiempoLimiteLabel: string
  tiempoLimiteCumple: boolean
  resolucionDias: number | null
  resolucionLabel: string
}

export interface Feriado {
  id: number
  fecha: string
  descripcion: string | null
}

export interface TicketFilters {
  q?: string
  estado?: string
  aplicacion?: string
  designado?: string
  fechaAsignacionStart?: string
  fechaAsignacionEnd?: string
  tAsignacionMin?: number
  tAsignacionMax?: number
  tLimiteMin?: number
  tLimiteMax?: number
  resolucionMin?: number
  resolucionMax?: number
}

export interface TicketFilterCatalogs {
  estados: string[]
  aplicaciones: string[]
  responsables: string[]
}

export interface PaginatedTickets {
  data: TicketTableRow[]
  totalCount: number
  totalPages: number
  currentPage: number
  catalogs: TicketFilterCatalogs
}

export interface UrgentTicket {
  id: number
  numero_ticket: number
  descripcion: string
  designado_a: string
  retrasoDias: number
}

export interface TicketFormValues {
  id: number | null
  numero_ticket: number | null
  descripcion: string
  estado_id: number | null
  prioridad_id: number | null
  responsable_id: number | null
  estado_jira_id: number | null
  tipo_sd: string
  aplicacion_id: number | null
  producto_id: number | null
  dni: string
  poliza: string
  comentario: string
  horas_invertidas: number | null
  observaciones: string
  horario_laboral: string
  fecha_registro: string | null
  fecha_creacion_sd: string | null
  fecha_asignacion: string | null
  fecha_maxima_atencion: string | null
  fecha_atencion: string | null
  fecha_delegacion: string | null
}

export interface TicketHistoryEntry {
  id: number
  ticket_id?: number
  usuario_id?: number
  fecha_movimiento: string
  accion: string
  descripcion_cambio: string | null
  usuario_nombre: string | null
}

export interface TicketCatalogOption {
  id: number
  nombre: string
}

export interface TicketUserCatalogOption {
  id: number
  nombre: string
  horario_laboral?: string | null
}

export interface TicketFormCatalogs {
  usuarios: TicketUserCatalogOption[]
  estados: TicketCatalogOption[]
  aplicaciones: TicketCatalogOption[]
  estadosJira: TicketCatalogOption[]
  prioridades: TicketCatalogOption[]
  productos: TicketCatalogOption[]
}

export interface TicketSlaInfo {
  asignacionHoras: number | null
  asignacionExcede: boolean
  asignacionMensaje: string | null
  atencionHoras: number | null
  atencionIncumpleMinimo: boolean
  atencionMensaje: string | null
}

export interface TicketModalData {
  catalogs: TicketFormCatalogs
  ticket: TicketFormValues | null
  history: TicketHistoryEntry[]
  feriados: Feriado[]
  sla: TicketSlaInfo
  success: boolean
  error?: string
}

export interface SaveTicketActionResult {
  success: boolean
  ticketId?: number
  error?: string
  sla?: TicketSlaInfo
}

export interface DelayedTicketModalRow {
  id: number
  numero_ticket: number
  descripcion: string
  designado_a: string
  retrasoDias: number
  fecha_maxima_atencion: string | null
}