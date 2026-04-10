'use client'

import { useState } from 'react'
import styles from './AppShell.module.css'
import AppHeader from './AppHeader'
import AppSidebar from './AppSidebar'

interface AppShellProps {
  children: React.ReactNode
  usuario: {
    nombre: string
    rol: string
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
        <AppSidebar isCollapsed={isSidebarCollapsed} />
        <main className={styles.layoutMain}>{children}</main>
      </div>
    </div>
  )
}