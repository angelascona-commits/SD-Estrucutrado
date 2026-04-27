'use client'

import { useEffect, useState } from 'react'
import {
  fetchTareoCatalogsAction,
  listTareasAction,
  getTareaByIdAction,
  saveTareaAction,
  toggleTareaActivoAction
} from '../../actions/tareo.action'
import type {
  TareaPeriodoListItem,
  TareoCatalogs,
  TareaFormData
} from '../../interfaces/tareo.interfaces'
import TareaModal from '../TareaModal'
import { AlertModal, ConfirmModal } from '../FeedbackModals'
import styles from './CatalogosView.module.css'

export default function TareasView() {
  const [tasks, setTasks] = useState<TareaPeriodoListItem[]>([])
  const [catalogs, setCatalogs] = useState<TareoCatalogs | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TareaFormData | null>(null)
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(null)

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

  const [showArchived, setShowArchived] = useState(false)
  const [estadoFilter, setEstadoFilter] = useState<string>('')
  const [horasFilter, setHorasFilter] = useState<string>('Todas')

  const loadData = async (periodoId?: number | null) => {
    setLoading(true)
    setError(null)

    try {
      const [catalogsRes, tasksRes] = await Promise.all([
        fetchTareoCatalogsAction(),
        listTareasAction(periodoId ? { periodo_id: periodoId } : undefined)
      ])

      if (!catalogsRes.success || !catalogsRes.data) {
        throw new Error(catalogsRes.error ?? 'Error cargando catálogos')
      }

      const pCatalogs = catalogsRes.data
      setCatalogs(pCatalogs)

      if (!periodoId && pCatalogs.periodos.length > 0) {
        setSelectedPeriodoId(pCatalogs.periodos[0].id)
      }

      if (!tasksRes.success) {
        throw new Error(tasksRes.error ?? 'Error cargando tareas')
      }

      setTasks(tasksRes.data ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (selectedPeriodoId !== null) {
      void loadData(selectedPeriodoId)
    }
  }, [selectedPeriodoId])

  const handleCreate = () => {
    if (!selectedPeriodoId) {
      showAlert("Por favor selecciona un período primero.")
      return
    }
    setSelectedTask(null)
    setIsModalOpen(true)
  }

  const handleEdit = async (tareaPeriodo: TareaPeriodoListItem) => {
    const res = await getTareaByIdAction(tareaPeriodo.tarea_periodo_id)
    if (!res.success || !res.data) {
      showAlert(res.error ?? 'Error cargando tarea')
      return
    }

    const t = res.data;
    setSelectedTask({
      id: t.tarea_periodo_id,
      periodo_id: t.periodo_id,
      nombre: t.tarea_nombre,
      proyecto_id: t.proyecto_id,
      team_id: t.team_id,
      solicitante_id: t.solicitante_id,
      estado_id: t.estado_id,
      horas_historicas_arrastre: t.horas_historicas_arrastre,
      horas_asignadas_periodo: t.horas_asignadas_periodo,
      comentario_periodo: t.comentario_periodo ?? '',
      comentario_dm: t.comentario_dm ?? '',
      activo: t.activo
    })
    setIsModalOpen(true)
  }

  const handleSave = async (payload: TareaFormData, isEditing: boolean) => {
    const res = await saveTareaAction(payload, isEditing)
    if (!res.success) {
      throw new Error(res.error ?? 'Error guardando tarea')
    }
    await loadData(selectedPeriodoId)
  }

  const handleToggleActivo = async (t: TareaPeriodoListItem) => {
    showConfirm(`¿Deseas ${t.activo ? 'desactivar/archivar' : 'activar'} esta tarea?`, async () => {
      setConfirmOpen(false)
      setLoading(true)
      const res = await toggleTareaActivoAction(t.tarea_id, !t.activo)
      if (!res.success) {
        showAlert(res.error ?? 'Error cambiando estado de la tarea')
        setLoading(false)
        return
      }
      await loadData(selectedPeriodoId)
    })
  }

  const filteredTasks = tasks.filter(t => {
    if (showArchived ? t.activo : !t.activo) return false;
    
    if (estadoFilter && t.estado_nombre !== estadoFilter) return false;

    if (horasFilter === 'ConHoras' && t.horas_disponibles_periodo <= 0) return false;
    if (horasFilter === 'SinHoras' && t.horas_disponibles_periodo > 0) return false;

    return true;
  })

  // get unique states for filter
  const uniqueStates = Array.from(new Set(tasks.map(t => t.estado_nombre))).filter(Boolean)

  const buildPeriodoLabel = (periodo: any) => {
    const month = `${periodo.mes}`.padStart(2, '0')
    return `${periodo.anio}-${month}${periodo.cerrado ? ' · Cerrado' : ''}`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Gestión de Tareas</h2>
          <p className={styles.subtitle}>
            Administración completa de tareas, definición de horas y control de seguimiento por período.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {catalogs && (
            <select
              value={selectedPeriodoId ?? ''}
              onChange={(e) => setSelectedPeriodoId(e.target.value ? Number(e.target.value) : null)}
              style={{
                height: '40px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                padding: '0 12px',
                background: '#ffffff',
                fontWeight: 600,
                color: '#374151',
                outline: 'none'
              }}
            >
              {catalogs.periodos.map((periodo) => (
                <option key={periodo.id} value={periodo.id}>
                  {buildPeriodoLabel(periodo)}
                </option>
              ))}
            </select>
          )}

          <button className={styles.btnNuevo} onClick={handleCreate}>
            + Nueva Tarea
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
          <button 
            type="button"
            onClick={() => setShowArchived(false)}
            style={{ 
              background: !showArchived ? '#e0f2fe' : '#f3f4f6', 
              color: !showArchived ? '#0369a1' : '#4b5563',
              border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: '0.2s'
            }}
          >
            Tareas Activas
          </button>
          <button 
            type="button"
            onClick={() => setShowArchived(true)}
            style={{ 
              background: showArchived ? '#fee2e2' : '#f3f4f6', 
              color: showArchived ? '#b91c1c' : '#4b5563',
              border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: '0.2s'
            }}
          >
            Archivo (Inactivas)
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={estadoFilter} 
            onChange={e => setEstadoFilter(e.target.value)}
            style={{ height: '36px', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '0 10px', outline: 'none', color: '#374151', fontSize: '13px' }}
          >
            <option value="">Todos los Estados</option>
            {uniqueStates.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          
          <select 
            value={horasFilter} 
            onChange={e => setHorasFilter(e.target.value)}
            style={{ height: '36px', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '0 10px', outline: 'none', color: '#374151', fontSize: '13px' }}
          >
            <option value="Todas">Todas las Horas</option>
            <option value="ConHoras">Disponibles {`>`} 0</option>
            <option value="SinHoras">Agotadas {`<=`} 0</option>
          </select>
        </div>
      </div>

      <div className={styles.content} style={{ minHeight: 'auto' }}>
        {loading ? (
          <div className={styles.loading}>Cargando tareas...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Proyecto / Agrupador</th>
                  <th>Solicitante</th>
                  <th>Horas Asignadas</th>
                  <th>Horas Consumidas</th>
                  <th>Horas Disponibles</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(t => (
                  <tr key={t.tarea_periodo_id} style={{ opacity: showArchived ? 0.7 : 1 }}>
                    <td style={{ fontWeight: 600 }}>
                      {t.tarea_nombre}
                      {showArchived && <span style={{ fontSize: '10px', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Inactiva</span>}
                    </td>
                    <td>
                      <div>{t.proyecto_nombre}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {t.agrupador_nombre}
                      </div>
                    </td>
                    <td>{t.solicitante_nombre}</td>
                    <td style={{ textAlign: 'center' }}>{t.horas_asignadas_periodo}</td>
                    <td style={{ textAlign: 'center' }}>{t.horas_consumidas_periodo}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: t.horas_disponibles_periodo < 0 ? '#ef4444' : '#10b981' }}>
                      {t.horas_disponibles_periodo}
                    </td>
                    <td>
                      <span style={{
                        background: t.estado_nombre.toLowerCase() === 'completado' ? '#d1fae5' : '#f3f4f6',
                        color: t.estado_nombre.toLowerCase() === 'completado' ? '#065f46' : '#374151',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {t.estado_nombre}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleToggleActivo(t)}
                          title={t.activo ? "Desactivar/Archivar Tarea" : "Reactivar Tarea"}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: t.activo ? '#ef4444' : '#10b981',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontWeight: 600,
                            borderRadius: '4px',
                            transition: '0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = t.activo ? '#fee2e2' : '#d1fae5'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {t.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button 
                          onClick={() => handleEdit(t)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#2563eb',
                            cursor: 'pointer',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      No hay tareas {showArchived ? 'inactivas' : 'activas'} que coincidan con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TareaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        tarea={selectedTask}
        periodos={catalogs?.periodos ?? []}
        proyectos={catalogs?.proyectos ?? []}
        agrupadores={catalogs?.agrupadores ?? []}
        solicitantes={catalogs?.solicitantes ?? []}
        teams={catalogs?.teams ?? []}
        estadosTarea={catalogs?.estadosTarea ?? []}
      />

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
