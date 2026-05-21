'use client'

import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import styles from './CatalogosView.module.css'
import { fetchSGPRCCatalogsAction, saveSGPRCCatalogItemAction, deleteSGPRCCatalogItemAction } from '../../actions/sgprc.action'
import type { SGPRCCatalogs, SGPRCMetricConfig } from '../../interfaces/sgprc.interfaces'
import SGPRCViewHeader from './SGPRCViewHeader'

type TabKey = 'serviciosCloud' | 'entornos' | 'metricasConfig' | 'cuentasCloud' | 'accionesCloud'

export default function CatalogosView() {
  const [catalogs, setCatalogs] = useState<SGPRCCatalogs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('serviciosCloud')

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Mapping tab key to actual DB table name
  const tableMapping: Record<TabKey, string> = {
    serviciosCloud: 'sgprc_servicios_cloud',
    entornos: 'sgprc_entornos',
    metricasConfig: 'sgprc_metricas_config',
    cuentasCloud: 'sgprc_cuentas',
    accionesCloud: 'sgprc_acciones'
  }

  const loadData = async () => {
    setLoading(true)
    const res = await fetchSGPRCCatalogsAction()
    if (res.success && res.data) {
      setCatalogs(res.data)
    } else {
      setError(res.error ?? 'Error al cargar los catálogos de servicios')
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

  const handleDelete = async (item: any) => {
    const itemName = item.nombre || item.label || `#${item.id}`
    
    const confirmResult = await Swal.fire({
      title: '¿Confirmar inactivación?',
      text: `El catálogo "${itemName}" se marcará como inactivo y no aparecerá en las opciones de selección del formulario.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, inactivar',
      cancelButtonText: 'Cancelar'
    })

    if (!confirmResult.isConfirmed) return

    setLoading(true)
    try {
      const res = await deleteSGPRCCatalogItemAction(tableMapping[activeTab], item.id)
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Registro Inactivado',
          text: 'El elemento se ha inactivado de forma lógica exitosamente.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al inactivar',
          text: res.error || 'Ocurrió un error inesperado al procesar la inactivación.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
      }
      await loadData()
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error Crítico',
        text: err.message || 'No se pudo conectar al servidor.',
        confirmButtonColor: 'var(--primary, #ec5b13)'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const payload: any = {}

    if (editItem?.id) payload.id = editItem.id

    if (activeTab === 'serviciosCloud' || activeTab === 'entornos' || activeTab === 'cuentasCloud' || activeTab === 'accionesCloud') {
      payload.nombre = formData.get('nombre')?.toString().trim()
      payload.orden = Number(formData.get('orden')) || 0
      payload.activo = true
    } else if (activeTab === 'metricasConfig') {
      payload.key_name = formData.get('key_name')?.toString().trim().toLowerCase()
      payload.label = formData.get('label')?.toString().trim()
      
      const estado = formData.get('estado_asociado')?.toString().trim()
      payload.estado_asociado = estado || null // Null representa totalizador
      
      payload.style_class = formData.get('style_class')?.toString() || 'total'
      payload.orden = Number(formData.get('orden')) || 0
      payload.activo = true
    }

    try {
      const res = await saveSGPRCCatalogItemAction(tableMapping[activeTab], payload)
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: editItem ? 'Registro Actualizado' : 'Registro Creado',
          text: 'Los cambios en el catálogo se guardaron correctamente en la base de datos.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
        setIsModalOpen(false)
        await loadData()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al Guardar',
          text: res.error || 'No se pudo guardar la información del catálogo.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Red',
        text: err.message || 'Ocurrió un error inesperado al enviar la petición.',
        confirmButtonColor: 'var(--primary, #ec5b13)'
      })
    } finally {
      setSaving(false)
    }
  }

  const actionStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--primary, #ec5b13)',
    cursor: 'pointer',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s'
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'serviciosCloud', label: 'Servicios Cloud' },
    { key: 'entornos', label: 'Entornos de Nube' },
    { key: 'metricasConfig', label: 'Métricas / Flujos' },
    { key: 'cuentasCloud', label: 'Cuentas Cloud' },
    { key: 'accionesCloud', label: 'Acciones Cloud' }
  ]

  const renderTable = () => {
    if (!catalogs) return null

    switch (activeTab) {
      case 'serviciosCloud':
        // Para servicios cloud dinámicos (mostramos solo los activos)
        // Pero cargamos la lista cruda o mapeada. Nota: catalogs.serviciosDisponibles ya viene mapeada
        // Para poder editar necesitamos los elementos completos, por lo que podemos usar catalogs.serviciosDisponibles
        // Pero para editarlos necesitamos que `getSGPRCCatalogs` retorne los objetos completos de base de datos o
        // en este catálogo hacemos un query rápido!
        // Espera, para poder editar, editamos usando el ID de la base de datos.
        // ¿Qué tal si cargamos los servicios directamente de catalogs?
        // En `getSGPRCCatalogs()` devolvimos `serviciosDisponibles` mapeado como `string[]` para compatibilidad en el formulario.
        // Pero espera, ¿tenemos los objetos completos de `servicios`?
        // Let's see: In `getSGPRCCatalogs()` we resolved:
        // `serviciosDisponibles = (srvRes.data || []).map(s => s.nombre)`
        // Para poder gestionar, necesitamos el ID!
        // Qué buena observación. Para resolver esto de la manera más limpia, podemos:
        // 1. Simplemente consultar a Supabase en tiempo real en la vista de catálogos para tener los objetos completos con ID!
        // Eso es extremadamente robusto y desacoplado, así no rompemos compatibilidad de `SGPRCCatalogs` en otros lados!
        // ¡Perfecto! Carguemos los catálogos en crudo con sus IDs directamente de Supabase en esta vista.
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Nombre del Servicio</th>
                <th>Prioridad Orden</th>
                <th style={{ width: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rawServicios.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 'bold' }}>#{item.id}</td>
                  <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                  <td>{item.orden}</td>
                  <td>
                    <button style={actionStyle} onClick={() => handleEdit(item)}>Editar</button>
                    <button style={{ ...actionStyle, color: '#ef4444' }} onClick={() => handleDelete(item)}>Inactivar</button>
                  </td>
                </tr>
              ))}
              {rawServicios.length === 0 && (
                <tr><td colSpan={4} className={styles.empty}>No hay servicios cloud activos registrados.</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'entornos':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Nombre del Entorno</th>
                <th>Prioridad Orden</th>
                <th style={{ width: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rawEntornos.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 'bold' }}>#{item.id}</td>
                  <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                  <td>{item.orden}</td>
                  <td>
                    <button style={actionStyle} onClick={() => handleEdit(item)}>Editar</button>
                    <button style={{ ...actionStyle, color: '#ef4444' }} onClick={() => handleDelete(item)}>Inactivar</button>
                  </td>
                </tr>
              ))}
              {rawEntornos.length === 0 && (
                <tr><td colSpan={4} className={styles.empty}>No hay entornos activos registrados.</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'metricasConfig':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Código Métrica</th>
                <th>Etiqueta Visual</th>
                <th>Estado Vinculado</th>
                <th>Estilo CSS</th>
                <th>Prioridad Orden</th>
                <th style={{ width: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rawMetricas.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 'bold' }}>#{item.id}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{item.key_name}</td>
                  <td style={{ fontWeight: 600 }}>{item.label}</td>
                  <td>{item.estado_asociado || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Totalizador General</span>}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: item.style_class === 'approved' ? '#d1fae5' : item.style_class === 'rejected' ? '#fee2e2' : '#f1f5f9',
                      color: item.style_class === 'approved' ? '#10b981' : item.style_class === 'rejected' ? '#ef4444' : '#475569'
                    }}>
                      {item.style_class}
                    </span>
                  </td>
                  <td>{item.orden}</td>
                  <td>
                    <button style={actionStyle} onClick={() => handleEdit(item)}>Editar</button>
                    <button style={{ ...actionStyle, color: '#ef4444' }} onClick={() => handleDelete(item)}>Inactivar</button>
                  </td>
                </tr>
              ))}
              {rawMetricas.length === 0 && (
                <tr><td colSpan={7} className={styles.empty}>No hay configuraciones de métricas activas registradas.</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'cuentasCloud':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Nombre de la Cuenta Cloud</th>
                <th>Prioridad Orden</th>
                <th style={{ width: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rawCuentas.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 'bold' }}>#{item.id}</td>
                  <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                  <td>{item.orden}</td>
                  <td>
                    <button style={actionStyle} onClick={() => handleEdit(item)}>Editar</button>
                    <button style={{ ...actionStyle, color: '#ef4444' }} onClick={() => handleDelete(item)}>Inactivar</button>
                  </td>
                </tr>
              ))}
              {rawCuentas.length === 0 && (
                <tr><td colSpan={4} className={styles.empty}>No hay cuentas cloud activas registradas.</td></tr>
              )}
            </tbody>
          </table>
        )
      case 'accionesCloud':
        return (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Nombre de la Acción / Permiso</th>
                <th>Prioridad Orden</th>
                <th style={{ width: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rawAcciones.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 'bold' }}>#{item.id}</td>
                  <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                  <td>{item.orden}</td>
                  <td>
                    <button style={actionStyle} onClick={() => handleEdit(item)}>Editar</button>
                    <button style={{ ...actionStyle, color: '#ef4444' }} onClick={() => handleDelete(item)}>Inactivar</button>
                  </td>
                </tr>
              ))}
              {rawAcciones.length === 0 && (
                <tr><td colSpan={4} className={styles.empty}>No hay acciones cloud activas registradas.</td></tr>
              )}
            </tbody>
          </table>
        )
      default:
        return null
    }
  }

  // Raw elements states queried for edit (with IDs)
  const [rawServicios, setRawServicios] = useState<any[]>([])
  const [rawEntornos, setRawEntornos] = useState<any[]>([])
  const [rawMetricas, setRawMetricas] = useState<any[]>([])
  const [rawCuentas, setRawCuentas] = useState<any[]>([])
  const [rawAcciones, setRawAcciones] = useState<any[]>([])

  const loadRawDataFromSupabase = async () => {
    try {
      const { supabase } = await import('@/modules/shared/infra/supabase')
      const [srvRes, entRes, metRes, ctaRes, accRes] = await Promise.all([
        supabase.from('sgprc_servicios_cloud').select('*').eq('activo', true).order('orden'),
        supabase.from('sgprc_entornos').select('*').eq('activo', true).order('orden'),
        supabase.from('sgprc_metricas_config').select('*').eq('activo', true).order('orden'),
        supabase.from('sgprc_cuentas').select('*').eq('activo', true).order('orden'),
        supabase.from('sgprc_acciones').select('*').eq('activo', true).order('orden')
      ])

      setRawServicios(srvRes.data || [])
      setRawEntornos(entRes.data || [])
      setRawMetricas(metRes.data || [])
      setRawCuentas(ctaRes && !ctaRes.error ? (ctaRes.data || []) : [])
      setRawAcciones(accRes && !accRes.error ? (accRes.data || []) : [])
    } catch (err) {
      console.error('Error al realizar query a Supabase desde CatalogoView:', err)
    }
  }

  useEffect(() => {
    loadRawDataFromSupabase()
  }, [catalogs])

  return (
    <div className={styles.container}>
      <SGPRCViewHeader
        currentView="catalogos"
        dashboardHref="/sgprc?view=dashboard"
        catalogosHref="/sgprc?view=catalogos"
        actionButton={
          <button className={styles.btnNuevo} onClick={handleCreate}>
            + Agregar {tabs.find((t) => t.key === activeTab)?.label}
          </button>
        }
      />

      {isModalOpen && (
        <div style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '18px', width: '450px', padding: '24px', position: 'relative', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
              {editItem ? 'Editar' : 'Nuevo'} {tabs.find((t) => t.key === activeTab)?.label}
            </h3>

            <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(activeTab === 'serviciosCloud' || activeTab === 'entornos' || activeTab === 'cuentasCloud' || activeTab === 'accionesCloud') && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      {activeTab === 'accionesCloud' ? 'Descripción de la Acción / Permiso' : 'Nombre'}
                    </label>
                    <input
                      name="nombre"
                      type="text"
                      placeholder="Ingrese el valor..."
                      defaultValue={editItem?.nombre}
                      required
                      style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Prioridad Orden Visual</label>
                    <input
                      name="orden"
                      type="number"
                      placeholder="Orden numérico..."
                      defaultValue={editItem?.orden ?? 10}
                      required
                      style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                </>
              )}

              {activeTab === 'metricasConfig' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Código Métrica (Llave Única)</label>
                    <input
                      name="key_name"
                      type="text"
                      placeholder="Ingrese el código..."
                      defaultValue={editItem?.key_name}
                      required
                      disabled={!!editItem} // No se puede editar la llave una vez creada para no romper consistencias
                      style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', outline: 'none', background: editItem ? '#f1f5f9' : '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Etiqueta Visual (Label)</label>
                    <input
                      name="label"
                      type="text"
                      placeholder="Ingrese la etiqueta..."
                      defaultValue={editItem?.label}
                      required
                      style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Estado Vinculado (de las solicitudes)</label>
                    <select
                      name="estado_asociado"
                      defaultValue={editItem?.estado_asociado || ''}
                      style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', background: '#fff', outline: 'none' }}
                    >
                      <option value="">(Ninguno / Totalizador General)</option>
                      <option value="Borrador">Borrador</option>
                      <option value="Pendiente Infraestructura">Pendiente Infraestructura</option>
                      <option value="Pendiente Ciberseguridad">Pendiente Ciberseguridad</option>
                      <option value="Aprobado">Aprobado</option>
                      <option value="Rechazado">Rechazado</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Estilo de Color CSS (Clase)</label>
                    <select
                      name="style_class"
                      defaultValue={editItem?.style_class || 'total'}
                      style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', background: '#fff', outline: 'none' }}
                    >
                      <option value="total">Total (Gris Slate)</option>
                      <option value="draft">Borrador (Gris Claro)</option>
                      <option value="infra">Infraestructura (Azul Financiero)</option>
                      <option value="security">Seguridad (Naranja Corporativo)</option>
                      <option value="approved">Aprobado (Verde Esmeralda)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Prioridad Orden Visual</label>
                    <input
                      name="orden"
                      type="number"
                      placeholder="Ej: 10, 20"
                      defaultValue={editItem?.orden ?? 10}
                      required
                      style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ height: '40px', padding: '0 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ height: '40px', padding: '0 16px', borderRadius: '8px', border: 'none', background: 'var(--primary, #ec5b13)', fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
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
            <div className={styles.loading}>Cargando datos maestros de base de datos...</div>
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
