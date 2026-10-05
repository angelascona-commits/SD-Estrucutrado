'use client'

import styles from '../styles/tareo-daily-widgets.module.css'

interface TareoDailyWidgetsProps {
  totalHorasDia: number
  totalAcumuladoFecha: number
  totalMesCompleto: number
  totalRegistrosDia: number
  totalTrabajadoresDia: number
  selectedFecha?: string
  mostrarTotalMesCompleto: boolean
  onToggleTotalMes: () => void
}

function formatWidgetValue(value: string | number): string | number {
  if (typeof value === 'number') {
    return Number(Math.round(value * 100) / 100)
  }
  return value
}

export default function TareoDailyWidgets({
  totalHorasDia,
  totalAcumuladoFecha,
  totalMesCompleto,
  totalRegistrosDia,
  totalTrabajadoresDia,
  selectedFecha,
  mostrarTotalMesCompleto,
  onToggleTotalMes
}: TareoDailyWidgetsProps) {
  const formattedDay = selectedFecha && selectedFecha.includes('-')
    ? selectedFecha.split('-').slice(1).reverse().join('/')
    : ''

  return (
    <div className={styles.container}>
      {/* 1. Horas del día */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Horas del día</span>
          {formattedDay && <span className={styles.dateBadge}>{formattedDay}</span>}
        </div>
        <div className={styles.cardValue}>{formatWidgetValue(totalHorasDia)}</div>
        <div className={styles.cardFooter}>
          <span className={styles.cardHelper}>
            <span className={styles.helperDot} />
            Total de la jornada
          </span>
        </div>
      </div>

      {/* 2. Acumulado / Total Mes */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            {mostrarTotalMesCompleto ? 'Total del mes' : 'Acumulado al día'}
          </span>
          {formattedDay && !mostrarTotalMesCompleto && (
            <span className={styles.dateBadge}>al {formattedDay}</span>
          )}
          {mostrarTotalMesCompleto && (
            <span className={styles.dateBadge}>Mes completo</span>
          )}
        </div>
        <div className={styles.cardValue}>
          {formatWidgetValue(mostrarTotalMesCompleto ? totalMesCompleto : totalAcumuladoFecha)}
        </div>
        <div className={styles.cardFooter}>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={onToggleTotalMes}
            title={
              mostrarTotalMesCompleto
                ? `Cambiar a ver acumulado hasta ${formattedDay}`
                : 'Cambiar a ver el total del mes completo'
            }
          >
            {mostrarTotalMesCompleto
              ? `← Ver a la fecha (${formatWidgetValue(totalAcumuladoFecha)} h)`
              : `Ver mes completo (${formatWidgetValue(totalMesCompleto)} h) →`}
          </button>
        </div>
      </div>

      {/* 3. Registros del día */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Registros del día</span>
          {formattedDay && <span className={styles.dateBadge}>{formattedDay}</span>}
        </div>
        <div className={styles.cardValue}>{formatWidgetValue(totalRegistrosDia)}</div>
        <div className={styles.cardFooter}>
          <span className={styles.cardHelper}>
            <span className={styles.helperDot} />
            Entradas registradas
          </span>
        </div>
      </div>

      {/* 4. Trabajadores con horas */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Trabajadores con horas</span>
          {formattedDay && <span className={styles.dateBadge}>{formattedDay}</span>}
        </div>
        <div className={styles.cardValue}>{formatWidgetValue(totalTrabajadoresDia)}</div>
        <div className={styles.cardFooter}>
          <span className={styles.cardHelper}>
            <span className={styles.helperDot} />
            Colaboradores activos
          </span>
        </div>
      </div>
    </div>
  )
}