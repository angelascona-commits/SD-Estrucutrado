'use client'

import { TicketFiltersBar } from '@/modules/service-desk/components/TicketFiltersBar'
import { TicketTable } from '@/modules/service-desk/components/TicketTable'
import ReportsCharts from '@/modules/service-desk/components/views/ReportsCharts'
import {
  exportServiceDeskReportToExcel,
  exportServiceDeskReportToPdf,
} from '@/modules/service-desk/utils/report-export.utils'
import type { ServiceDeskReportData } from '@/modules/service-desk/interfaces/report.interfaces'
import styles from './ReportsView.module.css'

interface Props {
  report: ServiceDeskReportData
}

export default function ReportsView({ report }: Props) {
  return (
    <section className={styles.pageSection}>
      <TicketFiltersBar catalogs={report.table.catalogs} mode="reportes" />

      <div className={styles.reportActions}>
        <div className={styles.reportMeta}>
          <span className={styles.reportMetaItem}>
            Período: {report.applied.start || 'Sin inicio'} - {report.applied.end || 'Sin fin'}
          </span>
          <span className={styles.reportMetaItem}>Agrupación: {report.applied.groupBy}</span>
        </div>

        <div className={styles.actionsGroup}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => exportServiceDeskReportToPdf('service-desk-report-root')}
          >
            Exportar PDF
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => exportServiceDeskReportToExcel(report, 'service-desk-report-charts')}
          >
            Exportar Excel
          </button>
        </div>
      </div>

      <div id="service-desk-report-root" className={styles.reportCaptureArea}>
        <section id="service-desk-report-summary" className={styles.reportsSection}>
          <div className={styles.kpiGrid}>
            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Tickets del período</span>
              <strong className={styles.kpiValue}>{report.summary.totalTickets}</strong>
            </article>

            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Prom. asignación</span>
              <strong className={styles.kpiValue}>
                {report.summary.avgAsignacionHoras !== null
                  ? `${report.summary.avgAsignacionHoras} hrs`
                  : '-'}
              </strong>
            </article>

            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Fuera SLA asignación</span>
              <strong className={styles.kpiValue}>
                {report.summary.porcentajeFueraSlaAsignacion}%
              </strong>
            </article>

            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Prom. margen atención</span>
              <strong className={styles.kpiValue}>
                {report.summary.avgTiempoLimiteHoras !== null
                  ? `${report.summary.avgTiempoLimiteHoras} hrs`
                  : '-'}
              </strong>
            </article>

            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Margen insuficiente</span>
              <strong className={styles.kpiValue}>
                {report.summary.porcentajeMargenInsuficiente}%
              </strong>
            </article>

            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Prom. resolución</span>
              <strong className={styles.kpiValue}>
                {report.summary.avgResolucionDias !== null
                  ? `${report.summary.avgResolucionDias} días`
                  : '-'}
              </strong>
            </article>
          </div>
        </section>

        <section className={styles.reportsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Gráficos</h2>
            <span className={styles.sectionHint}>
              Tendencia temporal y distribución por categorías
            </span>
          </div>

          <ReportsCharts report={report} />
        </section>

        <section className={styles.reportsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Comparativa temporal</h2>
            <span className={styles.sectionHint}>
              Resumen agrupado según el período seleccionado
            </span>
          </div>

          {report.trendSeries.length === 0 ? (
            <div className={styles.emptyState}>
              No hay suficientes datos para construir la comparativa temporal.
            </div>
          ) : (
            <div className={styles.reportTableWrapper}>
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Total tickets</th>
                    <th>Prom. asignación</th>
                    <th>% fuera SLA</th>
                    <th>Prom. margen</th>
                    <th>% margen insuficiente</th>
                    <th>Prom. resolución</th>
                  </tr>
                </thead>
                <tbody>
                  {report.trendSeries.map((row) => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      <td>{row.totalTickets}</td>
                      <td>
                        {row.avgAsignacionHoras !== null ? `${row.avgAsignacionHoras} hrs` : '-'}
                      </td>
                      <td>{row.porcentajeFueraSlaAsignacion}%</td>
                      <td>
                        {row.avgTiempoLimiteHoras !== null
                          ? `${row.avgTiempoLimiteHoras} hrs`
                          : '-'}
                      </td>
                      <td>{row.porcentajeMargenInsuficiente}%</td>
                      <td>
                        {row.avgResolucionDias !== null ? `${row.avgResolucionDias} días` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.reportsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Detalle del período</h2>
          </div>

          <TicketTable tickets={report.table.data} />
        </section>
      </div>
    </section>
  )
}