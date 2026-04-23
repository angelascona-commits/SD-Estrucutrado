'use client'

import { useEffect, useState } from 'react'
import { fetchTareoCatalogsAction } from '../../actions/tareo.action'
import type { TareoCatalogs } from '../../interfaces/tareo.interfaces'
import styles from './CatalogosView.module.css'

type TabKey = 
  | 'trabajadores'
  | 'teams'
  | 'solicitantes'
  | 'agrupadores'
  | 'proyectos'
  | 'estadosTarea'
  | 'periodos'

export default function CatalogosView() {
  const [catalogs, setCatalogs] = useState<TareoCatalogs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('trabajadores')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetchTareoCatalogsAction()
      if (res.success && res.data) {
        setCatalogs(res.data)
      } else {
        setError(res.error ?? 'Error al cargar los catálogos')
      }
      setLoading(false)
    }
    load()
  }, [])

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'trabajadores', label: 'Trabajadores' },
    { key: 'teams', label: 'Teams' },
    { key: 'solicitantes', label: 'Solicitantes' },
    { key: 'agrupadores', label: 'Agrupadores' },
    { key: 'proyectos', label: 'Proyectos' },
    { key: 'estadosTarea', label: 'Estados de Tarea' },
    { key: 'periodos', label: 'Períodos' },
  ]

  const renderTable = () => {
    if (!catalogs) return null

    switch (activeTab) {
      case 'trabajadores':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.trabajadores.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.correo ?? '-'}</td>
                  <td>{item.telefono ?? '-'}</td>
                </tr>
              ))}
              {catalogs.trabajadores.length === 0 && (
                <tr><td colSpan={3} className={styles.empty}>No hay registros</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'teams':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.teams.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                </tr>
              ))}
              {catalogs.teams.length === 0 && (
                <tr><td colSpan={1} className={styles.empty}>No hay registros</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'solicitantes':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Horas Máx. Estimadas</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.solicitantes.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.horas_maximas_estimadas ?? '-'}</td>
                </tr>
              ))}
              {catalogs.solicitantes.length === 0 && (
                <tr><td colSpan={2} className={styles.empty}>No hay registros</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'agrupadores':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.agrupadores.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                </tr>
              ))}
              {catalogs.agrupadores.length === 0 && (
                <tr><td colSpan={1} className={styles.empty}>No hay registros</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'proyectos':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Agrupador</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.proyectos.map(item => {
                const agrupador = catalogs.agrupadores.find(a => a.id === item.agrupador_id)
                return (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{agrupador?.nombre ?? 'Desconocido'}</td>
                  </tr>
                )
              })}
              {catalogs.proyectos.length === 0 && (
                <tr><td colSpan={2} className={styles.empty}>No hay registros</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'estadosTarea':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.estadosTarea.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                </tr>
              ))}
              {catalogs.estadosTarea.length === 0 && (
                <tr><td colSpan={1} className={styles.empty}>No hay registros</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'periodos':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Año-Mes</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.periodos.map(item => (
                <tr key={item.id}>
                  <td>{item.anio}-{item.mes.toString().padStart(2, '0')}</td>
                  <td>{item.fecha_inicio}</td>
                  <td>{item.fecha_fin}</td>
                  <td>
                    {item.cerrado ? (
                      <span className={styles.badgeCerrado}>Cerrado</span>
                    ) : (
                      <span className={styles.badgeAbierto}>Abierto</span>
                    )}
                  </td>
                </tr>
              ))}
              {catalogs.periodos.length === 0 && (
                <tr><td colSpan={4} className={styles.empty}>No hay registros</td></tr>
              )}
            </tbody>
          </table>
        )
      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Gestión de Catálogos</h2>
          <p className={styles.subtitle}>
            Administración de entidades base utilizadas en todo el sistema de Tareo.
          </p>
        </div>
        <button className={styles.btnNuevo}>
          + Nuevo {tabs.find(t => t.key === activeTab)?.label}
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Entidades</div>
          <div className={styles.tabList}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Cargando catálogos...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <div className={styles.tableContainer}>
              {renderTable()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
