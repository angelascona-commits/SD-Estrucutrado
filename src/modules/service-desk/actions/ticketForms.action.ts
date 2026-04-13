'use server'

import {
  getFeriados,
  getTicketFormCatalogs,
} from '@/modules/service-desk/repository/ticket.repository'
import {
  Feriado,
  SaveTicketActionResult,
  TicketHistoryEntry,
  TicketFormValues,
  TicketModalData,
  TicketSlaInfo,
} from '@/modules/service-desk/interfaces/ticket.interfaces'
import { calculateBusinessHours } from '@/modules/shared/utils/calculateBusinessHours'
import { supabase } from '@/modules/shared/infra/supabase'
import { getSession } from '@/modules/shared/utils/session'
import { revalidatePath } from 'next/cache'

function buildTicketSlaInfo(
  fechaCreacionSd: string | null,
  fechaAsignacion: string | null,
  fechaMaximaAtencion: string | null,
  feriados: Feriado[]
): TicketSlaInfo {
  const asignacionHoras = calculateBusinessHours(
    fechaCreacionSd,
    fechaAsignacion,
    feriados
  )

  const atencionHoras = calculateBusinessHours(
    fechaAsignacion,
    fechaMaximaAtencion,
    feriados
  )

  const asignacionExcede = asignacionHoras !== null && asignacionHoras > 8
  const atencionIncumpleMinimo = atencionHoras !== null && atencionHoras < 16

  const asignacionMensaje =
    asignacionHoras === null
      ? null
      : asignacionExcede
        ? `⚠️ Excede 8 hrs laborales (${asignacionHoras.toFixed(2)} hrs)`
        : `✅ Asignación a tiempo (${asignacionHoras.toFixed(2)} hrs)`

  const atencionMensaje =
    atencionHoras === null
      ? null
      : atencionIncumpleMinimo
        ? `⚠️ Menor a 16 hrs laborales (${atencionHoras.toFixed(2)} hrs)`
        : `✅ Rango correcto (${atencionHoras.toFixed(2)} hrs)`

  return {
    asignacionHoras,
    asignacionExcede,
    asignacionMensaje,
    atencionHoras,
    atencionIncumpleMinimo,
    atencionMensaje,
  }
}

export async function fetchFormCatalogsAction() {
  return await getTicketFormCatalogs()
}

