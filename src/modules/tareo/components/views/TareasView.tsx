'use client'

import { useEffect, useState } from 'react'
import {
  fetchTareoCatalogsAction,
  listTareasAction,
  getTareaByIdAction,
  saveTareaAction
} from '../../actions/tareo.action'
import type {
  TareaPeriodoListItem,
  TareoCatalogs,
  TareaFormData
} from '../../interfaces/tareo.interfaces'
import TareaModal from '../TareaModal'
import styles from './CatalogosView.module.css'

export default function TareasView() {
  const [tasks, setTasks] = useState<TareaPeriodoListItem[]>([])
  const [catalogs, setCatalogs] = useState<TareoCatalogs | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TareaFormData | null>(null)
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(null)

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
      alert("Por favor selecciona un período primero.")
      return
    }
    setSelectedTask(null)
    setIsModalOpen(true)
  }

  const handleEdit = async (tareaPeriodo: TareaPeriodoListItem) => {
    const res = await getTareaByIdAction(tareaPeriodo.tarea_periodo_id)
    if (!res.success || !res.data) {
      alert(res.error ?? 'Error cargando tarea')
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
                {tasks.map(t => (
                  <tr key={t.tarea_periodo_id}>
                    <td style={{ fontWeight: 600 }}>{t.tarea_nombre}</td>
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
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      No hay tareas registradas para este período.
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
    </div>
  )
}
