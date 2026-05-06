'use client'

import { useEffect, useState } from 'react'
import {
  fetchTareoCatalogsAction,
  listTareasAction,
  getTareaByIdAction,
  saveTareaAction,
  toggleTareaActivoAction,
  ejecutarArrastreMensualAction
} from '../../actions/tareo.action'
import type {
  TareaPeriodoListItem,
  TareoCatalogs,
  TareaFormData
} from '../../interfaces/tareo.interfaces'
import TareaModal from '../TareaModal'
import TareaHistorialModal from '../TareaHistorialModal'
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
  const [confirmConfig, setConfirmConfig] = useState<{ message: string, action: () => void } | null>(null)

  // Historial Modal
  const [historialOpen, setHistorialOpen] = useState(false)
  const [historialTarea, setHistorialTarea] = useState<{ id: number; nombre: string } | null>(null)

  // Arrastre mensual manual
  const [rolloverLoading, setRolloverLoading] = useState(false)
  const [rolloverResult, setRolloverResult] = useState<{
    tareas_arrastradas: number
    periodo_origen_id: number | null
    periodo_destino_id: number | null
    mensaje: string
  } | null>(null)
  const [rolloverConfirmOpen, setRolloverConfirmOpen] = useState(false)

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

  const handleArrastreMensual = async () => {
    setRolloverConfirmOpen(false)
    setRolloverLoading(true)
    setRolloverResult(null)
    try {
      const res = await ejecutarArrastreMensualAction()
      if (!res.success) {
        showAlert(res.error ?? 'Error al ejecutar el arrastre mensual')
      } else {
        setRolloverResult(res.data ?? null)
        await loadData(selectedPeriodoId)
      }
    } catch (err: any) {
      showAlert(err?.message ?? 'Error inesperado')
    } finally {
      setRolloverLoading(false)
    }
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

          {/* Botón de Arrastre Mensual Manual */}
          <button
            onClick={() => setRolloverConfirmOpen(true)}
            disabled={rolloverLoading}
            title="Arrastra automáticamente las tareas con horas disponibles al período actual"
            style={{
              height: '40px',
              padding: '0 18px',
              borderRadius: '10px',
              border: '1.5px solid #7c3aed',
              background: rolloverLoading ? '#ede9fe' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: rolloverLoading ? '#7c3aed' : '#fff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: rolloverLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: '0.2s',
              boxShadow: rolloverLoading ? 'none' : '0 2px 8px rgba(124,58,237,0.25)'
            }}
          >
            {rolloverLoading ? (
              <>
                <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Procesando...
              </>
            ) : (
              <>Arrastre Mensual</>
            )}
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

      {/* Resultado del arrastre mensual */}
      {rolloverResult && (
        <div style={{
          background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
          border: '1.5px solid #7c3aed',
          borderRadius: '14px',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#5b21b6', fontSize: '15px' }}>
              ✅ Arrastre Mensual Completado
            </p>
            <p style={{ margin: '4px 0 0', color: '#6d28d9', fontSize: '13px' }}>
              {rolloverResult.mensaje}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#7c3aed' }}>
                {rolloverResult.tareas_arrastradas}
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: '#8b5cf6', fontWeight: 600 }}>TAREAS ARRASTRADAS</p>
            </div>
          </div>
          <button
            onClick={() => setRolloverResult(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: '18px', fontWeight: 700, lineHeight: 1 }}
            title="Cerrar"
          >×</button>
        </div>
      )}

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
                          onClick={() => { setHistorialTarea({ id: t.tarea_id, nombre: t.tarea_nombre }); setHistorialOpen(true) }}
                          title="Ver historial de días trabajados"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#7c3aed',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontWeight: 600,
                            borderRadius: '4px',
                            transition: '0.2s',
                            fontSize: '13px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f3ff'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          Historial
                        </button>
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

      <TareaHistorialModal
        isOpen={historialOpen}
        onClose={() => { setHistorialOpen(false); setHistorialTarea(null) }}
        tareaId={historialTarea?.id ?? null}
        tareaNombre={historialTarea?.nombre ?? ''}
      />

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

      {/* Modal de confirmación para el arrastre mensual */}
      {rolloverConfirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '32px 36px',
            maxWidth: '480px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}></div>
            <h3 style={{ margin: '0 0 12px', color: '#1f2937', fontSize: '20px' }}>
              Ejecutar Arrastre Mensual
            </h3>
            <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>
              Esta acción tomará todas las tareas con <strong>horas disponibles &gt; 0</strong> del período
              anterior y las arrastrará al período actual con sus horas de arrastre correspondientes.
              El período anterior quedará <strong>cerrado</strong> automáticamente.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setRolloverConfirmOpen(false)}
                style={{
                  padding: '10px 24px', borderRadius: '10px', border: '1.5px solid #e5e7eb',
                  background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleArrastreMensual}
                style={{
                  padding: '10px 24px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: '#fff', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(124,58,237,0.35)'
                }}
              >
                ✓ Confirmar Arrastre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animación de spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
