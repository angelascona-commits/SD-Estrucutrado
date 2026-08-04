'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getDominiosUsuarioAction } from '@/modules/admin/actions/roles.action'
import type { DomainItem } from '@/modules/admin/interfaces/roles.interfaces'
import styles from './AppSidebar.module.css'

interface AppSidebarProps {
  isCollapsed: boolean
  userRole: string
  userId?: number
  userDomains?: string[]
}

const FALLBACK_DOMINIOS: DomainItem[] = [
  {
    key: 'service-desk',
    label: 'Service Desk',
    href: '/service-desk',
    icon: 'confirmation_number',
  },
  {
    key: 'tareo',
    label: 'Tareo',
    href: '/tareo',
    icon: 'schedule',
  },
  {
    key: 'pareo',
    label: 'Pareo',
    href: '/pareo',
    icon: 'join_inner',
  },
  {
    key: 'sgprc',
    label: 'Solicitudes',
    href: '/sgprc',
    icon: 'cloud',
  },
]

export default function AppSidebar({ isCollapsed, userRole, userId, userDomains }: AppSidebarProps) {
  const pathname = usePathname()
  const [dominios, setDominios] = useState<DomainItem[]>(FALLBACK_DOMINIOS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function loadPermisos() {
      try {
        setLoading(true)
        const items = await getDominiosUsuarioAction(userRole, userId, userDomains)
        if (isMounted && items && items.length > 0) {
          setDominios(items)
        }
      } catch (err) {
        console.error('Error al cargar dominios para el sidebar:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadPermisos()
    return () => {
      isMounted = false
    }
  }, [userRole, userId, userDomains])

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarMenu}>
        {!isCollapsed && <p className={styles.menuTitle}>Dominios</p>}

        {loading ? (
          <div className={styles.loadingState}>
            {!isCollapsed && 'Cargando menú...'}
          </div>
        ) : (
          dominios.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                title={item.label}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {!isCollapsed && <span className={styles.navText}>{item.label}</span>}
              </Link>
            )
          })
        )}
      </div>
    </aside>
  )
}