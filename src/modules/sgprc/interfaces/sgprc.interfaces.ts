export interface Solicitud {
  id: number
  orquestador_id: number
  orquestador_nombre?: string
  proyectista_id: number
  proyectista_nombre?: string
  descripcion_negocio: string
  sustento_tecnico: string
  estado: 'Borrador' | 'Pendiente Infraestructura' | 'Pendiente Ciberseguridad' | 'Aprobado' | 'Rechazado'
  created_at: string
  updated_at: string
  componentes?: ComponenteCloud[]
  evaluacion?: EvaluacionTecnica
}

export interface ComponenteCloud {
  id?: number
  solicitud_id?: number
  servicio_requerido: string
  entorno: string
  configuracion_detalles: string
  usuario_cloud?: string
  cuenta_cloud?: string
  accion_cloud?: string
}

export interface EvaluacionTecnica {
  id?: number
  solicitud_id: number
  evaluador_infraestructura_id?: number | null
  evaluador_infraestructura_nombre?: string
  presupuesto: number
  integraciones_detail?: string // for compatibility
  integraciones_detalle?: string
  aprobador_ciberseguridad_id?: number | null
  aprobador_ciberseguridad_nombre?: string
  reglas_perimetrales?: string
  comentarios?: string
  updated_at?: string
}

export interface AuditoriaLog {
  id: number
  solicitud_id: number
  usuario_id: number
  usuario_nombre?: string
  accion: string
  created_at: string
}

export interface SolicitudFormData {
  id?: number
  proyectista_id: number
  descripcion_negocio: string
  sustento_tecnico: string
  estado?: 'Borrador' | 'Pendiente Infraestructura' | 'Pendiente Ciberseguridad' | 'Aprobado' | 'Rechazado'
  componentes: ComponenteCloud[]
}

export interface EvaluacionFormData {
  solicitud_id: number
  presupuesto?: number
  integraciones_detalle?: string
  reglas_perimetrales?: string
  comentarios?: string
  rol_evaluador: 'infraestructura' | 'ciberseguridad'
}

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface SGPRCMetricConfig {
  id: number
  key_name: string
  label: string
  estado_asociado: string | null
  style_class: string
  orden: number
  activo: boolean
}

export interface SGPRCCatalogs {
  usuarios: Array<{ id: number; nombre: string; email: string; rol: string }>
  serviciosDisponibles: string[]
  entornos: string[]
  metricasConfig: SGPRCMetricConfig[]
  cuentas: string[]
  acciones: string[]
  proyectistas: Array<{ id: number; nombre: string }>
}
