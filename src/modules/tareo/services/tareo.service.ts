import ExcelJS from 'exceljs'
import type {
  RegistroFormData,
  TareaFilters,
  TareaFormData,
  TareaPeriodoListItem,
  RegistroDetalleItem
} from '../interfaces/tareo.interfaces'

export function validateTareaPayload(payload: TareaFormData): void {
  if (!payload.periodo_id) {
    throw new Error('El período es obligatorio')
  }

  if (!payload.nombre?.trim()) {
    throw new Error('El nombre de la tarea es obligatorio')
  }

  if (!payload.proyecto_id) {
    throw new Error('El proyecto es obligatorio')
  }

  if (!payload.solicitante_id) {
    throw new Error('El solicitante es obligatorio')
  }

  if (!payload.estado_id) {
    throw new Error('El estado es obligatorio')
  }

  if (Number(payload.horas_historicas_arrastre) < 0) {
    throw new Error('Las horas históricas no pueden ser menores a 0')
  }

  if (Number(payload.horas_asignadas_periodo) < 0) {
    throw new Error('Las horas asignadas del período no pueden ser menores a 0')
  }
}

export function validateTareaUpdatePayload(
  payload: TareaFormData,
  currentTask: TareaPeriodoListItem | null
): void {
  validateTareaPayload(payload)

  if (!currentTask) {
    throw new Error('No se encontró la tarea del período a editar')
  }

  if (Number(payload.horas_asignadas_periodo) < Number(currentTask.horas_consumidas_periodo)) {
    throw new Error('Las horas asignadas del período no pueden ser menores a las horas consumidas')
  }
}

export function normalizeTareaPayload(payload: TareaFormData): TareaFormData {
  return {
    ...payload,
    nombre: payload.nombre.trim(),
    periodo_id: Number(payload.periodo_id),
    proyecto_id: Number(payload.proyecto_id),
    solicitante_id: Number(payload.solicitante_id),
    estado_id: Number(payload.estado_id),
    team_id: payload.team_id ? Number(payload.team_id) : null,
    horas_historicas_arrastre: Number(payload.horas_historicas_arrastre || 0),
    horas_asignadas_periodo: Number(payload.horas_asignadas_periodo || 0),
    comentario_periodo: payload.comentario_periodo?.trim() || null,
    comentario_dm: payload.comentario_dm?.trim() || null,
    activo: payload.activo ?? true
  }
}

export function validateRegistroPayload(payload: RegistroFormData): void {
  if (!payload.tarea_periodo_id) {
    throw new Error('La tarea del período es obligatoria')
  }

  if (!payload.fecha) {
    throw new Error('La fecha es obligatoria')
  }

  if (!payload.trabajador_id) {
    throw new Error('El trabajador es obligatorio')
  }

  if (Number(payload.horas) <= 0) {
    throw new Error('Las horas deben ser mayores a 0')
  }

  if (Number(payload.horas) > 12) {
    throw new Error('Las horas no pueden superar 12 en un solo registro')
  }
}

