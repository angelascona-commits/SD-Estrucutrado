'use server'

import { revalidatePath } from 'next/cache'
import type {
  ActionResult,
  RegistroDetalleItem,
  RegistroFormData,
  ResumenDiarioGeneralItem,
  ResumenDiarioSolicitanteItem,
  ResumenDiarioTrabajadorItem,
  TareaFilters,
  TareaFormData,
  TareaListItem,
  TareoCatalogs
} from '../interfaces/tareo.interfaces'
import {
  createRegistro,
  createTarea,
  deleteRegistro,
  getAllTareas,
  getRegistroById,
  getRegistrosByFecha,
  getResumenDiarioGeneral,
  getResumenDiarioSolicitante,
  getResumenDiarioTrabajador,
  getTareoCatalogs,
  getTareaById,
  updateRegistro,
  updateTarea
} from '../repository/tareo.repository'
import {
  applyTareaFilters,
  normalizeRegistroPayload,
  normalizeTareaPayload,
  validateRegistroPayload,
  validateTareaPayload,
  validateTareaUpdatePayload
} from '../services/tareo.service'

export async function fetchTareoCatalogsAction(): Promise<ActionResult<TareoCatalogs>> {
  try {
    const data = await getTareoCatalogs()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudieron cargar los catálogos'
    }
  }
}

export async function listTareasAction(
  filters?: TareaFilters
): Promise<ActionResult<TareaListItem[]>> {
  try {
    const data = await getAllTareas()
    const filteredData = applyTareaFilters(data, filters)
    return { success: true, data: filteredData }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudieron cargar las tareas'
    }
  }
}

export async function getTareaByIdAction(
  id: number
): Promise<ActionResult<TareaListItem>> {
  try {
    const data = await getTareaById(id)

    if (!data) {
      return { success: false, error: 'Tarea no encontrada' }
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo cargar la tarea'
    }
  }
}

export async function saveTareaAction(
  payload: TareaFormData,
  isEditing = false
): Promise<ActionResult<{ tareaId: number }>> {
  try {
    const normalizedPayload = normalizeTareaPayload(payload)

    if (isEditing) {
      if (!payload.id) {
        return { success: false, error: 'El id de la tarea es obligatorio para editar' }
      }

      const currentTask = await getTareaById(payload.id)
      validateTareaUpdatePayload(normalizedPayload, currentTask)

      await updateTarea(payload.id, normalizedPayload)
      revalidatePath('/tareo')

      return {
        success: true,
        data: { tareaId: payload.id }
      }
    }

    validateTareaPayload(normalizedPayload)

    const tareaId = await createTarea(normalizedPayload)
    revalidatePath('/tareo')

    return {
      success: true,
      data: { tareaId }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar la tarea'
    }
  }
}

export async function listRegistrosByFechaAction(
  fecha: string
): Promise<ActionResult<RegistroDetalleItem[]>> {
  try {
    const data = await getRegistrosByFecha(fecha)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudieron cargar los registros'
    }
  }
}

export async function getRegistroByIdAction(
  id: number
): Promise<ActionResult<RegistroDetalleItem>> {
  try {
    const data = await getRegistroById(id)

    if (!data) {
      return { success: false, error: 'Registro no encontrado' }
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo cargar el registro'
    }
  }
}

export async function saveRegistroAction(
  payload: RegistroFormData,
  isEditing = false
): Promise<ActionResult<{ registroId: number }>> {
  try {
    const normalizedPayload = normalizeRegistroPayload(payload)
    validateRegistroPayload(normalizedPayload)

    if (isEditing) {
      if (!payload.id) {
        return { success: false, error: 'El id del registro es obligatorio para editar' }
      }

      await updateRegistro(payload.id, normalizedPayload)
      revalidatePath('/tareo')

      return {
        success: true,
        data: { registroId: payload.id }
      }
    }

    const registroId = await createRegistro(normalizedPayload)
    revalidatePath('/tareo')

    return {
      success: true,
      data: { registroId }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar el registro'
    }
  }
}

export async function deleteRegistroAction(
  id: number
): Promise<ActionResult<{ registroId: number }>> {
  try {
    await deleteRegistro(id)
    revalidatePath('/tareo')

    return {
      success: true,
      data: { registroId: id }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo eliminar el registro'
    }
  }
}

export async function getResumenDiarioGeneralAction(
  periodoId?: number
): Promise<ActionResult<ResumenDiarioGeneralItem[]>> {
  try {
    const data = await getResumenDiarioGeneral(periodoId)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo cargar el resumen general'
    }
  }
}

export async function getResumenDiarioTrabajadorAction(
  periodoId?: number
): Promise<ActionResult<ResumenDiarioTrabajadorItem[]>> {
  try {
    const data = await getResumenDiarioTrabajador(periodoId)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo cargar el resumen por trabajador'
    }
  }
}

export async function getResumenDiarioSolicitanteAction(
  periodoId?: number
): Promise<ActionResult<ResumenDiarioSolicitanteItem[]>> {
  try {
    const data = await getResumenDiarioSolicitante(periodoId)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo cargar el resumen por solicitante'
    }
  }
}