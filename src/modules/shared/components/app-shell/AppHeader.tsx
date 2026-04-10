'use client'

import styles from './AppHeader.module.css'

interface AppHeaderProps {
  toggleSidebar: () => void
  usuario: {
    nombre: string
    rol: string
  } | null
}

function obtenerIniciales(nombre: string) {
  if (!nombre) return 'US'
  return nombre.trim().slice(0, 2).toUpperCase()
}

export default function AppHeader({ toggleSidebar, usuario }: AppHeaderProps) {
  const nombreMostrar = usuario?.nombre || 'Usuario'
  const rolMostrar = usuario?.rol || 'Agente'
  const iniciales = obtenerIniciales(nombreMostrar)

  return (
    <header className={styles.topHeader}>
      <div className={styles.headerLeft}>
        <button className={styles.menuToggle} onClick={toggleSidebar} type="button">
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className={styles.logoContainer}>
          <h2 className={styles.logoText}>SGEM Platform</h2>
        </div>

        
      </div>

      <div className={styles.headerRight}>
        <div className={styles.divider}></div>

        <div className={styles.userProfile}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{nombreMostrar}</p>
            <p className={styles.userRole}>{rolMostrar.toUpperCase()}</p>
          </div>
          <div className={styles.avatar}>{iniciales}</div>
        </div>
      </div>
    </header>
  )
}