export function normalizeRegistroPayload(payload: RegistroFormData): RegistroFormData {
  return {
    ...payload,
    tarea_periodo_id: Number(payload.tarea_periodo_id),
    trabajador_id: Number(payload.trabajador_id),
    horas: Number(payload.horas),
    comentario: payload.comentario?.trim() || null
  }
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function applyTareaFilters(
  items: TareaPeriodoListItem[],
  filters?: TareaFilters
): TareaPeriodoListItem[] {
  if (!filters) {
    return items
  }

  const search = filters.search ? normalizeText(filters.search) : ''

  return items.filter((item) => {
    if (filters.periodo_id && item.periodo_id !== Number(filters.periodo_id)) {
      return false
    }

    if (filters.agrupador_id && item.agrupador_id !== Number(filters.agrupador_id)) {
      return false
    }

    if (filters.proyecto_id && item.proyecto_id !== Number(filters.proyecto_id)) {
      return false
    }

    if (filters.solicitante_id && item.solicitante_id !== Number(filters.solicitante_id)) {
      return false
    }

    if (filters.estado_id && item.estado_id !== Number(filters.estado_id)) {
      return false
    }

    if (filters.team_id && item.team_id !== Number(filters.team_id)) {
      return false
    }

    if (typeof filters.activo === 'boolean' && item.activo !== filters.activo) {
      return false
    }

    if (!search) {
      return true
    }

    const searchableValues = [
      item.tarea_nombre,
      item.proyecto_nombre,
      item.agrupador_nombre,
      item.solicitante_nombre,
      item.team_nombre ?? '',
      item.estado_nombre,
      item.comentario_periodo ?? '',
      String(item.periodo_anio),
      String(item.periodo_mes),
      String(item.horas_historicas_arrastre),
      String(item.horas_asignadas_periodo),
      String(item.horas_consumidas_periodo),
      String(item.horas_disponibles_periodo),
      String(item.horas_totales_acumuladas),
      item.activo ? 'activo' : 'inactivo',
      item.periodo_cerrado ? 'cerrado' : 'abierto'
    ]

    return searchableValues.some((value) => normalizeText(value).includes(search))
  })
}
function sortRegistros(registros: RegistroDetalleItem[]): RegistroDetalleItem[] {
  return [...registros].sort((a, b) => {
    const res = a.solicitante_nombre.localeCompare(b.solicitante_nombre)
    if (res !== 0) return res
    return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  })
}
function sortTareoData(items: TareaPeriodoListItem[]): TareaPeriodoListItem[] {
  return [...items].sort((a, b) => {
    const sortSolicitante = a.solicitante_nombre.localeCompare(b.solicitante_nombre)
    if (sortSolicitante !== 0) return sortSolicitante

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

// Función auxiliar para crear las hojas de detalle
function createDetailSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  registros: RegistroDetalleItem[],
  periodoLabel: string
) {
  const sheet = workbook.addWorksheet(name)

  // Las columnas exactas de tu imagen
  sheet.columns = [
    { header: 'Task Name', key: 'nombre', width: 45 },
    { header: 'Week (drop down)', key: 'periodo', width: 25 },
    { header: 'Assignee', key: 'assignee', width: 20 },
    { header: 'Team (labels)', key: 'team', width: 20 },
    { header: 'Solicitante (drop down)', key: 'solicitante', width: 25 },
    { header: 'Pry - Protecta (drop down)', key: 'proyecto', width: 35 },
    { header: 'Agrupador', key: 'agrupador', width: 25 },
    { header: 'Horas Estimadas', key: 'horas', width: 18 },
    { header: 'Estado', key: 'estado', width: 15 },
    { header: 'Comentario PS', key: 'comentario_ps', width: 40 },
    { header: 'Comentario DM', key: 'comentario_dm', width: 40 }
  ]

  // Título
  sheet.insertRow(1, [`REPORTE DE TAREO - PERÍODO: ${periodoLabel}`])
  sheet.mergeCells('A1:K1')
  sheet.getRow(1).font = { size: 14, bold: true }
  sheet.getRow(1).alignment = { horizontal: 'center' }

  // Estilos del encabezado
  const headerRow = sheet.getRow(2)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }
    cell.alignment = { horizontal: 'center' }
  })
  function formatWeekDate(fechaStr: string): string {
    const [yyyy, mm, dd] = fechaStr.split('-')
    const meses = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ]
    const mesNombre = meses[parseInt(mm, 10) - 1]
    const shortYear = yyyy.substring(2)
    return `${mesNombre} ${yyyy} (${dd}/${mm}/${shortYear})`
  }
  // Insertar cada registro diario como una fila independiente
  registros.forEach((reg) => {
    sheet.addRow({
      nombre: reg.tarea_nombre,
      periodo: formatWeekDate(reg.fecha),
      assignee: reg.trabajador_nombre,
      team: reg.team_nombre ?? '',
      solicitante: reg.solicitante_nombre,
      proyecto: reg.proyecto_nombre,
      agrupador: reg.agrupador_nombre,
      horas: Number(reg.horas), // Las horas específicas de ese día
      estado: reg.estado_tarea,
      comentario_ps: reg.comentario ?? '', // El comentario específico que puso el trabajador ese día
      comentario_dm: '' // Columna vacía para que el cliente la llene
    })
  })
}

// Función principal de generación
export async function generateTareoExcel(
  registros: RegistroDetalleItem[],
  periodoLabel: string
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()

  // Ordenar los registros antes de separarlos
  const sortedRegistros = sortRegistros(registros)

  // Separar en Ágil y Proyectos
  const agilData = sortedRegistros.filter((item) => {
    const agg = item.agrupador_nombre.toLowerCase()
    return agg.includes('squad') || agg.includes('mantenimiento') || agg.includes('agil')
  })

  const proyectosData = sortedRegistros.filter((item) => !agilData.includes(item))

  createDetailSheet(workbook, 'Agil', agilData, periodoLabel)
  createDetailSheet(workbook, 'Proyectos', proyectosData, periodoLabel)

  return workbook
}