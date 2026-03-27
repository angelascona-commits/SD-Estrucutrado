import { supabase } from '@/lib/supabase';

// 1. OBTENER TODOS LOS CATÁLOGOS EN UNA SOLA LLAMADA
export const fetchCatalogos = async () => {
  const [resResp, resEst, resApp, resJira, resPrio, resFeriados, resProd] = await Promise.all([
    supabase.from('usuarios').select('id, nombre, horario_laboral').eq('activo', true),
    supabase.from('estado').select('id, nombre'),
    supabase.from('aplicacion').select('id, nombre'),
    supabase.from('estado_jira').select('id, nombre'),
    supabase.from('prioridad').select('id, nombre'),
    supabase.from('feriados').select('fecha'),
    supabase.from('producto').select('id, nombre').order('nombre')
  ]);

  return {
    responsables: resResp.data || [],
    estados: resEst.data || [],
    aplicaciones: resApp.data || [],
    estadosJira: resJira.data || [],
    prioridades: resPrio.data || [],
    feriados: resFeriados.data ? resFeriados.data.map(f => f.fecha) : [],
    productos: resProd.data || []
  };
};

// 2. OBTENER DATOS DE UN TICKET ESPECÍFICO Y SU HISTORIAL
export const fetchTicketData = async (numeroTicket: string | number) => {
  const { data: ticket, error: errorTicket } = await supabase
    .from('tickets')
    .select('*, estado:estado_id (nombre)')
    .eq('numero_ticket', numeroTicket)
    .single();

  if (errorTicket) throw errorTicket;

  const { data: historial } = await supabase
    .from('historial_tickets')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('fecha_registro', { ascending: true });

  return { ticket, historial: historial || [] };
};

// 3. GUARDAR EL TICKET (Insert o Update)
export const saveTicketBD = async (payload: any, isEditing: boolean, ticketId?: number) => {
  if (isEditing) {
    const { error } = await supabase.from('tickets').update(payload).eq('id', ticketId).select();
    if (error) throw error;
    return ticketId;
  } else {
    const { data, error } = await supabase.from('tickets').insert([payload]).select();
    if (error) throw error;
    return data[0].id; // Retorna el nuevo ID
  }
};

// 4. GUARDAR KPIs
export const saveTicketKPIs = async (payloadKpi: any) => {
  const { error } = await supabase.from('ticket_kpis').upsert(payloadKpi, { onConflict: 'ticket_id' });
  if (error) throw error;
};

// 5. REGISTRAR HISTORIAL
export const saveHistorial = async (ticketId: number, usuarioId: number, usuarioNombre: string, isEditing: boolean, observaciones: string) => {
  const { error } = await supabase.from('historial_tickets').insert([{
    ticket_id: ticketId,
    usuario_id: usuarioId,
    tipo_accion: isEditing ? 'EDICION' : 'CREACION',
    descripcion: isEditing ? 'Actualización de datos del ticket' : 'Ticket Registrado',
    detalle_extra: observaciones || '',
    usuario: usuarioNombre
  }]);
  if (error) throw error;
};