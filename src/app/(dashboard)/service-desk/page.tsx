import {
  fetchDashboardTicketsList,
  fetchUrgentTickets,
  fetchAllUrgentTickets,
  fetchArchivedTicketsList,
} from '@/modules/service-desk/actions/getTickets.action'
import { fetchServiceDeskReportData } from '@/modules/service-desk/actions/reports.action'
import TicketModal from '@/modules/service-desk/components/TicketModal'
import RetrasosModal from '@/modules/service-desk/components/RetrasosModal'
import ArchivadosModal from '@/modules/service-desk/components/ArchivadosModal'
import DashboardView from '@/modules/service-desk/components/views/DashboardView'
import ReportsView from '@/modules/service-desk/components/views/ReportsView'
import ServiceDeskViewHeader from '@/modules/service-desk/components/views/ServiceDeskViewHeader'
import styles from './page.module.css'
import type {
  ReportGroupBy,
  ReportPreset,
} from '@/modules/service-desk/interfaces/report.interfaces'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ [key: string]: string | undefined }>
}

function buildViewLink(
  params: { [key: string]: string | undefined },
  view: 'dashboard' | 'reportes'
) {
  const urlParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (!value) return
    if (key === 'page') return
    if (key === 'create' || key === 'editId' || key === 'retrasos' || key === 'archivados') return
    urlParams.set(key, value)
  })

  urlParams.set('view', view)
  return `/service-desk?${urlParams.toString()}`
}

export default async function ServiceDeskPage({ searchParams }: Props) {
  const params = await searchParams
  const pageStr = params?.page
  const pageNum = pageStr ? parseInt(pageStr, 10) : 1

  const currentView = params?.view === 'reportes' ? 'reportes' : 'dashboard'
  const isReportsView = currentView === 'reportes'

  const editIdRaw = params?.editId
  const editId = editIdRaw ? parseInt(editIdRaw, 10) : undefined
  const isCreateOpen = params?.create === 'true'
  const isModalOpen = isCreateOpen || !!editId
  const isDelayedModalOpen = params?.retrasos === 'true'
  const isArchivedModalOpen = params?.archivados === 'true'

  const filters = {
    q: params?.q,
    estado: params?.estado,
    aplicacion: params?.aplicacion,
    designado: params?.designado,
    fechaAsignacionStart: params?.fStart,
    fechaAsignacionEnd: params?.fEnd,
    tAsignacionMin: params?.tAsigMin ? parseFloat(params.tAsigMin) : undefined,
    tAsignacionMax: params?.tAsigMax ? parseFloat(params.tAsigMax) : undefined,
    tLimiteMin: params?.tLimMin ? parseFloat(params.tLimMin) : undefined,
    tLimiteMax: params?.tLimMax ? parseFloat(params.tLimMax) : undefined,
    resolucionMin: params?.resMin ? parseFloat(params.resMin) : undefined,
    resolucionMax: params?.resMax ? parseFloat(params.resMax) : undefined,
  }

  const [
    dashboardData,
    reportData,
    urgentTickets,
    delayedTickets,
    archivedTicketsResult,
  ] = await Promise.all([
    !isReportsView
      ? fetchDashboardTicketsList(pageNum, 50, filters)
      : Promise.resolve(null),
    isReportsView
      ? fetchServiceDeskReportData({
          ...filters,
          preset: (params?.preset as ReportPreset | undefined) || 'custom',
          groupBy: (params?.groupBy as ReportGroupBy | undefined) || 'week',
        })
      : Promise.resolve(null),
    !isReportsView ? fetchUrgentTickets() : Promise.resolve([]),
    isDelayedModalOpen ? fetchAllUrgentTickets() : Promise.resolve([]),
    isArchivedModalOpen
      ? fetchArchivedTicketsList(1, 200, filters)
      : Promise.resolve({
          data: [],
          totalCount: 0,
          totalPages: 1,
          currentPage: 1,
          catalogs: { estados: [], aplicaciones: [], responsables: [] },
        }),
  ])

  const getPaginationLink = (newPage: number) => {
    const urlParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value && key !== 'page') {
        urlParams.set(key, value)
      }
    })

    urlParams.set('page', newPage.toString())
    return `/service-desk?${urlParams.toString()}`
  }

  return (
    <main className={styles.container}>
      <ServiceDeskViewHeader
        currentView={currentView}
        dashboardHref={buildViewLink(params, 'dashboard')}
        reportsHref={buildViewLink(params, 'reportes')}
      />

      {isReportsView && reportData ? (
        <ReportsView report={reportData} />
      ) : dashboardData ? (
        <DashboardView
          tickets={dashboardData.data}
          totalPages={dashboardData.totalPages}
          currentPage={dashboardData.currentPage}
          catalogs={dashboardData.catalogs}
          urgentTickets={urgentTickets}
          getPaginationLink={getPaginationLink}
        />
      ) : null}

      <TicketModal isOpen={isModalOpen} ticketId={editId} />
      <RetrasosModal isOpen={isDelayedModalOpen} tickets={delayedTickets} />
      <ArchivadosModal isOpen={isArchivedModalOpen} tickets={archivedTicketsResult.data} />
    </main>
  )
}