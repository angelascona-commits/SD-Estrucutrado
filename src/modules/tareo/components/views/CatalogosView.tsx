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
  | 'areas'

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
    periodos: 'tareo_periodo',
    areas: 'tareo_area'
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
      payload.horas_maximas = Number(formData.get('horas_maximas')) || null
    } else if (activeTab === 'solicitantes') {
      payload.horas_maximas_estimadas = Number(formData.get('horas_maximas_estimadas')) || null
    } else if (activeTab === 'agrupadores') {
      payload.area_id = formData.get('area_id') ? Number(formData.get('area_id')) : null
    } else if (activeTab === 'proyectos') {
      payload.agrupador_id = Number(formData.get('agrupador_id'))
      payload.solicitante_id = formData.get('solicitante_id') ? Number(formData.get('solicitante_id')) : null
      payload.team_id = formData.get('team_id') ? Number(formData.get('team_id')) : null
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

    if (activeTab !== 'periodos') {
      payload.activo = true
    }

    const res = await saveCatalogItemAction(tableMapping[activeTab], payload)
    if (!res.success) {
      showAlert(res.error ?? 'No se pudo guardar.')
    } else {
      setIsModalOpen(false)
      await loadData()
    }
    setSaving(false)
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'trabajadores', label: 'Trabajadores' },
    { key: 'teams', label: 'Teams' },
    { key: 'solicitantes', label: 'Solicitantes' },
    { key: 'areas', label: 'Áreas' },
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
                <th>Horas Máx.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.trabajadores.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.correo ?? '-'}</td>
                  <td>{item.telefono ?? '-'}</td>
                  <td>{item.horas_maximas ?? '-'}</td>
                  <td>
                    <div className={styles.actionRow}>
                      <button className={styles.btnActionEdit} onClick={() => handleEdit(item)}>Editar</button>
                      <button className={styles.btnActionDelete} onClick={() => handleDelete(item.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {catalogs.trabajadores.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>No hay registros</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'teams':
      case 'estadosTarea':
      case 'areas':
        const collectionMap: Record<string, any[]> = {
          teams: catalogs.teams,
          estadosTarea: catalogs.estadosTarea,
          areas: catalogs.areas
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
                    <div className={styles.actionRow}>
                      <button className={styles.btnActionEdit} onClick={() => handleEdit(item)}>Editar</button>
                      <button className={styles.btnActionDelete} onClick={() => handleDelete(item.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {collection.length === 0 && (
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
                <th>Área</th>
                <th>Proyectos Enlazados</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.agrupadores.map(item => {
                const associatedProys = catalogs.proyectos.filter(p => p.agrupador_id === item.id)
                const area = catalogs.areas.find(a => a.id === item.area_id)
                return (
                  <tr key={item.id}>
                    <td className={styles.valAsignadas}>{item.nombre}</td>
                    <td className={styles.subText}>{area?.nombre ?? '-'}</td>
                    <td>
                      <div className={styles.domainGrid}>
                        {associatedProys.map(p => (
                          <span key={p.id} className={styles.chipProject}>
                            {p.nombre}
                          </span>
                        ))}
                        {associatedProys.length === 0 && (
                          <span className={styles.emptyProjects}>
                            Ningún proyecto enlazado
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.actionRow}>
                        <button className={styles.btnActionEdit} onClick={() => handleEdit(item)}>Editar</button>
                        <button className={styles.btnActionDelete} onClick={() => handleDelete(item.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {catalogs.agrupadores.length === 0 && (
                <tr><td colSpan={4} className={styles.empty}>No hay registros</td></tr>
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
                    <div className={styles.actionRow}>
                      <button className={styles.btnActionEdit} onClick={() => handleEdit(item)}>Editar</button>
                      <button className={styles.btnActionDelete} onClick={() => handleDelete(item.id)}>Eliminar</button>
                    </div>
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
                <th>Solicitante</th>
                <th>Team</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {catalogs.proyectos.map(item => {
                const agrupador = catalogs.agrupadores.find(a => a.id === item.agrupador_id)
                const solicitante = catalogs.solicitantes.find(s => s.id === item.solicitante_id)
                const team = catalogs.teams.find(t => t.id === item.team_id)
                return (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{agrupador?.nombre ?? 'Desconocido'}</td>
                    <td>{solicitante?.nombre ?? '-'}</td>
                    <td>{team?.nombre ?? '-'}</td>
                    <td>
                      <div className={styles.actionRow}>
                        <button className={styles.btnActionEdit} onClick={() => handleEdit(item)}>Editar</button>
                        <button className={styles.btnActionDelete} onClick={() => handleDelete(item.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {catalogs.proyectos.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>No hay registros</td></tr>
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
                    <div className={styles.actionRow}>
                      <button className={styles.btnActionEdit} onClick={() => handleEdit(item)}>Editar</button>
                      <button className={styles.btnActionDelete} onClick={() => handleDelete(item.id)}>Eliminar</button>
                    </div>
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
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <h3 className={styles.title} style={{ fontSize: '20px', marginBottom: '16px' }}>
              {editItem ? 'Editar' : 'Nuevo'} {tabs.find(t => t.key === activeTab)?.label}
            </h3>
            
            <form onSubmit={handleSaveForm} className={styles.modalForm}>
              {activeTab !== 'periodos' && (
                <div>
                  <label className={styles.formLabel}>Nombre</label>
                  <input name="nombre" defaultValue={editItem?.nombre} required className={styles.formInput} />
                </div>
              )}

              {activeTab === 'trabajadores' && (
                <>
                  <div>
                    <label className={styles.formLabel}>Correo</label>
                    <input type="email" name="correo" defaultValue={editItem?.correo} className={styles.formInput} />
                  </div>
                  <div>
                    <label className={styles.formLabel}>Teléfono</label>
                    <input name="telefono" defaultValue={editItem?.telefono} className={styles.formInput} />
                  </div>
                  <div>
                    <label className={styles.formLabel}>Horas Máximas / Día</label>
                    <input type="number" step="any" min="0" name="horas_maximas" defaultValue={editItem?.horas_maximas} className={styles.formInput} />
                  </div>
                </>
              )}

              {activeTab === 'solicitantes' && (
                <div>
                  <label className={styles.formLabel}>Horas Max. Estimadas</label>
                  <input type="number" step="any" min="0" name="horas_maximas_estimadas" defaultValue={editItem?.horas_maximas_estimadas} className={styles.formInput} />
                </div>
              )}

              {activeTab === 'agrupadores' && (
                <div>
                  <label className={styles.formLabel}>Área</label>
                  <select name="area_id" required defaultValue={editItem?.area_id} className={styles.formSelect}>
                    <option value="">Seleccionar área</option>
                    {catalogs?.areas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'proyectos' && (
                <>
                  <div>
                    <label className={styles.formLabel}>Agrupador</label>
                    <select name="agrupador_id" required defaultValue={editItem?.agrupador_id} className={styles.formSelect}>
                      <option value="">Seleccionar agrupador</option>
                      {catalogs?.agrupadores.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={styles.formLabel}>Solicitante</label>
                    <select name="solicitante_id" defaultValue={editItem?.solicitante_id || ''} className={styles.formSelect}>
                      <option value="">Seleccionar solicitante</option>
                      {catalogs?.solicitantes.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={styles.formLabel}>Team</label>
                    <select name="team_id" defaultValue={editItem?.team_id || ''} className={styles.formSelect}>
                      <option value="">Seleccionar team</option>
                      {catalogs?.teams.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'periodos' && (
                <>
                  <div className={styles.flexRow}>
                    <div className={styles.flex1}>
                      <label className={styles.formLabel}>Año</label>
                      <input type="number" name="anio" required defaultValue={editItem?.anio || new Date().getFullYear()} className={styles.formInput} />
                    </div>
                    <div className={styles.flex1}>
                      <label className={styles.formLabel}>Mes</label>
                      <input type="number" name="mes" min="1" max="12" required defaultValue={editItem?.mes || new Date().getMonth() + 1} className={styles.formInput} />
                    </div>
                  </div>
                  <div>
                    <label className={styles.formLabel}>Fecha Inicio</label>
                    <input type="date" name="fecha_inicio" defaultValue={editItem?.fecha_inicio} className={styles.formInput} />
                  </div>
                  <div>
                    <label className={styles.formLabel}>Fecha Fin</label>
                    <input type="date" name="fecha_fin" defaultValue={editItem?.fecha_fin} className={styles.formInput} />
                  </div>
                  <div className={styles.checkboxRow}>
                    <input type="checkbox" name="cerrado" defaultChecked={editItem?.cerrado} id="cerrado-check" className={styles.checkboxInput} />
                    <label htmlFor="cerrado-check" className={styles.checkboxLabel}>Período Cerrado</label>
                  </div>
                </>
              )}

              <div className={styles.formFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnCancel}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className={styles.btnSubmit}>
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
