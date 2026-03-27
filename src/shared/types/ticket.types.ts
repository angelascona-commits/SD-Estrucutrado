export interface FormDataModal {
  numero_ticket: string | number;
  tipo_sd: string;
  descripcion: string;
  dni: string;
  poliza: string;
  prioridad_id: string | number;
  producto_id: string | number;
  responsable_id: string | number;
  estado_id: string | number;
  aplicacion_id: string | number;
  estado_jira_id: string | number;
  horas_invertidas: number | string;
  observaciones: string;
  horario_laboral: string;
  fecha_registro: string;
  fecha_creacion_sd: string;
  fecha_asignacion: string;
  fecha_delegacion: string;
  fecha_estimada: string;
  fecha_maxima_atencion: string;
  fecha_atencion: string;
}

export interface CatalogoItem {
  id: number;
  nombre?: string;
  nombre_completo?: string;
  horario_laboral?: string;
}