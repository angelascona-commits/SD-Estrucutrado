'use server'

import {
  getArchivedTickets,
  getDashboardTickets,
  getFeriados,
} from '@/modules/service-desk/repository/ticket.repository'
import {
  TicketTableRow,
  PaginatedTickets,
  TicketFilters,
  UrgentTicket,
  DelayedTicketModalRow,
  RawDashboardTicket,
} from '@/modules/service-desk/interfaces/ticket.interfaces'
import {
  calculateBusinessHours,
  calculateBusinessDays,
} from '@/modules/shared/utils/calculateBusinessHours'

function mapTicketsToTableRows(
  rawTickets: RawDashboardTicket[],
  feriados: Awaited<ReturnType<typeof getFeriados>>
): TicketTableRow[] {
  const mappedData: TicketTableRow[] = rawTickets.map((t) => {
    const tAsignacionHoras = calculateBusinessHours(
      t.fecha_creacion_sd,
      t.fecha_asignacion,
      feriados
    )
    const tAsignacionExcede = tAsignacionHoras !== null && tAsignacionHoras > 8

    const tiempoLimiteHoras = calculateBusinessHours(
      t.fecha_asignacion,
      t.fecha_maxima_atencion,
      feriados
    )
    const tiempoLimiteCumple = tiempoLimiteHoras !== null && tiempoLimiteHoras >= 16

    const resolucionDias = calculateBusinessDays(
      t.fecha_atencion,
      t.fecha_maxima_atencion,
      feriados
    )

    return {
      id: t.id,
      numero_ticket: t.numero_ticket,
      fecha_asignacion: t.fecha_asignacion
        ? new Date(t.fecha_asignacion).toLocaleString('es-PE', { timeZone: 'UTC' })
        : '-',
      fecha_creacion_sd: t.fecha_creacion_sd
        ? new Date(t.fecha_creacion_sd).toLocaleString('es-PE', { timeZone: 'UTC' })
        : '-',
      estado: t.estado_nombre,
      descripcion: t.descripcion,
      aplicacion: t.aplicacion_nombre || 'N/A',
      designado_a: t.responsable_nombre || 'Sin Asignar',

      tAreaAsignacionHoras: tAsignacionHoras,
      tAreaAsignacionLabel:
        tAsignacionHoras !== null ? `${+(tAsignacionHoras / 8).toFixed(2)} días` : '-',
      tAreaAsignacionExcede: tAsignacionExcede,

      tiempoLimiteHoras: tiempoLimiteHoras,
      tiempoLimiteLabel:
        tiempoLimiteHoras !== null ? `${+(tiempoLimiteHoras / 8).toFixed(2)} días` : '-',
      tiempoLimiteCumple: tiempoLimiteCumple,

      resolucionDias: resolucionDias,
      resolucionLabel: resolucionDias !== null ? `${resolucionDias} días` : '-',

      _rawAsignacionDate: t.fecha_asignacion,
    } as any
  })

  mappedData.sort((a: any, b: any) => {
    if (!a._rawAsignacionDate) return 1
    if (!b._rawAsignacionDate) return -1
    return new Date(b._rawAsignacionDate).getTime() - new Date(a._rawAsignacionDate).getTime()
  })

  return mappedData
}

function buildTicketCatalogs(rawTickets: RawDashboardTicket[]) {
  const estadosSet = new Set<string>()
  const aplicacionesSet = new Set<string>()
  const responsablesSet = new Set<string>()

  rawTickets.forEach((t) => {
    if (t.estado_nombre) estadosSet.add(t.estado_nombre)
    if (t.aplicacion_nombre) aplicacionesSet.add(t.aplicacion_nombre)
    if (t.responsable_nombre) responsablesSet.add(t.responsable_nombre)
  })

  return {
    estados: Array.from(estadosSet).sort(),
    aplicaciones: Array.from(aplicacionesSet).sort(),
    responsables: Array.from(responsablesSet).sort(),
  }
}

function applyTicketFilters(
  mappedData: TicketTableRow[],
  filters?: TicketFilters
): TicketTableRow[] {
  let filteredData = mappedData

  if (!filters) return filteredData

  if (filters.q) {
    const qLower = filters.q.toLowerCase()
    filteredData = filteredData.filter(
      (t) =>
        t.numero_ticket?.toString().includes(qLower) ||
        t.descripcion?.toLowerCase().includes(qLower)
    )
  }

  if (filters.estado) {
    filteredData = filteredData.filter((t) => t.estado === filters.estado)
  }

  if (filters.aplicacion) {
    if (filters.aplicacion === 'N/A') {
      filteredData = filteredData.filter((t) => t.aplicacion === 'N/A')
    } else {
      filteredData = filteredData.filter((t) => t.aplicacion === filters.aplicacion)
    }
  }

  if (filters.designado) {
    if (filters.designado === 'Sin Asignar') {
      filteredData = filteredData.filter((t) => t.designado_a === 'Sin Asignar')
    } else {
      filteredData = filteredData.filter((t) => t.designado_a === filters.designado)
    }
  }

  if (filters.fechaAsignacionStart || filters.fechaAsignacionEnd) {
    filteredData = filteredData.filter((t) => {
      const rawDate = (t as any)._rawAsignacionDate
      if (!rawDate) return false

      const d = new Date(rawDate).getTime()
      let valid = true

      if (filters.fechaAsignacionStart) {
        const start = new Date(filters.fechaAsignacionStart).getTime()
        if (d < start) valid = false
      }

      if (filters.fechaAsignacionEnd) {
        const end = new Date(filters.fechaAsignacionEnd).getTime() + 86399999
        if (d > end) valid = false
      }

      return valid
    })
  }

  if (filters.tAsignacionMin !== undefined) {
    filteredData = filteredData.filter(
      (t) => t.tAreaAsignacionHoras !== null && t.tAreaAsignacionHoras / 8 >= filters.tAsignacionMin!
    )
  }

  if (filters.tAsignacionMax !== undefined) {
    filteredData = filteredData.filter(
      (t) => t.tAreaAsignacionHoras !== null && t.tAreaAsignacionHoras / 8 <= filters.tAsignacionMax!
    )
  }

  if (filters.tLimiteMin !== undefined) {
    filteredData = filteredData.filter(
      (t) => t.tiempoLimiteHoras !== null && t.tiempoLimiteHoras / 8 >= filters.tLimiteMin!
    )
  }

  if (filters.tLimiteMax !== undefined) {
    filteredData = filteredData.filter(
      (t) => t.tiempoLimiteHoras !== null && t.tiempoLimiteHoras / 8 <= filters.tLimiteMax!
    )
  }

  if (filters.resolucionMin !== undefined) {
    filteredData = filteredData.filter(
      (t) => t.resolucionDias !== null && t.resolucionDias >= filters.resolucionMin!
    )
  }

  if (filters.resolucionMax !== undefined) {
    filteredData = filteredData.filter(
      (t) => t.resolucionDias !== null && t.resolucionDias <= filters.resolucionMax!
    )
  }

  return filteredData
}

