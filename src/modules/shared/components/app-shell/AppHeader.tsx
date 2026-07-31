'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { logoutAction } from '@/modules/auth/actions/logout.action'
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
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  const nombreMostrar = usuario?.nombre || 'Usuario'
  const rolMostrar = usuario?.rol || 'Agente'
  const iniciales = obtenerIniciales(nombreMostrar)

  const isAdmin = rolMostrar.toUpperCase().includes('ADMIN')

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = () => {
    setIsOpen(false)
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <header className={styles.topHeader}>
      <div className={styles.headerLeft}>
        <button className={styles.menuToggle} onClick={toggleSidebar} type="button" title="Alternar menú">
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className={styles.logoContainer}>
          <h2 className={styles.logoText}>SGEM Platform</h2>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.divider}></div>

        <div className={styles.userProfileWrapper} ref={menuRef}>
          <button
            type="button"
            className={styles.userProfileButton}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            title="Opciones de perfil"
          >
            <div className={styles.userInfo}>
              <p className={styles.userName}>{nombreMostrar}</p>
              <p className={styles.userRole}>{rolMostrar.toUpperCase()}</p>
            </div>
            <div className={styles.avatar}>{iniciales}</div>
            <span
              className={`material-symbols-outlined ${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ''}`}
            >
              expand_more
            </span>
          </button>

          {isOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <p className={styles.dropdownHeaderName}>{nombreMostrar}</p>
                <p className={styles.dropdownHeaderRole}>{rolMostrar}</p>
              </div>

              <div className={styles.dropdownDivider}></div>

              {isAdmin && (
                <Link
                  href="/admin/permisos"
                  className={styles.dropdownItem}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#64748b' }}>
                    admin_panel_settings
                  </span>
                  <span>Permisos por Perfil</span>
                </Link>
              )}

              <div className={styles.dropdownDivider}></div>

              <button
                type="button"
                className={`${styles.dropdownItem} ${styles.logoutItem}`}
                onClick={handleLogout}
                disabled={isPending}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  logout
                </span>
                <span>{isPending ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}