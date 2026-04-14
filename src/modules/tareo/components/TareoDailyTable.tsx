'use client'

import type { RegistroDetalleItem } from '../interfaces/tareo.interfaces'
import styles from '../styles/tareo-daily-table.module.css'

interface TareoDailyTableProps {
  registros: RegistroDetalleItem[]
  loading: boolean
  onEdit: (registro: RegistroDetalleItem) => void
  onDelete: (registro: RegistroDetalleItem) => void
}

export default function TareoDailyTable({
  registros,
  loading,
  onEdit,
  onDelete
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
                    onClick={() => onEdit(registro)}
                    className={styles.secondaryButton}
                  >
                    Editar
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
                  <span className={styles.metaLabel}>Team</span>
                  <span className={styles.metaValue}>{registro.team_nombre ?? '-'}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Horas disponibles</span>
                  <span className={styles.metaValue}>{registro.horas_disponibles}</span>
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