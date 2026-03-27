'use client';

import styles from './Header.module.css';

type Usuario = {
  nombre?: string;
  rol?: string;
};

type HeaderProps = {
  toggleSidebar: () => void;
  usuario?: Usuario;
};

export default function Header({ toggleSidebar, usuario }: HeaderProps) {
  const obtenerIniciales = (nombre?: string) => {
    if (!nombre) return 'US';
    return nombre.substring(0, 2).toUpperCase();
  };

  const nombreMostrar = usuario?.nombre || 'Cargando...';
  const rolMostrar = usuario?.rol || 'Agente';
  const iniciales = obtenerIniciales(nombreMostrar);

  return (
    <header className={styles.topHeader}>
      <div className={styles.headerLeft}>
        <button className={styles.menuToggle} onClick={toggleSidebar}>
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className={styles.logoContainer}>
          <h2 className={styles.logoText}>Service Desk</h2>
        </div>

        <div className={styles.searchBox}>
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Buscar tickets, usuarios o módulos..."
          />
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
  );
}