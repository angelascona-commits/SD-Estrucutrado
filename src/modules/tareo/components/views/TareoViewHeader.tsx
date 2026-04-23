import Link from 'next/link'
import styles from './TareoViewHeader.module.css'

interface Props {
  currentView: 'dashboard' | 'catalogos' | 'tareas'
  dashboardHref: string
  catalogosHref: string
  tareasHref: string
}

export default function TareoViewHeader({
  currentView,
  dashboardHref,
  catalogosHref,
  tareasHref,
}: Props) {
  const titleMap = {
    dashboard: 'Registro de Tareo',
    catalogos: 'Gestión de Catálogos',
    tareas: 'Gestión de Tareas'
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
              Registros
            </Link>
            <Link
              href={tareasHref}
              className={`${styles.viewTab} ${currentView === 'tareas' ? styles.viewTabActive : ''}`}
            >
              Tareas
            </Link>
            <Link
              href={catalogosHref}
              className={`${styles.viewTab} ${currentView === 'catalogos' ? styles.viewTabActive : ''}`}
            >
              Catálogos
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
