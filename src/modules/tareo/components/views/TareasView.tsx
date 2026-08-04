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
    // Devuelve el ID para que TareaModal pueda guardar el registro rápido
    return res.data ?? undefined
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

        <div className={styles.headerControls}>
          {catalogs && (
            <select
              value={selectedPeriodoId ?? ''}
              onChange={(e) => setSelectedPeriodoId(e.target.value ? Number(e.target.value) : null)}
              className={styles.periodoSelect}
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
            className={rolloverLoading ? styles.rolloverBtnLoading : styles.rolloverBtn}
          >
            {rolloverLoading ? (
              <>
                <span className={styles.spinner} />
                Procesando...
              </>
            ) : (
              <>Arrastre Mensual</>
            )}
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterBarGroup}>
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className={!showArchived ? styles.tabBtnActiveBlue : styles.tabBtnInactiveGray}
          >
            Tareas Activas
          </button>
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className={showArchived ? styles.tabBtnActiveRed : styles.tabBtnInactiveGray}
          >
            Archivo (Inactivas)
          </button>
        </div>

        <div className={styles.actionRow}>
          <select
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Todos los Estados</option>
            {uniqueStates.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            value={horasFilter}
            onChange={e => setHorasFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="Todas">Todas las Horas</option>
            <option value="ConHoras">Disponibles {`>`} 0</option>
            <option value="SinHoras">Agotadas {`<=`} 0</option>
          </select>
        </div>
      </div>

      {/* Resultado del arrastre mensual */}
      {rolloverResult && (
        <div className={styles.rolloverBanner}>
          <div>
            <p className={styles.rolloverBannerTitle}>
              ✅ Arrastre Mensual Completado
            </p>
            <p className={styles.rolloverBannerSubtitle}>
              {rolloverResult.mensaje}
            </p>
          </div>
          <div className={styles.rolloverBannerStat}>
            <div className={styles.rolloverStatBox}>
              <p className={styles.rolloverStatVal}>
                {rolloverResult.tareas_arrastradas}
              </p>
              <p className={styles.rolloverStatLbl}>TAREAS ARRASTRADAS</p>
            </div>
          </div>
          <button
            onClick={() => setRolloverResult(null)}
            className={styles.rolloverCloseBtn}
            title="Cerrar"
          >×</button>
        </div>
      )}

      <div className={styles.content}>
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
                  <th>Horas Asignadas (Totales)</th>
                  <th>Horas Consumidas (Totales)</th>
                  <th>Horas Disponibles</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(t => {
                  const totalAsignadas = (t.horas_historicas_arrastre || 0) + (t.horas_asignadas_periodo || 0)
                  const hasArrastre = (t.horas_historicas_arrastre || 0) > 0

                  return (
                    <tr key={t.tarea_periodo_id} style={{ opacity: showArchived ? 0.7 : 1 }}>
                      <td className={styles.valAsignadas}>
                        {t.tarea_nombre}
                        {showArchived && <span className={styles.inactiveBadge}>Inactiva</span>}
                      </td>
                      <td>
                        <div>{t.proyecto_nombre}</div>
                        <div className={styles.subText}>
                          {t.agrupador_nombre}
                        </div>
                      </td>
                      <td>{t.solicitante_nombre}</td>
                      
                      {/* Horas Asignadas Totales en General */}
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.valAsignadas}>{totalAsignadas} h</div>
                        {hasArrastre && (
                          <div className={styles.valSubDetail}>
                            Período: {t.horas_asignadas_periodo}h
                          </div>
                        )}
                      </td>

                      {/* Horas Consumidas Totales en General */}
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.valConsumidas}>{t.horas_totales_acumuladas} h</div>
                        {hasArrastre && (
                          <div className={styles.valSubDetail}>
                            Período: {t.horas_consumidas_periodo}h
                          </div>
                        )}
                      </td>

                      {/* Horas Disponibles */}
                      <td className={t.horas_disponibles_periodo < 0 ? styles.valDisponiblesOver : styles.valDisponiblesOk}>
                        {t.horas_disponibles_periodo} h
                      </td>

                      <td>
                        <span className={t.estado_nombre.toLowerCase() === 'completado' ? styles.badgeAbierto : styles.tabBtnInactiveGray}>
                          {t.estado_nombre}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionRow}>
                          <button
                            onClick={() => { setHistorialTarea({ id: t.tarea_id, nombre: t.tarea_nombre }); setHistorialOpen(true) }}
                            title="Ver historial de días trabajados"
                            className={styles.btnActionHistorial}
                          >
                            Historial
                          </button>
                          <button
                            onClick={() => handleToggleActivo(t)}
                            title={t.activo ? "Desactivar/Archivar Tarea" : "Reactivar Tarea"}
                            className={t.activo ? styles.btnActionToggleRed : styles.btnActionToggleGreen}
                          >
                            {t.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleEdit(t)}
                            className={styles.btnActionEdit}
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
        trabajadores={catalogs?.trabajadores ?? []}
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
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>
              Ejecutar Arrastre Mensual
            </h3>
            <p className={styles.modalDesc}>
              Esta acción tomará todas las tareas con <strong>horas disponibles &gt; 0</strong> del período
              anterior y las arrastrará al período actual con sus horas de arrastre correspondientes.
              El período anterior quedará <strong>cerrado</strong> automáticamente.
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setRolloverConfirmOpen(false)}
                className={styles.btnCancel}
              >
                Cancelar
              </button>
              <button
                onClick={handleArrastreMensual}
                className={styles.btnConfirmPurple}
              >
                ✓ Confirmar Arrastre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
