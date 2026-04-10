'use client'

import { useMemo, useState } from 'react'
import type {
  ReportBreakdownPoint,
  ReportTrendPoint,
  ServiceDeskReportData,
} from '@/modules/service-desk/interfaces/report.interfaces'
import styles from './ReportsCharts.module.css'

interface Props {
  report: ServiceDeskReportData
}

type MetricKey =
  | 'totalTickets'
  | 'avgAsignacionHoras'
  | 'avgTiempoLimiteHoras'
  | 'avgResolucionDias'
  | 'porcentajeFueraSlaAsignacion'
  | 'porcentajeMargenInsuficiente'

type BreakdownKey = 'status' | 'responsible' | 'application'
type ChartMode = 'comparativo' | 'distribucion'

const METRIC_CONFIG: Record<
  MetricKey,
  {
    label: string
    shortLabel: string
    unit: string
    value: (item: ReportTrendPoint) => number
    format: (value: number) => string
  }
> = {
  totalTickets: {
    label: 'Total de tickets',
    shortLabel: 'Tickets',
    unit: 'tickets',
    value: (item) => item.totalTickets,
    format: (value) => `${value}`,
  },
  avgAsignacionHoras: {
    label: 'Promedio de asignación',
    shortLabel: 'Asignación',
    unit: 'hrs',
    value: (item) => item.avgAsignacionHoras || 0,
    format: (value) => `${value.toFixed(2)} hrs`,
  },
  avgTiempoLimiteHoras: {
    label: 'Promedio de margen de atención',
    shortLabel: 'Margen',
    unit: 'hrs',
    value: (item) => item.avgTiempoLimiteHoras || 0,
    format: (value) => `${value.toFixed(2)} hrs`,
  },
  avgResolucionDias: {
    label: 'Promedio de resolución',
    shortLabel: 'Resolución',
    unit: 'días',
    value: (item) => item.avgResolucionDias || 0,
    format: (value) => `${value.toFixed(2)} días`,
  },
  porcentajeFueraSlaAsignacion: {
    label: '% fuera SLA de asignación',
    shortLabel: '% fuera SLA',
    unit: '%',
    value: (item) => item.porcentajeFueraSlaAsignacion,
    format: (value) => `${value.toFixed(1)}%`,
  },
  porcentajeMargenInsuficiente: {
    label: '% con margen insuficiente',
    shortLabel: '% margen insuf.',
    unit: '%',
    value: (item) => item.porcentajeMargenInsuficiente,
    format: (value) => `${value.toFixed(1)}%`,
  },
}

const BREAKDOWN_OPTIONS: Record<
  BreakdownKey,
  {
    label: string
    getData: (report: ServiceDeskReportData) => ReportBreakdownPoint[]
  }
> = {
  status: {
    label: 'Por estado',
    getData: (report) => report.byStatus,
  },
  responsible: {
    label: 'Por responsable',
    getData: (report) => report.byResponsible,
  },
  application: {
    label: 'Por aplicación',
    getData: (report) => report.byApplication,
  },
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

function ComparisonColumnsChart({
  series,
  metricKey,
}: {
  series: ReportTrendPoint[]
  metricKey: MetricKey
}) {
  const metric = METRIC_CONFIG[metricKey]

  const prepared = useMemo(() => {
    const values = series.map((item) => metric.value(item))
    const avg = average(values)

    return series.map((item) => ({
      key: item.key,
      label: item.label,
      current: metric.value(item),
      average: avg,
    }))
  }, [series, metric])

  if (prepared.length === 0) {
    return <div className={styles.emptyState}>No hay datos suficientes para construir este gráfico.</div>
  }

  const maxValue = Math.max(
    ...prepared.flatMap((item) => [item.current, item.average]),
    1
  )

  return (
    <div className={styles.columnsCard} data-report-chart>
      <div className={styles.columnsLegend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.currentDot}`} />
          <span>Valor semanal</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.averageDot}`} />
          <span>Promedio del período</span>
        </div>
      </div>

      <div className={styles.columnsViewport}>
        {prepared.map((item) => {
          const currentHeight = `${(item.current / maxValue) * 100}%`
          const averageHeight = `${(item.average / maxValue) * 100}%`

          return (
            <div key={item.key} className={styles.columnGroup}>
              <div className={styles.columnValueRow}>
                <span className={styles.columnValue}>
                  {metric.format(item.current)}
                </span>
              </div>

              <div className={styles.columnsPair}>
                <div className={styles.columnTrack}>
                  <div className={`${styles.columnBar} ${styles.currentBar}`} style={{ height: currentHeight }} />
                </div>
                <div className={styles.columnTrack}>
                  <div className={`${styles.columnBar} ${styles.averageBar}`} style={{ height: averageHeight }} />
                </div>
              </div>

              <div className={styles.columnLabel}>{item.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HorizontalBarsChart({
  title,
  data,
}: {
  title: string
  data: ReportBreakdownPoint[]
}) {
  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className={styles.chartCard} data-report-chart>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{title}</h3>
      </div>

      {data.length === 0 ? (
        <div className={styles.emptyState}>No hay datos suficientes para este gráfico.</div>
      ) : (
        <div className={styles.barsList}>
          {data.map((item) => (
            <div key={item.label} className={styles.barRow}>
              <div className={styles.barMeta}>
                <span className={styles.barLabel}>{item.label}</span>
                <span className={styles.barValue}>{item.value}</span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportsCharts({ report }: Props) {
  const [mode, setMode] = useState<ChartMode>('comparativo')
  const [metricKey, setMetricKey] = useState<MetricKey>('avgAsignacionHoras')
  const [breakdownKey, setBreakdownKey] = useState<BreakdownKey>('responsible')

  const breakdownData = BREAKDOWN_OPTIONS[breakdownKey].getData(report).slice(0, 10)

  return (
    <section className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.modeSwitch}>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === 'comparativo' ? styles.modeButtonActive : ''}`}
            onClick={() => setMode('comparativo')}
          >
            Comparativo semanal
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === 'distribucion' ? styles.modeButtonActive : ''}`}
            onClick={() => setMode('distribucion')}
          >
            Distribución
          </button>
        </div>

        <div className={styles.selectors}>
          {mode === 'comparativo' ? (
            <div className={styles.selectorGroup}>
              <label className={styles.selectorLabel}>Campo</label>
              <select
                className={styles.selector}
                value={metricKey}
                onChange={(e) => setMetricKey(e.target.value as MetricKey)}
              >
                {Object.entries(METRIC_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className={styles.selectorGroup}>
              <label className={styles.selectorLabel}>Categoría</label>
              <select
                className={styles.selector}
                value={breakdownKey}
                onChange={(e) => setBreakdownKey(e.target.value as BreakdownKey)}
              >
                {Object.entries(BREAKDOWN_OPTIONS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {mode === 'comparativo' ? (
        <div className={styles.chartPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>{METRIC_CONFIG[metricKey].label}</h3>
            <span className={styles.panelHint}>
              Comparación entre semanas y promedio general del período
            </span>
          </div>

          <ComparisonColumnsChart
            series={report.trendSeries}
            metricKey={metricKey}
          />
        </div>
      ) : (
        <div className={styles.chartPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>{BREAKDOWN_OPTIONS[breakdownKey].label}</h3>
            <span className={styles.panelHint}>
              Vista resumida, sin cargar todos los gráficos a la vez
            </span>
          </div>

          <HorizontalBarsChart
            title={BREAKDOWN_OPTIONS[breakdownKey].label}
            data={breakdownData}
          />
        </div>
      )}
    </section>
  )
}