function paginateTickets(
  filteredData: TicketTableRow[],
  page: number,
  limit: number
): TicketTableRow[] {
  const startIndex = (page - 1) * limit
  return filteredData.slice(startIndex, startIndex + limit)
}

function cleanTemporaryFields(data: TicketTableRow[]): TicketTableRow[] {
  return data.map((d) => {
    const { _rawAsignacionDate, ...rest } = d as any
    return rest as TicketTableRow
  })
}

async function buildPaginatedTickets(
  rawTickets: RawDashboardTicket[],
  page: number,
  limit: number,
  filters?: TicketFilters
): Promise<PaginatedTickets> {
  const feriados = await getFeriados()

  const mappedData = mapTicketsToTableRows(rawTickets, feriados)
  const catalogs = buildTicketCatalogs(rawTickets)
  const filteredData = applyTicketFilters(mappedData, filters)
  const allTickets = cleanTemporaryFields(filteredData)

  const totalCount = allTickets.length
  const totalPages = Math.ceil(totalCount / limit) || 1
  const data = paginateTickets(allTickets, page, limit)

  return {
    data,
    totalCount,
    totalPages,
    currentPage: page,
    catalogs,
  }
}

export async function fetchDashboardTicketsList(
  page: number = 1,
  limit: number = 50,
  filters?: TicketFilters
): Promise<PaginatedTickets> {
  const rawTickets = await getDashboardTickets()
  return buildPaginatedTickets(rawTickets, page, limit, filters)
}

export async function fetchArchivedTicketsList(
  page: number = 1,
  limit: number = 50,
  filters?: TicketFilters
): Promise<PaginatedTickets> {
  const rawTickets = await getArchivedTickets()
  return buildPaginatedTickets(rawTickets, page, limit, filters)
}

export async function fetchUrgentTickets(): Promise<UrgentTicket[]> {
  const [rawTickets, feriados] = await Promise.all([
    getDashboardTickets(),
    getFeriados(),
  ])

  const now = new Date().toISOString()

  const activeTickets = rawTickets.filter((t) => !t.fecha_atencion && t.fecha_maxima_atencion)
  const urgentTickets: UrgentTicket[] = []

  for (const t of activeTickets) {
    if (new Date(now).getTime() > new Date(t.fecha_maxima_atencion!).getTime()) {
      const retrasoDias = calculateBusinessDays(t.fecha_maxima_atencion, now, feriados)

      if (retrasoDias && retrasoDias > 0) {
        urgentTickets.push({
          id: t.id,
          numero_ticket: t.numero_ticket,
          descripcion: t.descripcion || 'Sin descripción',
          designado_a: t.responsable_nombre || 'Sin asignar',
          retrasoDias: retrasoDias,
        })
      }
    }
  }

  return urgentTickets.sort((a, b) => b.retrasoDias - a.retrasoDias).slice(0, 3)
}

export async function fetchAllUrgentTickets(): Promise<DelayedTicketModalRow[]> {
  const [rawTickets, feriados] = await Promise.all([
    getDashboardTickets(),
    getFeriados(),
  ])

  const now = new Date().toISOString()

  const delayedTickets: DelayedTicketModalRow[] = rawTickets
    .filter((t) => !t.fecha_atencion && t.fecha_maxima_atencion)
    .filter((t) => new Date(now).getTime() > new Date(t.fecha_maxima_atencion!).getTime())
    .map((t) => {
      const retrasoDias = calculateBusinessDays(t.fecha_maxima_atencion, now, feriados)

      return {
        id: t.id,
        numero_ticket: t.numero_ticket,
        descripcion: t.descripcion || 'Sin descripción',
        designado_a: t.responsable_nombre || 'Sin asignar',
        retrasoDias: retrasoDias || 0,
        fecha_maxima_atencion: t.fecha_maxima_atencion,
      }
    })
    .filter((t) => t.retrasoDias > 0)
    .sort((a, b) => {
      if (!a.fecha_maxima_atencion) return 1
      if (!b.fecha_maxima_atencion) return -1
      return new Date(b.fecha_maxima_atencion).getTime() - new Date(a.fecha_maxima_atencion).getTime()
    })

  return delayedTickets
}