import { supabase } from '@/modules/shared/infra/supabase'
import { RawDashboardTicket, Feriado } from '@/modules/service-desk/interfaces/ticket.interfaces'

function mapRawTicketRow(t: any): RawDashboardTicket {
  const tiempos = Array.isArray(t.ticket_tiempos) ? t.ticket_tiempos[0] : t.ticket_tiempos
  const gestion = Array.isArray(t.ticket_gestion) ? t.ticket_gestion[0] : t.ticket_gestion
  const aplicacion =
    gestion && gestion.aplicacion
      ? Array.isArray(gestion.aplicacion)
        ? gestion.aplicacion[0]
        : gestion.aplicacion
      : null

  return {
    id: t.id,
    numero_ticket: t.numero_ticket,
    descripcion: t.descripcion,
    estado_nombre: t.estado?.nombre || 'Desconocido',
    aplicacion_nombre: aplicacion?.nombre || null,
    responsable_nombre: t.responsable?.nombre || null,
    fecha_creacion_sd: tiempos?.fecha_creacion_sd || null,
    fecha_asignacion: tiempos?.fecha_asignacion || null,
    fecha_maxima_atencion: tiempos?.fecha_maxima_atencion || null,
    fecha_atencion: tiempos?.fecha_atencion || null,
  }
}

function isArchivedTicket(t: RawDashboardTicket): boolean {
  const estado = t.estado_nombre?.trim().toLowerCase() || ''

  return (
    estado.includes('desestimado') ||
    estado.includes('corresponde a mg')
  )
}

export async function getDashboardTickets(): Promise<RawDashboardTicket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      id,
      numero_ticket,
      descripcion,
      estado!inner ( nombre ),
      responsable:usuarios!tickets_responsable_id_fkey ( nombre ),
      ticket_tiempos!inner ( fecha_creacion_sd, fecha_asignacion, fecha_maxima_atencion, fecha_atencion ),
      ticket_gestion (
        aplicacion ( nombre )
      )
    `)
    .order('id', { ascending: true })

  if (error || !data) {
    console.error('Error fetching tickets:', error)
    return []
  }

  const mapped = data.map(mapRawTicketRow)

  // 🔥 AQUÍ SE EXCLUYEN DEL DASHBOARD
  return mapped.filter((t) => !isArchivedTicket(t))
}

export async function getArchivedTickets(): Promise<RawDashboardTicket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      id,
      numero_ticket,
      descripcion,
      estado!inner ( nombre ),
      responsable:usuarios!tickets_responsable_id_fkey ( nombre ),
      ticket_tiempos!inner ( fecha_creacion_sd, fecha_asignacion, fecha_maxima_atencion, fecha_atencion ),
      ticket_gestion (
        aplicacion ( nombre )
      )
    `)
    .order('id', { ascending: true })

  if (error || !data) {
    console.error('Error fetching archived tickets:', error)
    return []
  }

  const mapped = data.map(mapRawTicketRow)

  // 🔥 SOLO ARCHIVADOS
  return mapped.filter(isArchivedTicket)
}

export async function getFeriados(): Promise<Feriado[]> {
  const { data, error } = await supabase
    .from('feriados')
    .select('id, fecha, descripcion')

  if (error || !data) {
    console.error('Error fetching feriados:', error)
    return []
  }

  return data as Feriado[]
}

export async function getTicketFormCatalogs() {
  const [usuarios, estados, apps, estadosJira, prioridades, productos] = await Promise.all([
    supabase.from('usuarios').select('id, nombre, horario_laboral').eq('activo', true).order('nombre'),
    supabase.from('estado').select('id, nombre').order('id'),
    supabase.from('aplicacion').select('id, nombre').order('nombre'),
    supabase.from('estado_jira').select('id, nombre').order('id'),
    supabase.from('prioridad').select('id, nombre').order('id'),
    supabase.from('producto').select('id, nombre').order('nombre'),
  ])

  return {
    usuarios: usuarios.data || [],
    estados: estados.data || [],
    aplicaciones: apps.data || [],
    estadosJira: estadosJira.data || [],
    prioridades: prioridades.data || [],
    productos: productos.data || [],
  }
}