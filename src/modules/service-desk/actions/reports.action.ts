'use server'

import {
  getDashboardTickets,
  getFeriados,
} from '@/modules/service-desk/repository/ticket.repository'
import type {
  PaginatedTickets,
  RawDashboardTicket,
  TicketTableRow,
} from '@/modules/service-desk/interfaces/ticket.interfaces'
import type {
  ReportBreakdownPoint,
  ReportGroupBy,
  ReportPreset,
  ReportSummary,
  ReportTrendPoint,
  ServiceDeskReportData,
  ServiceDeskReportFilters,
} from '@/modules/service-desk/interfaces/report.interfaces'
import {
  calculateBusinessDays,
  calculateBusinessHours,
} from '@/modules/shared/utils/calculateBusinessHours'

type InternalRow = TicketTableRow & {
  _rawAsignacionDate: string | null
  _rawBaseDate: string | null
}

function average(values: number[]) {
  if (values.length === 0) return null
  return Number((values.reduce((acc, curr) => acc + curr, 0) / values.length).toFixed(2))
}

function percentage(part: number, total: number) {
  if (!total) return 0
  return Number(((part / total) * 100).toFixed(1))
}

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekRange(date: Date) {
  const current = new Date(date)
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const start = new Date(current)
  start.setDate(current.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function resolvePreset(preset: ReportPreset) {
  const now = new Date()

  if (preset === 'this_week') {
    const { start, end } = getWeekRange(now)
    return { start: toDateString(start), end: toDateString(end) }
  }

  if (preset === 'last_week') {
    const reference = new Date(now)
    reference.setDate(reference.getDate() - 7)
    const { start, end } = getWeekRange(reference)
    return { start: toDateString(start), end: toDateString(end) }
  }

  if (preset === 'this_month') {
    const { start, end } = getMonthRange(now)
    return { start: toDateString(start), end: toDateString(end) }
  }

  if (preset === 'last_month') {
    const reference = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const { start, end } = getMonthRange(reference)
    return { start: toDateString(start), end: toDateString(end) }
  }

  return { start: null, end: null }
}

function getIsoWeekInfo(date: Date) {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)

  return {
    key: `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
    label: `Semana ${weekNo} - ${tmp.getUTCFullYear()}`,
  }
}

function getGroupInfo(date: Date, groupBy: ReportGroupBy) {
  if (groupBy === 'day') {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')

    return {
      key: `${year}-${month}-${day}`,
      label: `${day}/${month}/${year}`,
    }
  }

  if (groupBy === 'month') {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')

    return {
      key: `${year}-${month}`,
      label: `${month}/${year}`,
    }
  }

  return getIsoWeekInfo(date)
}

function buildCatalogs(rawTickets: RawDashboardTicket[]) {
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

function buildInternalRows(
  rawTickets: RawDashboardTicket[],
  feriados: Awaited<ReturnType<typeof getFeriados>>
): InternalRow[] {
  const rows = rawTickets.map((t) => {
    const tAsignacionHoras = calculateBusinessHours(t.fecha_creacion_sd, t.fecha_asignacion, feriados)
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
      tiempoLimiteHoras,
      tiempoLimiteLabel:
        tiempoLimiteHoras !== null ? `${+(tiempoLimiteHoras / 8).toFixed(2)} días` : '-',
      tiempoLimiteCumple,
      resolucionDias,
      resolucionLabel: resolucionDias !== null ? `${resolucionDias} días` : '-',
      _rawAsignacionDate: t.fecha_asignacion,
      _rawBaseDate: t.fecha_asignacion || t.fecha_creacion_sd,
    }
  })

  rows.sort((a, b) => {
    if (!a._rawAsignacionDate) return 1
    if (!b._rawAsignacionDate) return -1
    return new Date(b._rawAsignacionDate).getTime() - new Date(a._rawAsignacionDate).getTime()
  })

  return rows
}

function applyReportFilters(
  rows: InternalRow[],
  filters: ServiceDeskReportFilters
): InternalRow[] {
  let filtered = rows

  if (filters.q) {
    const qLower = filters.q.toLowerCase()
    filtered = filtered.filter(
      (t) =>
        t.numero_ticket.toString().includes(qLower) ||
        t.descripcion.toLowerCase().includes(qLower)
    )
  }

  if (filters.estado) {
    filtered = filtered.filter((t) => t.estado === filters.estado)
  }

  if (filters.aplicacion) {
    if (filters.aplicacion === 'N/A') {
      filtered = filtered.filter((t) => t.aplicacion === 'N/A')
    } else {
      filtered = filtered.filter((t) => t.aplicacion === filters.aplicacion)
    }
  }

  if (filters.designado) {
    if (filters.designado === 'Sin Asignar') {
      filtered = filtered.filter((t) => t.designado_a === 'Sin Asignar')
    } else {
      filtered = filtered.filter((t) => t.designado_a === filters.designado)
    }
  }

  if (filters.fechaAsignacionStart || filters.fechaAsignacionEnd) {
    filtered = filtered.filter((t) => {
      if (!t._rawAsignacionDate) return false
      const d = new Date(t._rawAsignacionDate).getTime()

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
    filtered = filtered.filter(
      (t) => t.tAreaAsignacionHoras !== null && t.tAreaAsignacionHoras / 8 >= filters.tAsignacionMin!
    )
  }

  if (filters.tAsignacionMax !== undefined) {
    filtered = filtered.filter(
      (t) => t.tAreaAsignacionHoras !== null && t.tAreaAsignacionHoras / 8 <= filters.tAsignacionMax!
    )
  }

  if (filters.tLimiteMin !== undefined) {
    filtered = filtered.filter(
      (t) => t.tiempoLimiteHoras !== null && t.tiempoLimiteHoras / 8 >= filters.tLimiteMin!
    )
  }

  if (filters.tLimiteMax !== undefined) {
    filtered = filtered.filter(
      (t) => t.tiempoLimiteHoras !== null && t.tiempoLimiteHoras / 8 <= filters.tLimiteMax!
    )
  }

  if (filters.resolucionMin !== undefined) {
    filtered = filtered.filter(
      (t) => t.resolucionDias !== null && t.resolucionDias >= filters.resolucionMin!
    )
  }

  if (filters.resolucionMax !== undefined) {
    filtered = filtered.filter(
      (t) => t.resolucionDias !== null && t.resolucionDias <= filters.resolucionMax!
    )
  }

  return filtered
}

function buildSummary(rows: InternalRow[]): ReportSummary {
  const avgAsignacionHoras = average(
    rows.map((ticket) => ticket.tAreaAsignacionHoras).filter((value): value is number => value !== null)
  )

  const avgTiempoLimiteHoras = average(
    rows.map((ticket) => ticket.tiempoLimiteHoras).filter((value): value is number => value !== null)
  )

  const avgResolucionDias = average(
    rows.map((ticket) => ticket.resolucionDias).filter((value): value is number => value !== null)
  )

  const fueraSlaAsignacion = rows.filter((ticket) => ticket.tAreaAsignacionExcede).length
  const margenInsuficiente = rows.filter((ticket) => !ticket.tiempoLimiteCumple).length

  return {
    totalTickets: rows.length,
    avgAsignacionHoras,
    porcentajeFueraSlaAsignacion: percentage(fueraSlaAsignacion, rows.length),
    avgTiempoLimiteHoras,
    porcentajeMargenInsuficiente: percentage(margenInsuficiente, rows.length),
    avgResolucionDias,
  }
}

function buildTrendSeries(rows: InternalRow[], groupBy: ReportGroupBy): ReportTrendPoint[] {
  const buckets = new Map<string, { label: string; items: InternalRow[] }>()

  rows.forEach((row) => {
    if (!row._rawBaseDate) return

    const date = new Date(row._rawBaseDate)
    if (Number.isNaN(date.getTime())) return

    const group = getGroupInfo(date, groupBy)
    const current = buckets.get(group.key)

    if (current) {
      current.items.push(row)
      return
    }

    buckets.set(group.key, {
      label: group.label,
      items: [row],
    })
  })

  return Array.from(buckets.entries())
    .map(([key, value]) => {
      const items = value.items

      const asignacionValues = items
        .map((item) => item.tAreaAsignacionHoras)
        .filter((item): item is number => item !== null)

      const tiempoLimiteValues = items
        .map((item) => item.tiempoLimiteHoras)
        .filter((item): item is number => item !== null)

      const resolucionValues = items
        .map((item) => item.resolucionDias)
        .filter((item): item is number => item !== null)

      const fueraSlaAsignacion = items.filter((item) => item.tAreaAsignacionExcede).length
      const margenInsuficiente = items.filter((item) => !item.tiempoLimiteCumple).length

      return {
        key,
        label: value.label,
        totalTickets: items.length,
        avgAsignacionHoras: average(asignacionValues),
        avgTiempoLimiteHoras: average(tiempoLimiteValues),
        avgResolucionDias: average(resolucionValues),
        porcentajeFueraSlaAsignacion: percentage(fueraSlaAsignacion, items.length),
        porcentajeMargenInsuficiente: percentage(margenInsuficiente, items.length),
      }
    })
    .sort((a, b) => a.key.localeCompare(b.key))
}

function buildBreakdown(
  rows: InternalRow[],
  selector: (row: InternalRow) => string
): ReportBreakdownPoint[] {
  const map = new Map<string, number>()

  rows.forEach((row) => {
    const key = selector(row).trim() || 'Sin dato'
    map.set(key, (map.get(key) || 0) + 1)
  })

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function cleanInternalRows(rows: InternalRow[]): TicketTableRow[] {
  return rows.map((row) => {
    const { _rawAsignacionDate, _rawBaseDate, ...rest } = row
    return rest
  })
}

export async function fetchServiceDeskReportData(
  filters: ServiceDeskReportFilters
): Promise<ServiceDeskReportData> {
  const preset = filters.preset || 'custom'
  const groupBy = filters.groupBy || 'week'
  const presetRange = preset !== 'custom' ? resolvePreset(preset) : { start: null, end: null }

  const effectiveFilters: ServiceDeskReportFilters = {
    ...filters,
    fechaAsignacionStart:
      preset !== 'custom' ? presetRange.start || undefined : filters.fechaAsignacionStart,
    fechaAsignacionEnd:
      preset !== 'custom' ? presetRange.end || undefined : filters.fechaAsignacionEnd,
  }

  const [rawTickets, feriados] = await Promise.all([
    getDashboardTickets(),
    getFeriados(),
  ])

  const catalogs = buildCatalogs(rawTickets)
  const internalRows = buildInternalRows(rawTickets, feriados)
  const filteredRows = applyReportFilters(internalRows, effectiveFilters)
  const cleanedRows = cleanInternalRows(filteredRows)

  const table: PaginatedTickets = {
    data: cleanedRows,
    totalCount: cleanedRows.length,
    totalPages: 1,
    currentPage: 1,
    catalogs,
  }

  return {
    summary: buildSummary(filteredRows),
    trendSeries: buildTrendSeries(filteredRows, groupBy),
    byStatus: buildBreakdown(filteredRows, (row) => row.estado),
    byResponsible: buildBreakdown(filteredRows, (row) => row.designado_a || 'Sin Asignar'),
    byApplication: buildBreakdown(filteredRows, (row) => row.aplicacion || 'N/A'),
    table,
    applied: {
      preset,
      groupBy,
      start:
        preset !== 'custom'
          ? presetRange.start
          : filters.fechaAsignacionStart || null,
      end:
        preset !== 'custom'
          ? presetRange.end
          : filters.fechaAsignacionEnd || null,
    },
  }
}