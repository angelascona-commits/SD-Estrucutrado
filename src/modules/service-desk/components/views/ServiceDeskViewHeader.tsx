import Link from 'next/link'
import styles from './ServiceDeskViewHeader.module.css'

interface Props {
  currentView: 'dashboard' | 'reportes'
  dashboardHref: string
  reportsHref: string
}

export default function ServiceDeskViewHeader({
  currentView,
  dashboardHref,
  reportsHref,
}: Props) {
  const isReportsView = currentView === 'reportes'

  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            {isReportsView ? 'Vista de Reportes' : 'Vista de Dashboard'}
          </h1>

          <div className={styles.viewSwitch}>
            <Link
              href={dashboardHref}
              className={`${styles.viewTab} ${!isReportsView ? styles.viewTabActive : ''}`}
            >
              Dashboard
            </Link>
            <Link
              href={reportsHref}
              className={`${styles.viewTab} ${isReportsView ? styles.viewTabActive : ''}`}
            >
              Reportes
            </Link>
          </div>
        </div>

        <div className={styles.headerActions}>
          {!isReportsView && (
            <Link href="?create=true" className={styles.btnPrimary}>
              + Nuevo Ticket
            </Link>
          )}
        </div>
      </div>

      {isReportsView && (
        <p className={styles.subtitle}>
          Usa los filtros para acotar el período. El rango de fechas actual funciona sobre la fecha
          de asignación.
        </p>
      )}
    </header>
  )
}