'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

type SidebarProps = {
  isCollapsed: boolean;
  onLogout?: () => void;
};

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { name: 'Archivados', path: '/archivados', icon: 'inventory_2' },
  { name: 'Usuarios', path: '/usuarios', icon: 'group' },
  { name: 'Reportes', path: '/Reportes', icon: 'analytics' },
];

export default function Sidebar({ isCollapsed, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`${styles.sidebar} ${
        isCollapsed ? styles.collapsed : ''
      }`}
    >
      <div className={styles.sidebarMenu}>
        {!isCollapsed && (
          <p className={styles.menuTitle}>Main Menu</p>
        )}

        {menuItems.map(item => {
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${
                isActive ? styles.active : ''
              }`}
            >
              <span className="material-symbols-outlined">
                {item.icon}
              </span>

              {!isCollapsed && (
                <span className={styles.navText}>
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className={styles.sidebarBottom}>
        <button onClick={onLogout} className={styles.navItem}>
          <span className="material-symbols-outlined">logout</span>
          {!isCollapsed && (
            <span className={styles.navText}>Salir</span>
          )}
        </button>
      </div>
    </aside>
  );
}