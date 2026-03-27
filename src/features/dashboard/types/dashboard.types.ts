export interface Ticket {
    ticket_id: string | number;
    numero_ticket: number;
    codigo_ticket: string;
    descripcion: string;
    responsable: string | null;
    estado: string;
    aplicacion: string | null;
    fecha_asignacion: string | null;
    fecha_creacion_sd: string | null;
    fecha_maxima_atencion: string | null;
    fecha_atencion: string | null;
    dias_retraso?: number; // Opcional porque viene en la vista de alarmas
    [key: string]: any; // Para permitir el acceso dinámico en el ordenamiento
}

export interface Feriado {
    fecha: string;
}

export interface FiltrosDashboard {
    fecha_asignacion_desde: string;
    fecha_asignacion_hasta: string;
    fecha_asignacion_vacia: boolean;
    fecha_creacion_sd_desde: string;
    fecha_creacion_sd_hasta: string;
    fecha_creacion_sd_vacia: boolean;
    estado: string;
    codigo_ticket: string;
    descripcion: string;
    aplicacion: string;
    responsable: string;
    [key: string]: string | boolean; // Para permitir firmas de índice
}

export interface OrdenConfig {
    columna: string | null;
    direccion: 'asc' | 'desc';
}