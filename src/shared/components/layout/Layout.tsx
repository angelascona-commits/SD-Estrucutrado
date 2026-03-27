'use client';

import { useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Estados originales
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Nuevos estados para la sesión
  const [verificando, setVerificando] = useState(true);
  const [usuarioActual, setUsuarioActual] = useState<any>(null);

  // 1. Efecto que vigila la sesión cada vez que cambias de página
  useEffect(() => {
    const sesion = localStorage.getItem('usuario_sesion');

    if (!sesion && pathname !== '/') {
      router.push('/');
      setVerificando(false); // <-- Agregamos esto
    } else if (sesion && pathname === '/') {
      router.push('/dashboard');
      setVerificando(false); // <-- Agregamos esto
    } else {
      if (sesion) {
        setUsuarioActual(JSON.parse(sesion));
      }
      setVerificando(false);
    }
  }, [pathname, router]);

  // Función para colapsar el menú
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  // Función para cerrar sesión desde el Sidebar
  const handleLogout = () => {
    localStorage.removeItem('usuario_sesion');
    setUsuarioActual(null);
    router.push('/');
  };

  // ⏳ Mientras revisa el localStorage, mostramos un cargando para evitar parpadeos
  if (verificando) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        Cargando sistema...
      </div>
    );
  }

  // 🔴 LA MAGIA: Si estamos en la página de Login (/), NO pintamos el Layout, solo el formulario
  if (pathname === '/') {
    return <>{children}</>;
  }

  // 🟢 SI ESTAMOS EN EL SISTEMA: Devolvemos TU DISEÑO ORIGINAL intacto
  return (
    <div className={styles.layoutRoot}>
      {/* Le pasamos el usuario real al Header */}
      <Header toggleSidebar={toggleSidebar} usuario={usuarioActual} />

      <div className={styles.layoutBody}>
        {/* Le pasamos la función de cerrar sesión al Sidebar */}
        <Sidebar isCollapsed={isSidebarCollapsed} onLogout={handleLogout} />

        <main className={styles.layoutMain}>
          {children}
        </main>
      </div>
    </div>
  );
}