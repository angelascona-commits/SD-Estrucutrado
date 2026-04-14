'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  CatalogItem,
  RegistroFormData,
  TareaListItem,
  TrabajadorItem
} from '../interfaces/tareo.interfaces'
import styles from '../styles/registro-tareo-modal.module.css'

interface RegistroTareoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: RegistroFormData, isEditing: boolean) => Promise<void> | void
  registro?: RegistroFormData | null
  tareas: TareaListItem[]
  trabajadores: TrabajadorItem[]
  fechaInicial?: string
}

function getInitialState(
  registro?: RegistroFormData | null,
  fechaInicial?: string
): RegistroFormData {
  if (registro) {
    return {
      id: registro.id,
      tarea_id: registro.tarea_id,
      fecha: registro.fecha,
      trabajador_id: registro.trabajador_id,
      horas: registro.horas,
      comentario: registro.comentario ?? ''
    }
  }

  return {
    tarea_id: 0,
    fecha: fechaInicial ?? '',
    trabajador_id: 0,
    horas: 0,
    comentario: ''
  }
}

export default function RegistroTareoModal({
  isOpen,
  onClose,
  onSave,
  registro,
  tareas,
  trabajadores,
  fechaInicial
}: RegistroTareoModalProps) {
  const [formData, setFormData] = useState<RegistroFormData>(getInitialState(registro, fechaInicial))
  const [saving, setSaving] = useState(false)
  const isEditing = Boolean(registro)

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialState(registro, fechaInicial))
    }
  }, [isOpen, registro, fechaInicial])

  const tareaSeleccionada = useMemo(() => {
    return tareas.find((item) => item.id === Number(formData.tarea_id)) ?? null
  }, [tareas, formData.tarea_id])

  if (!isOpen) {
    return null
  }

  const handleChange = <K extends keyof RegistroFormData>(field: K, value: RegistroFormData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    try {
      await onSave(
        {
          ...formData,
          comentario: formData.comentario ?? null
        },
        isEditing
      )
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              {isEditing ? 'Editar registro diario' : 'Nuevo registro diario'}
            </h2>
            <p className={styles.subtitle}>
              Registra horas consumidas sobre una tarea para una fecha específica
            </p>
          </div>

          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Fecha</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(event) => handleChange('fecha', event.target.value)}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Trabajador</label>
              <select
                value={formData.trabajador_id || ''}
                onChange={(event) => handleChange('trabajador_id', Number(event.target.value))}
                className={styles.select}
                required
              >
                <option value="">Seleccionar trabajador</option>
                {trabajadores.map((trabajador) => (
                  <option key={trabajador.id} value={trabajador.id}>
                    {trabajador.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Tarea</label>
              <select
                value={formData.tarea_id || ''}
                onChange={(event) => handleChange('tarea_id', Number(event.target.value))}
                className={styles.select}
                required
              >
                <option value="">Seleccionar tarea</option>
                {tareas.map((tarea) => (
                  <option key={tarea.id} value={tarea.id}>
                    {tarea.nombre} · {tarea.proyecto_nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Horas</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.horas || ''}
                onChange={(event) => handleChange('horas', Number(event.target.value))}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Horas disponibles</label>
              <input
                type="text"
                value={tareaSeleccionada ? String(tareaSeleccionada.horas_disponibles) : '-'}
                className={styles.inputReadOnly}
                readOnly
              />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Comentario</label>
              <textarea
                value={formData.comentario ?? ''}
                onChange={(event) => handleChange('comentario', event.target.value)}
                className={styles.textarea}
                rows={4}
              />
            </div>
          </div>

          {tareaSeleccionada && (
            <div className={styles.summaryBox}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Proyecto</span>
                <span className={styles.summaryValue}>{tareaSeleccionada.proyecto_nombre}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Agrupador</span>
                <span className={styles.summaryValue}>{tareaSeleccionada.agrupador_nombre}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Solicitante</span>
                <span className={styles.summaryValue}>{tareaSeleccionada.solicitante_nombre}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Team</span>
                <span className={styles.summaryValue}>{tareaSeleccionada.team_nombre ?? '-'}</span>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}