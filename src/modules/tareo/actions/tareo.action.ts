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
  TareaPeriodoListItem,
  TareoCatalogs
} from '../interfaces/tareo.interfaces'
import {
  createRegistro,
  createTarea,
  deleteRegistro,
  getAllTareasPeriodo,
  getRegistrosByPeriodo,
  getRegistroById,
  getRegistrosByFecha,
  getResumenDiarioGeneral,
  getResumenDiarioSolicitante,
  getResumenDiarioTrabajador,
  getTareoCatalogs,
  getTareaPeriodoById,
  updateRegistro,
  updateTareaPeriodo,
  getHorasTrabajadorByFecha,
  getTareaPeriodoValidacion,
  closePeriodoAndCarryOverTasks,
} from '../repository/tareo.repository'
import {
  applyTareaFilters,
  normalizeRegistroPayload,
  normalizeTareaPayload,
  validateRegistroPayload,
  validateTareaPayload,
  validateTareaUpdatePayload,
  generateTareoExcel
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
): Promise<ActionResult<TareaPeriodoListItem[]>> {
  try {
    const data = await getAllTareasPeriodo()
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
): Promise<ActionResult<TareaPeriodoListItem>> {
  try {
    const data = await getTareaPeriodoById(id)

    if (!data) {
      return { success: false, error: 'Tarea del período no encontrada' }
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo cargar la tarea del período'
    }
  }
}

export async function saveTareaAction(
  payload: TareaFormData,
  isEditing = false
): Promise<ActionResult<{ tareaPeriodoId: number }>> {
  try {
    const normalizedPayload = normalizeTareaPayload(payload)

    if (isEditing) {
      if (!payload.id) {
        return {
          success: false,
          error: 'El id de la tarea del período es obligatorio para editar'
        }
      }

      const currentTask = await getTareaPeriodoById(payload.id)
      validateTareaUpdatePayload(normalizedPayload, currentTask)

      await updateTareaPeriodo(payload.id, normalizedPayload)
      revalidatePath('/tareo')

      return {
        success: true,
        data: { tareaPeriodoId: payload.id }
      }
    }

    validateTareaPayload(normalizedPayload)

    const tareaPeriodoId = await createTarea(normalizedPayload)
    revalidatePath('/tareo')

    return {
      success: true,
      data: { tareaPeriodoId }
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
export async function validateRegistroRealtimeAction(
  payload: RegistroFormData
): Promise<ActionResult<import('../interfaces/tareo.interfaces').RegistroRealtimeValidationResult>> {
  try {
    const horasIngresadas = Number(payload.horas || 0)

    if (!payload.fecha || !payload.trabajador_id || !payload.tarea_periodo_id || horasIngresadas <= 0) {
      return {
        success: true,
        data: {
          horas_trabajador_dia: 0,
          horas_ingresadas: horasIngresadas,
          total_horas_resultante: horasIngresadas,
          horas_disponibles_periodo: 0,
          excede_maximo_dia: false,
          excede_horas_disponibles: false,
          periodo_cerrado: false,
          can_save: false,
          messages: []
        }
      }
    }

    const [horasTrabajadorDia, tareaPeriodoInfo] = await Promise.all([
      getHorasTrabajadorByFecha(payload.trabajador_id, payload.fecha, payload.id),
      getTareaPeriodoValidacion(payload.tarea_periodo_id)
    ])

    if (!tareaPeriodoInfo) {
      return {
        success: false,
        error: 'No se encontró la tarea del período'
      }
    }

    const totalHorasResultante = horasTrabajadorDia + horasIngresadas
    const excedeMaximoDia = totalHorasResultante > 12
    const excedeHorasDisponibles = horasIngresadas > tareaPeriodoInfo.horas_disponibles_periodo
    const periodoCerrado = tareaPeriodoInfo.periodo_cerrado

    const messages: string[] = []

    if (excedeMaximoDia) {
      messages.push('El trabajador supera el máximo de 12 horas para el día seleccionado.')
    }

    if (excedeHorasDisponibles) {
      messages.push('Las horas ingresadas superan las horas disponibles del período.')
    }

    if (periodoCerrado) {
      messages.push('El período está cerrado y no admite nuevos registros.')
    }

    return {
      success: true,
      data: {
        horas_trabajador_dia: horasTrabajadorDia,
        horas_ingresadas: horasIngresadas,
        total_horas_resultante: totalHorasResultante,
        horas_disponibles_periodo: tareaPeriodoInfo.horas_disponibles_periodo,
        excede_maximo_dia: excedeMaximoDia,
        excede_horas_disponibles: excedeHorasDisponibles,
        periodo_cerrado: periodoCerrado,
        can_save: !excedeMaximoDia && !excedeHorasDisponibles && !periodoCerrado,
        messages
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo validar el registro'
    }
  }
  
}
export async function closePeriodoAndCarryOverTasksAction(
  periodoActualId: number,
  periodoSiguienteId: number
): Promise<ActionResult<{ periodoActualId: number; periodoSiguienteId: number }>> {
  try {
    await closePeriodoAndCarryOverTasks(periodoActualId, periodoSiguienteId)
    revalidatePath('/tareo')

    return {
      success: true,
      data: {
        periodoActualId,
        periodoSiguienteId
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo cerrar el período'
    }
  }
}
export async function exportTareoAction(
  periodoId: number
): Promise<ActionResult<{ base64: string; fileName: string }>> {
  try {
    // 1. Obtener todos los registros diarios de ese período específico
    const registros = await getRegistrosByPeriodo(periodoId)

    if (registros.length === 0) {
      return { success: false, error: 'No hay horas registradas para el período seleccionado.' }
    }

    // 2. Extraer el año y mes para el nombre del archivo
    const first = registros[0]
    const periodoLabel = `${first.anio}-${String(first.mes).padStart(2, '0')}`

    // 3. Generar el Excel
    const workbook = await generateTareoExcel(registros, periodoLabel)
    const buffer = await workbook.xlsx.writeBuffer()
    
    return {
      success: true,
      data: {
        base64: Buffer.from(buffer).toString('base64'),
        fileName: `REPORTE_TAREO_${periodoLabel}.xlsx`
      }
    }
  } catch (error) {
    return { success: false, error: 'Error al generar el archivo Excel.' }
  }
}