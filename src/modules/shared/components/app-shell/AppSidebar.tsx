'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './AppSidebar.module.css'

interface AppSidebarProps {
  isCollapsed: boolean
}

const DOMINIOS = [
  {
    label: 'Service Desk',
    href: '/service-desk',
    icon: 'confirmation_number',
  },
  
]

export default function AppSidebar({ isCollapsed }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarMenu}>
        {!isCollapsed && <p className={styles.menuTitle}>Dominios</p>}

        {DOMINIOS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {!isCollapsed && <span className={styles.navText}>{item.label}</span>}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}