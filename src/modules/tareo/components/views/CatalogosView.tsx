'use client'

import { useEffect, useState } from 'react'
import { fetchTareoCatalogsAction, saveCatalogItemAction, deleteCatalogItemAction } from '../../actions/tareo.action'
import type { TareoCatalogs, PeriodoItem } from '../../interfaces/tareo.interfaces'
import { AlertModal, ConfirmModal } from '../FeedbackModals'
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

  // Edit / Form State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Feedback Modals State
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{message: string, action: () => void} | null>(null)

  const showAlert = (msg: string) => {
    setAlertMessage(msg)
    setAlertOpen(true)
  }

  const showConfirm = (msg: string, action: () => void) => {
    setConfirmConfig({ message: msg, action })
    setConfirmOpen(true)
  }

  // Mapping tab key to DB table name
  const tableMapping: Record<TabKey, string> = {
    trabajadores: 'tareo_trabajador',
    teams: 'tareo_team',
    solicitantes: 'tareo_solicitante',
    agrupadores: 'tareo_agrupador',
    proyectos: 'tareo_proyecto',
    estadosTarea: 'tareo_estado_tarea',
    periodos: 'tareo_periodo'
  }

  const loadData = async () => {
    setLoading(true)
    const res = await fetchTareoCatalogsAction()
    if (res.success && res.data) {
      setCatalogs(res.data)
    } else {
      setError(res.error ?? 'Error al cargar los catálogos')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = () => {
    setEditItem(null)
    setIsModalOpen(true)
  }

  const handleEdit = (item: any) => {
    setEditItem({ ...item })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    showConfirm('¿Deseas inactivar/eliminar este registro?', async () => {
      setConfirmOpen(false)
      setLoading(true)
      const res = await deleteCatalogItemAction(tableMapping[activeTab], id)
      if (!res.success) showAlert(res.error ?? 'Error')
      await loadData()
    })
  }

  const handleSaveForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    
    const formData = new FormData(e.currentTarget)
    const payload: any = {}
    
    if (editItem?.id) payload.id = editItem.id
    if (activeTab !== 'periodos') payload.nombre = formData.get('nombre')

    if (activeTab === 'trabajadores') {
      payload.correo = formData.get('correo')
      payload.telefono = formData.get('telefono')
    } else if (activeTab === 'solicitantes') {
      payload.horas_maximas_estimadas = Number(formData.get('horas_maximas_estimadas')) || null
    } else if (activeTab === 'proyectos') {
      payload.agrupador_id = Number(formData.get('agrupador_id'))
    } else if (activeTab === 'periodos') {
      payload.anio = Number(formData.get('anio'))
      payload.mes = Number(formData.get('mes'))
      payload.fecha_inicio = formData.get('fecha_inicio')
      payload.fecha_fin = formData.get('fecha_fin')
      payload.cerrado = formData.get('cerrado') === 'on'
      if (!editItem) {
        const now = new Date()
        payload.fecha_inicio = payload.fecha_inicio || `${now.getFullYear()}-01-01`
        payload.fecha_fin = payload.fecha_fin || `${now.getFullYear()}-12-31`
      }
    }

    payload.activo = true 

    const res = await saveCatalogItemAction(tableMapping[activeTab], payload)
    if (!res.success) {
      showAlert(res.error ?? 'No se pudo guardar.')
    } else {
      setIsModalOpen(false)
      await loadData()
    }
    setSaving(false)
  }

  const actionStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '4px'
  }

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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.trabajadores.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.correo ?? '-'}</td>
                  <td>{item.telefono ?? '-'}</td>
                  <td>
                    <button style={actionStyle} onClick={() => handleEdit(item)}>Editar</button>
                    <button style={{...actionStyle, color: '#ef4444'}} onClick={() => handleDelete(item.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {catalogs.trabajadores.length === 0 && (
                <tr><td colSpan={4} className={styles.empty}>No hay registros</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'teams':
      case 'agrupadores':
      case 'estadosTarea':
        const collectionMap: Record<string, any[]> = {
          teams: catalogs.teams,
          agrupadores: catalogs.agrupadores,
          estadosTarea: catalogs.estadosTarea
        }
        const collection = collectionMap[activeTab] || []
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {collection.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>
                    <button style={actionStyle} onClick={() => handleEdit(item)}>Editar</button>
                    <button style={{...actionStyle, color: '#ef4444'}} onClick={() => handleDelete(item.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {collection.length === 0 && (
                <tr><td colSpan={2} className={styles.empty}>No hay registros</td></tr>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.solicitantes.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.horas_maximas_estimadas ?? '-'}</td>
                  <td>
                    <button style={actionStyle} onClick={() => handleEdit(item)}>Editar</button>
                    <button style={{...actionStyle, color: '#ef4444'}} onClick={() => handleDelete(item.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {catalogs.solicitantes.length === 0 && (
                <tr><td colSpan={3} className={styles.empty}>No hay registros</td></tr>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.proyectos.map(item => {
                const agrupador = catalogs.agrupadores.find(a => a.id === item.agrupador_id)
                return (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{agrupador?.nombre ?? 'Desconocido'}</td>
                    <td>
                      <button style={actionStyle} onClick={() => handleEdit(item)}>Editar</button>
                      <button style={{...actionStyle, color: '#ef4444'}} onClick={() => handleDelete(item.id)}>Eliminar</button>
                    </td>
                  </tr>
                )
              })}
              {catalogs.proyectos.length === 0 && (
                <tr><td colSpan={3} className={styles.empty}>No hay registros</td></tr>
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
                <th>Acciones</th>
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
                  <td>
                    <button style={actionStyle} onClick={() => handleEdit(item)}>Editar</button>
                    <button style={{...actionStyle, color: '#ef4444'}} onClick={() => handleDelete(item.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {catalogs.periodos.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>No hay registros</td></tr>
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
        <button className={styles.btnNuevo} onClick={handleCreate}>
          + Nuevo {tabs.find(t => t.key === activeTab)?.label}
        </button>
      </div>

      {isModalOpen && (
        <div style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '18px', width: '400px', padding: '24px', position: 'relative' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#111827' }}>
              {editItem ? 'Editar' : 'Nuevo'} {tabs.find(t => t.key === activeTab)?.label}
            </h3>
            
            <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeTab !== 'periodos' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Nombre</label>
                  <input name="nombre" defaultValue={editItem?.nombre} required style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              )}

              {activeTab === 'trabajadores' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Correo</label>
                    <input type="email" name="correo" defaultValue={editItem?.correo} style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Teléfono</label>
                    <input name="telefono" defaultValue={editItem?.telefono} style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}

              {activeTab === 'solicitantes' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Horas Max. Estimadas</label>
                  <input type="number" step="0.5" name="horas_maximas_estimadas" defaultValue={editItem?.horas_maximas_estimadas} style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              )}

              {activeTab === 'proyectos' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Agrupador</label>
                  <select name="agrupador_id" required defaultValue={editItem?.agrupador_id} style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="">Seleccionar agrupador</option>
                    {catalogs?.agrupadores.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'periodos' && (
                <>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Año</label>
                      <input type="number" name="anio" required defaultValue={editItem?.anio || new Date().getFullYear()} style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Mes</label>
                      <input type="number" name="mes" min="1" max="12" required defaultValue={editItem?.mes || new Date().getMonth() + 1} style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Fecha Inicio</label>
                    <input type="date" name="fecha_inicio" defaultValue={editItem?.fecha_inicio} style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Fecha Fin</label>
                    <input type="date" name="fecha_fin" defaultValue={editItem?.fecha_fin} style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <input type="checkbox" name="cerrado" defaultChecked={editItem?.cerrado} id="cerrado-check" style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="cerrado-check" style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Período Cerrado</label>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ height: '40px', padding: '0 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ height: '40px', padding: '0 16px', borderRadius: '8px', border: 'none', background: '#111827', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      <AlertModal 
        isOpen={alertOpen} 
        message={alertMessage} 
        onClose={() => setAlertOpen(false)} 
      />
      
      <ConfirmModal 
        isOpen={confirmOpen} 
        message={confirmConfig?.message ?? ''} 
        onConfirm={() => {
          if (confirmConfig?.action) confirmConfig.action()
        }} 
        onCancel={() => setConfirmOpen(false)} 
      />
    </div>
  )
}