export async function fetchTicketModalData(id?: number): Promise<TicketModalData> {
  try {
    const [catalogs, feriados] = await Promise.all([
      getTicketFormCatalogs(),
      getFeriados(),
    ])

    if (!id) {
      return {
        catalogs,
        ticket: null,
        history: [],
        feriados,
        sla: buildTicketSlaInfo(null, null, null, feriados),
        success: true,
      }
    }

    const { data: ticketRaw, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        numero_ticket,
        descripcion,
        estado_id,
        prioridad_id,
        responsable_id,
        estado_jira_id,
        horario_laboral,
        ticket_tiempos (
          fecha_registro,
          fecha_creacion_sd,
          fecha_asignacion,
          fecha_maxima_atencion,
          fecha_atencion,
          fecha_delegacion
        ),
        ticket_gestion (
          tipo_sd,
          aplicacion_id,
          producto_id,
          dni,
          poliza,
          comentario,
          horas_invertidas,
          observaciones
        )
      `)
      .eq('id', id)
      .single()

    if (ticketError || !ticketRaw) {
      throw new Error(ticketError?.message || 'No se encontró el ticket solicitado')
    }

    const tiempos = Array.isArray(ticketRaw.ticket_tiempos)
      ? ticketRaw.ticket_tiempos[0]
      : ticketRaw.ticket_tiempos

    const gestion = Array.isArray(ticketRaw.ticket_gestion)
      ? ticketRaw.ticket_gestion[0]
      : ticketRaw.ticket_gestion

    const ticket: TicketFormValues = {
      id: ticketRaw.id ?? null,
      numero_ticket: ticketRaw.numero_ticket ?? null,
      descripcion: ticketRaw.descripcion ?? '',
      estado_id: ticketRaw.estado_id ?? null,
      prioridad_id: ticketRaw.prioridad_id ?? null,
      responsable_id: ticketRaw.responsable_id ?? null,
      estado_jira_id: ticketRaw.estado_jira_id ?? null,
      tipo_sd: gestion?.tipo_sd ?? '',
      aplicacion_id: gestion?.aplicacion_id ?? null,
      producto_id: gestion?.producto_id ?? null,
      dni: gestion?.dni ?? '',
      poliza: gestion?.poliza ?? '',
      comentario: gestion?.comentario ?? '',
      horas_invertidas: gestion?.horas_invertidas ?? null,
      observaciones: gestion?.observaciones ?? '',
      horario_laboral: ticketRaw.horario_laboral ?? '',
      fecha_registro: tiempos?.fecha_registro ?? null,
      fecha_creacion_sd: tiempos?.fecha_creacion_sd ?? null,
      fecha_asignacion: tiempos?.fecha_asignacion ?? null,
      fecha_maxima_atencion: tiempos?.fecha_maxima_atencion ?? null,
      fecha_atencion: tiempos?.fecha_atencion ?? null,
      fecha_delegacion: tiempos?.fecha_delegacion ?? null,
    }

    const { data: historyRaw, error: historyError } = await supabase
      .from('ticket_historial')
      .select(`
        id,
        ticket_id,
        usuario_id,
        fecha_movimiento,
        accion,
        descripcion_cambio,
        usuarios ( nombre )
      `)
      .eq('ticket_id', id)
      .order('fecha_movimiento', { ascending: false })

    if (historyError) {
      throw new Error(historyError.message)
    }

    const history: TicketHistoryEntry[] = (historyRaw || []).map((item: any) => {
      const usuario = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios

      return {
        id: item.id,
        ticket_id: item.ticket_id ?? undefined,
        usuario_id: item.usuario_id ?? undefined,
        fecha_movimiento: item.fecha_movimiento,
        accion: item.accion,
        descripcion_cambio: item.descripcion_cambio ?? null,
        usuario_nombre: usuario?.nombre ?? null,
      }
    })

    const sla = buildTicketSlaInfo(
      ticket.fecha_creacion_sd,
      ticket.fecha_asignacion,
      ticket.fecha_maxima_atencion,
      feriados
    )

    return {
      catalogs,
      ticket,
      history,
      feriados,
      sla,
      success: true,
    }
  } catch (error: any) {
    console.error('Error en fetchTicketModalData:', error)

    return {
      catalogs: {
        usuarios: [],
        estados: [],
        aplicaciones: [],
        estadosJira: [],
        prioridades: [],
        productos: [],
      },
      ticket: null,
      history: [],
      feriados: [],
      sla: buildTicketSlaInfo(null, null, null, []),
      success: false,
      error: error?.message || 'No se pudo cargar la información del ticket',
    }
  }
}

export async function saveTicketAction(prevState: any, formData: FormData): Promise<SaveTicketActionResult> {
  const session = await getSession()

  if (!session) {
    return { success: false, error: 'Sesión no válida o expirada' }
  }

  const idRaw = formData.get('id')
  const isEditing = !!idRaw
  const ticketIdInput = isEditing ? parseInt(idRaw as string) : null

  const numeroTicketRaw = formData.get('numero_ticket')
  const numero_ticket = numeroTicketRaw ? parseInt(numeroTicketRaw as string) : null

  const payload = {
    numero_ticket,
    descripcion: formData.get('descripcion') as string,
    estado_id: formData.get('estado_id') ? parseInt(formData.get('estado_id') as string) : null,
    prioridad_id: formData.get('prioridad_id') ? parseInt(formData.get('prioridad_id') as string) : null,
    responsable_id: formData.get('responsable_id') ? parseInt(formData.get('responsable_id') as string) : null,
    estado_jira_id: formData.get('estado_jira_id') ? parseInt(formData.get('estado_jira_id') as string) : null,
    tipo_sd: formData.get('tipo_sd') as string,
    aplicacion_id: formData.get('aplicacion_id') ? parseInt(formData.get('aplicacion_id') as string) : null,
    producto_id: formData.get('producto_id') ? parseInt(formData.get('producto_id') as string) : null,
    fecha_registro: (formData.get('fecha_registro') as string) || null,
    fecha_creacion_sd: (formData.get('fecha_creacion_sd') as string) || null,
    fecha_asignacion: (formData.get('fecha_asignacion') as string) || null,
    fecha_maxima_atencion: (formData.get('fecha_maxima_atencion') as string) || null,
    fecha_atencion: (formData.get('fecha_atencion') as string) || null,
    fecha_delegacion: (formData.get('fecha_delegacion') as string) || null,
    horario_laboral: (formData.get('horario_laboral') as string) || '',
    dni: (formData.get('dni') as string) || null,
    poliza: (formData.get('poliza') as string) || null,
    comentario: (formData.get('comentario') as string) || null,
    horas_invertidas: formData.get('horas_invertidas')
      ? parseFloat(formData.get('horas_invertidas') as string)
      : null,
    observaciones: (formData.get('observaciones') as string) || null,
  }

  try {
    if (!isEditing && (!payload.numero_ticket || Number.isNaN(payload.numero_ticket))) {
      return { success: false, error: 'El número de ticket es obligatorio' }
    }

    if (!payload.descripcion?.trim()) {
      return { success: false, error: 'La descripción es obligatoria' }
    }
    if (!isEditing && !payload.estado_id) {
      return { success: false, error: 'El estado es obligatorio para crear el ticket' }
    }

    const feriados = await getFeriados()

    const fechaDelegacionFinal =
      payload.responsable_id && !payload.fecha_delegacion
        ? new Date().toISOString()
        : payload.fecha_delegacion

    const sla = buildTicketSlaInfo(
      payload.fecha_creacion_sd,
      payload.fecha_asignacion,
      payload.fecha_maxima_atencion,
      feriados
    )

    let finalTicketId: number

    if (isEditing && ticketIdInput) {
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          descripcion: payload.descripcion,
          estado_id: payload.estado_id,
          prioridad_id: payload.prioridad_id,
          responsable_id: payload.responsable_id,
          estado_jira_id: payload.estado_jira_id,
          horario_laboral: payload.horario_laboral,
        })
        .eq('id', ticketIdInput)

      if (ticketError) throw ticketError
      finalTicketId = ticketIdInput

      const { error: tiemposError } = await supabase.from('ticket_tiempos').upsert({
        ticket_id: finalTicketId,
        fecha_registro: payload.fecha_registro,
        fecha_creacion_sd: payload.fecha_creacion_sd,
        fecha_asignacion: payload.fecha_asignacion,
        fecha_maxima_atencion: payload.fecha_maxima_atencion,
        fecha_atencion: payload.fecha_atencion,
        fecha_delegacion: fechaDelegacionFinal,
      })

      if (tiemposError) throw tiemposError

      const { error: gestionError } = await supabase.from('ticket_gestion').upsert({
        ticket_id: finalTicketId,
        tipo_sd: payload.tipo_sd,
        aplicacion_id: payload.aplicacion_id,
        producto_id: payload.producto_id,
        dni: payload.dni,
        poliza: payload.poliza,
        comentario: payload.comentario,
        horas_invertidas: payload.horas_invertidas,
        observaciones: payload.observaciones,
      })

      if (gestionError) throw gestionError
    } else {
      const { data: newTicket, error: insError } = await supabase
        .from('tickets')
        .insert([
          {
            numero_ticket: payload.numero_ticket,
            descripcion: payload.descripcion,
            estado_id: payload.estado_id,
            prioridad_id: payload.prioridad_id,
            responsable_id: payload.responsable_id,
            estado_jira_id: payload.estado_jira_id,
            horario_laboral: payload.horario_laboral,
            creador_id: session.userId,
          },
        ])
        .select()
        .single()

      if (insError) throw insError
      finalTicketId = newTicket.id

      const { error: tiemposError } = await supabase.from('ticket_tiempos').insert([
        {
          ticket_id: finalTicketId,
          fecha_registro: payload.fecha_registro,
          fecha_creacion_sd: payload.fecha_creacion_sd || new Date().toISOString(),
          fecha_asignacion: payload.fecha_asignacion,
          fecha_maxima_atencion: payload.fecha_maxima_atencion,
          fecha_atencion: payload.fecha_atencion,
          fecha_delegacion: fechaDelegacionFinal,
        },
      ])

      if (tiemposError) throw tiemposError

      const { error: gestionError } = await supabase.from('ticket_gestion').insert([
        {
          ticket_id: finalTicketId,
          tipo_sd: payload.tipo_sd,
          aplicacion_id: payload.aplicacion_id,
          producto_id: payload.producto_id,
          dni: payload.dni,
          poliza: payload.poliza,
          comentario: payload.comentario,
          horas_invertidas: payload.horas_invertidas,
          observaciones: payload.observaciones,
        },
      ])

      if (gestionError) throw gestionError
    }

    const { error: historyError } = await supabase.from('ticket_historial').insert([
      {
        ticket_id: finalTicketId,
        usuario_id: session.userId,
        accion: isEditing ? 'EDICION' : 'CREACION',
        descripcion_cambio: isEditing
          ? 'Actualización de campos desde modal'
          : 'Registro inicial del ticket',
      },
    ])

    if (historyError) throw historyError

    revalidatePath('/service-desk')

    return {
      success: true,
      ticketId: finalTicketId,
      sla,
    }
  } catch (error: any) {
    console.error('Error saving ticket:', error)
    return { success: false, error: error.message }
  }
}