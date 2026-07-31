'use client'

import { useState } from 'react'
import styles from './AppShell.module.css'
import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'

interface AppShellProps {
  children: React.ReactNode
  usuario: {
    userId?: number
    nombre: string
    rol: string
    dominiosPermitidos?: string[]
  } | null
}

export default function AppShell({ children, usuario }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev)
  }

  return (
    <div className={styles.layoutRoot}>
      <AppHeader toggleSidebar={toggleSidebar} usuario={usuario} />

      <div className={styles.layoutBody}>
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          userRole={usuario?.rol || 'AGENTE'}
          userId={usuario?.userId}
          userDomains={usuario?.dominiosPermitidos}
        />
        <main className={styles.layoutMain}>{children}</main>
      </div>
    </div>
  )
}