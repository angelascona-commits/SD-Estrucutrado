'use client'

import styles from '../styles/tareo-daily-widgets.module.css'

interface TareoDailyWidgetsProps {
  totalHorasDia: number
  totalAcumuladoMes: number
  totalRegistrosDia: number
  totalTrabajadoresDia: number
}

interface WidgetCardProps {
  title: string
  value: string | number
}

function formatWidgetValue(value: string | number): string | number {
  if (typeof value === 'number') {
    return Number(Math.round(value * 100) / 100)
  }
  return value
}

function WidgetCard({ title, value }: WidgetCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardValue}>{formatWidgetValue(value)}</div>
    </div>
  )
}

export default function TareoDailyWidgets({
  totalHorasDia,
  totalAcumuladoMes,
  totalRegistrosDia,
  totalTrabajadoresDia
}: TareoDailyWidgetsProps) {
  return (
    <div className={styles.container}>
      <WidgetCard title="Horas del día" value={totalHorasDia} />
      <WidgetCard title="Acumulado del mes" value={totalAcumuladoMes} />
      <WidgetCard title="Registros del día" value={totalRegistrosDia} />
      <WidgetCard title="Trabajadores con horas" value={totalTrabajadoresDia} />
    </div>
  )
}