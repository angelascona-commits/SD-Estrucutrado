import Link from 'next/link'
import styles from './SGPRCViewHeader.module.css'

interface Props {
  currentView: 'dashboard' | 'catalogos'
  dashboardHref: string
  catalogosHref: string
  actionButton?: React.ReactNode
}

export default function SGPRCViewHeader({
  currentView,
  dashboardHref,
  catalogosHref,
  actionButton
}: Props) {
  const titleMap = {
    dashboard: 'Solicitudes de Recursos Cloud',
    catalogos: 'Configuración de Catálogos (Servicios Cloud)'
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            {titleMap[currentView]}
          </h1>

          <div className={styles.viewSwitch}>
            <Link
              href={dashboardHref}
              className={`${styles.viewTab} ${currentView === 'dashboard' ? styles.viewTabActive : ''}`}
            >
              Solicitudes Cloud
            </Link>
            <Link
              href={catalogosHref}
              className={`${styles.viewTab} ${currentView === 'catalogos' ? styles.viewTabActive : ''}`}
            >
              Catálogos Maestros
            </Link>
          </div>
        </div>

        {actionButton && (
          <div className={styles.headerRight}>
            {actionButton}
          </div>
        )}
      </div>
    </header>
  )
}
