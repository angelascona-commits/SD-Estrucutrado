import type {
  RegistroFormData,
  TareaFilters,
  TareaFormData,
  TareaListItem
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

  if (Number(payload.horas_totales) <= 0) {
    throw new Error('Las horas totales deben ser mayores a 0')
  }
}

export function validateTareaUpdatePayload(
  payload: TareaFormData,
  currentTask: TareaListItem | null
): void {
  validateTareaPayload(payload)

  if (!currentTask) {
    throw new Error('No se encontró la tarea a editar')
  }

  if (Number(payload.horas_totales) < Number(currentTask.horas_consumidas)) {
    throw new Error('Las horas totales no pueden ser menores a las horas consumidas')
  }
}

export function normalizeTareaPayload(payload: TareaFormData): TareaFormData {
  return {
    ...payload,
    nombre: payload.nombre.trim(),
    proyecto_id: Number(payload.proyecto_id),
    periodo_id: Number(payload.periodo_id),
    solicitante_id: Number(payload.solicitante_id),
    estado_id: Number(payload.estado_id),
    team_id: payload.team_id ? Number(payload.team_id) : null,
    horas_totales: Number(payload.horas_totales),
    comentario_ps: payload.comentario_ps?.trim() || null,
    activo: payload.activo ?? true
  }
}

export function validateRegistroPayload(payload: RegistroFormData): void {
  if (!payload.tarea_id) {
    throw new Error('La tarea es obligatoria')
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
    tarea_id: Number(payload.tarea_id),
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
  items: TareaListItem[],
  filters?: TareaFilters
): TareaListItem[] {
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
      item.nombre,
      item.proyecto_nombre,
      item.agrupador_nombre,
      item.solicitante_nombre,
      item.team_nombre ?? '',
      item.estado_nombre,
      item.comentario_ps ?? '',
      item.periodo_anio ? String(item.periodo_anio) : '',
      item.periodo_mes ? String(item.periodo_mes) : '',
      String(item.horas_totales),
      String(item.horas_consumidas),
      String(item.horas_disponibles),
      item.activo ? 'activo' : 'inactivo',
      item.periodo_cerrado ? 'cerrado' : 'abierto'
    ]

    return searchableValues.some((value) => normalizeText(value).includes(search))
  })
}