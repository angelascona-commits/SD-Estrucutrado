'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/modules/shared/utils/session'
import type {
  ActionResult,
  Solicitud,
  SGPRCCatalogs,
  SolicitudFormData,
  EvaluacionFormData,
  AuditoriaLog
} from '../interfaces/sgprc.interfaces'
import {
  getSGPRCCatalogs,
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  updateSolicitud,
  saveEvaluacion,
  updateSolicitudEstado,
  getAuditLogs,
  upsertSGPRCCatalogItem,
  deleteSGPRCCatalogItem
} from '../repository/sgprc.repository'
import {
  validateSolicitudPayload,
  generateApprovalToken,
  processEmailAction,
  generateHtmlOutboundEmail
} from '../services/sgprc.service'

export async function fetchSGPRCCatalogsAction(): Promise<ActionResult<SGPRCCatalogs>> {
  try {
    const data = await getSGPRCCatalogs()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudieron cargar los catálogos de SGPRC'
    }
  }
}

export async function listSolicitudesAction(): Promise<ActionResult<Solicitud[]>> {
  try {
    const data = await getSolicitudes()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudieron listar las solicitudes Cloud'
    }
  }
}

export async function getSolicitudByIdAction(id: number): Promise<ActionResult<Solicitud>> {
  try {
    const data = await getSolicitudById(id)
    if (!data) {
      return { success: false, error: 'Solicitud Cloud no encontrada.' }
    }
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo cargar el detalle de la solicitud'
    }
  }
}

export async function saveSolicitudAction(
  payload: SolicitudFormData,
  isEditing = false
): Promise<ActionResult<{ solicitudId: number }>> {
  try {
    const session = await getSession()
    if (!session) {
      return { success: false, error: 'Sesión inválida. Debe autenticarse para realizar esta acción.' }
    }

    validateSolicitudPayload(payload)

    if (isEditing) {
      if (!payload.id) {
        return { success: false, error: 'El ID de la solicitud es obligatorio para editar.' }
      }
      await updateSolicitud(payload.id, payload, session.userId)
      revalidatePath('/sgprc')
      return { success: true, data: { solicitudId: payload.id } }
    }

    const newId = await createSolicitud(payload, session.userId)
    revalidatePath('/sgprc')
    return { success: true, data: { solicitudId: newId } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar la solicitud Cloud'
    }
  }
}

export async function saveEvaluacionAction(
  payload: EvaluacionFormData
): Promise<ActionResult<void>> {
  try {
    const session = await getSession()
    if (!session) {
      return { success: false, error: 'Sesión inválida.' }
    }

    await saveEvaluacion(payload, session.userId)
    revalidatePath('/sgprc')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar la evaluación técnica.'
    }
  }
}

export async function updateSolicitudEstadoAction(
  id: number,
  estado: Solicitud['estado'],
  comentario?: string
): Promise<ActionResult<void>> {
  try {
    const session = await getSession()
    if (!session) {
      return { success: false, error: 'Sesión inválida.' }
    }

    await updateSolicitudEstado(id, estado, session.userId, comentario)
    revalidatePath('/sgprc')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo actualizar el estado de la solicitud.'
    }
  }
}

export async function fetchAuditLogsAction(solicitudId: number): Promise<ActionResult<AuditoriaLog[]>> {
  try {
    const data = await getAuditLogs(solicitudId)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudieron cargar los logs de auditoría.'
    }
  }
}

export async function simulateOutboundEmailAction(
  solicitudId: number,
  targetUserId: number
): Promise<ActionResult<{ html: string; toName: string; toEmail: string }>> {
  try {
    const [solicitud, catalogs] = await Promise.all([
      getSolicitudById(solicitudId),
      getSGPRCCatalogs()
    ])

    if (!solicitud) return { success: false, error: 'Solicitud no encontrada.' }

    const targetUser = catalogs.usuarios.find((u) => u.id === targetUserId)
    if (!targetUser) return { success: false, error: 'Usuario evaluador/aprobador no encontrado.' }

    // Generar tokens para Aprobar y Rechazar
    const tokenAprobar = await generateApprovalToken(solicitudId, targetUserId, 'Aprobar')
    const tokenRechazar = await generateApprovalToken(solicitudId, targetUserId, 'Rechazar')

    const html = generateHtmlOutboundEmail(solicitud, targetUser, tokenAprobar, tokenRechazar)

    return {
      success: true,
      data: {
        html,
        toName: targetUser.nombre,
        toEmail: targetUser.email
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo simular el envío del correo electrónico.'
    }
  }
}

export async function submitDecisionAction(
  tokenString: string,
  comentariosRechazo?: string
): Promise<ActionResult<{ message: string }>> {
  try {
    const result = await processEmailAction(tokenString, comentariosRechazo)
    if (!result.success) {
      return { success: false, error: result.message }
    }
    revalidatePath('/sgprc')
    return { success: true, data: { message: result.message } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al procesar la decisión.'
    }
  }
}

export async function saveSGPRCCatalogItemAction(tableName: string, payload: any): Promise<ActionResult<{ id: number }>> {
  try {
    const id = await upsertSGPRCCatalogItem(tableName, payload)
    revalidatePath('/sgprc')
    return { success: true, data: { id } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar el catálogo'
    }
  }
}

export async function deleteSGPRCCatalogItemAction(tableName: string, id: number): Promise<ActionResult<void>> {
  try {
    await deleteSGPRCCatalogItem(tableName, id)
    revalidatePath('/sgprc')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo eliminar el catálogo'
    }
  }
}
