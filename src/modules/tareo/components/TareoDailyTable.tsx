'use client'

import type { RegistroDetalleItem, TareaPeriodoListItem } from '../interfaces/tareo.interfaces'
import styles from '../styles/tareo-daily-table.module.css'

interface TareoDailyTableProps {
  registros: RegistroDetalleItem[]
  loading: boolean
  onEdit: (registro: RegistroDetalleItem) => void
  onDelete: (registro: RegistroDetalleItem) => void
  onEditTask: (tareaPeriodo: TareaPeriodoListItem) => void
}

export default function TareoDailyTable({
  registros,
  loading,
  onEdit,
  onDelete,
  onEditTask
}: TareoDailyTableProps) {
  if (loading) {
    return <div className={styles.loadingBox}>Cargando registros...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Registros del día</h2>
          <p className={styles.subtitle}>Detalle operativo de horas registradas por tarea</p>
        </div>
      </div>

      {registros.length === 0 ? (
        <div className={styles.emptyState}>No hay registros para la fecha seleccionada.</div>
      ) : (
        <div className={styles.cardsGrid}>
          {registros.map((registro) => (
            <div key={registro.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitleBlock}>
                  <span className={styles.taskName}>{registro.tarea_nombre}</span>
                  <span className={styles.hoursBadge}>{registro.horas} h</span>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={() =>
                      onEditTask({
                        tarea_periodo_id: registro.tarea_periodo_id,
                        tarea_id: registro.tarea_id,
                        tarea_nombre: registro.tarea_nombre,
                        team_id: registro.team_id,
                        team_nombre: registro.team_nombre,
                        solicitante_id: registro.solicitante_id,
                        solicitante_nombre: registro.solicitante_nombre,
                        horas_maximas_estimadas: registro.solicitante_horas_maximas_estimadas,
                        proyecto_id: registro.proyecto_id,
                        proyecto_nombre: registro.proyecto_nombre,
                        agrupador_id: registro.agrupador_id,
                        agrupador_nombre: registro.agrupador_nombre,
                        estado_id: 0,
                        estado_nombre: registro.estado_tarea,
                        activo: true,
                        periodo_id: registro.periodo_id,
                        periodo_anio: registro.anio,
                        periodo_mes: registro.mes,
                        periodo_cerrado: registro.cerrado,
                        horas_historicas_arrastre: registro.horas_historicas_arrastre,
                        horas_asignadas_periodo: registro.horas_asignadas_periodo,
                        horas_consumidas_periodo: registro.horas_consumidas_periodo,
                        horas_disponibles_periodo: registro.horas_disponibles_periodo,
                        horas_totales_acumuladas: registro.horas_totales_acumuladas,
                        comentario_periodo: null,
                        comentario_dm: null,
                        created_at: registro.created_at,
                        updated_at: registro.updated_at
                      })
                    }
                    className={styles.secondaryButton}
                  >
                    Editar tarea
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(registro)}
                    className={styles.secondaryButton}
                  >
                    Editar registro
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(registro)}
                    className={styles.dangerButton}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Trabajador</span>
                  <span className={styles.metaValue}>{registro.trabajador_nombre}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Proyecto</span>
                  <span className={styles.metaValue}>{registro.proyecto_nombre}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Agrupador</span>
                  <span className={styles.metaValue}>{registro.agrupador_nombre}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Solicitante</span>
                  <span className={styles.metaValue}>{registro.solicitante_nombre}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Histórico arrastre</span>
                  <span className={styles.metaValue}>{registro.horas_historicas_arrastre}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Asignadas período</span>
                  <span className={styles.metaValue}>{registro.horas_asignadas_periodo}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Consumidas período</span>
                  <span className={styles.metaValue}>{registro.horas_consumidas_periodo}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Disponibles período</span>
                  <span className={styles.metaValue}>{registro.horas_disponibles_periodo}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Acumulado total</span>
                  <span className={styles.metaValue}>{registro.horas_totales_acumuladas}</span>
                </div>
              </div>

              <div className={styles.commentBox}>
                <span className={styles.metaLabel}>Comentario</span>
                <p className={styles.commentText}>{registro.comentario ?? 'Sin comentario'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}