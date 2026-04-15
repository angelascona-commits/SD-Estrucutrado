import type {
  RegistroFormData,
  TareaFilters,
  TareaFormData,
  TareaPeriodoListItem
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
    horas_historicas_arrastre: Number(payload.horas_historicas_arrastre),
    horas_asignadas_periodo: Number(payload.horas_asignadas_periodo),
    comentario_periodo: payload.comentario_periodo?.trim() || null,
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