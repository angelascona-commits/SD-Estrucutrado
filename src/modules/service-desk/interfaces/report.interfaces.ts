import type { PaginatedTickets, TicketFilters } from '@/modules/service-desk/interfaces/ticket.interfaces'

export type ReportPreset = 'custom' | 'this_week' | 'last_week' | 'this_month' | 'last_month'
export type ReportGroupBy = 'day' | 'week' | 'month'

export interface ServiceDeskReportFilters extends TicketFilters {
  preset?: ReportPreset
  groupBy?: ReportGroupBy
}

export interface ReportSummary {
  totalTickets: number
  avgAsignacionHoras: number | null
  porcentajeFueraSlaAsignacion: number
  avgTiempoLimiteHoras: number | null
  porcentajeMargenInsuficiente: number
  avgResolucionDias: number | null
}

export interface ReportTrendPoint {
  key: string
  label: string
  totalTickets: number
  avgAsignacionHoras: number | null
  avgTiempoLimiteHoras: number | null
  avgResolucionDias: number | null
  porcentajeFueraSlaAsignacion: number
  porcentajeMargenInsuficiente: number
}

export interface ReportBreakdownPoint {
  label: string
  value: number
}

export interface ServiceDeskReportData {
  summary: ReportSummary
  trendSeries: ReportTrendPoint[]
  byStatus: ReportBreakdownPoint[]
  byResponsible: ReportBreakdownPoint[]
  byApplication: ReportBreakdownPoint[]
  table: PaginatedTickets
  applied: {
    preset: ReportPreset
    groupBy: ReportGroupBy
    start: string | null
    end: string | null
  }
}