export interface RetrasoTicket {
    ticket_id: number;
    codigo_ticket: string;
    descripcion: string;
    aplicacion: string;
    responsable: string;
    dias_retraso: number;
    estado: string;
}