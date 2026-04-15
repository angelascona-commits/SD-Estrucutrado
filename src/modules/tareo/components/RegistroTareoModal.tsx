'use client'

import { useEffect, useMemo, useState } from 'react'
import { validateRegistroRealtimeAction } from '../actions/tareo.action'
import type {
  RegistroFormData,
  RegistroRealtimeValidationResult,
  TareaPeriodoListItem,
  TrabajadorItem
} from '../interfaces/tareo.interfaces'
import styles from '../styles/registro-tareo-modal.module.css'

interface RegistroTareoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: RegistroFormData, isEditing: boolean) => Promise<void> | void
  registro?: RegistroFormData | null
  tareasPeriodo: TareaPeriodoListItem[]
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
      tarea_periodo_id: registro.tarea_periodo_id,
      fecha: registro.fecha,
      trabajador_id: registro.trabajador_id,
      horas: registro.horas,
      comentario: registro.comentario ?? ''
    }
  }

  return {
    tarea_periodo_id: 0,
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
  tareasPeriodo,
  trabajadores,
  fechaInicial
}: RegistroTareoModalProps) {
  const [formData, setFormData] = useState<RegistroFormData>(getInitialState(registro, fechaInicial))
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<RegistroRealtimeValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const isEditing = Boolean(registro)

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialState(registro, fechaInicial))
      setValidation(null)
    }
  }, [isOpen, registro, fechaInicial])

  useEffect(() => {
    const runValidation = async () => {
      if (!isOpen) {
        return
      }

      if (
        !formData.fecha ||
        !formData.trabajador_id ||
        !formData.tarea_periodo_id ||
        Number(formData.horas || 0) <= 0
      ) {
        setValidation(null)
        return
      }

      setValidating(true)

      const response = await validateRegistroRealtimeAction(formData)

      if (response.success && response.data) {
        setValidation(response.data)
      } else {
        setValidation(null)
      }

      setValidating(false)
    }

    void runValidation()
  }, [
    isOpen,
    formData.id,
    formData.fecha,
    formData.trabajador_id,
    formData.tarea_periodo_id,
    formData.horas
  ])

  const tareaSeleccionada = useMemo(() => {
    return (
      tareasPeriodo.find((item) => item.tarea_periodo_id === Number(formData.tarea_periodo_id)) ??
      null
    )
  }, [tareasPeriodo, formData.tarea_periodo_id])

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
      if (validation && !validation.can_save) {
        setSaving(false)
        return
      }

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
              Registra horas consumidas sobre una tarea del período
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
              <label className={styles.label}>Tarea del período</label>
              <select
                value={formData.tarea_periodo_id || ''}
                onChange={(event) => handleChange('tarea_periodo_id', Number(event.target.value))}
                className={styles.select}
                required
              >
                <option value="">Seleccionar tarea</option>
                {tareasPeriodo.map((tarea) => (
                  <option key={tarea.tarea_periodo_id} value={tarea.tarea_periodo_id}>
                    {tarea.tarea_nombre} · {tarea.proyecto_nombre} · {tarea.periodo_anio}-
                    {`${tarea.periodo_mes}`.padStart(2, '0')}
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
              <label className={styles.label}>Horas disponibles del período</label>
              <input
                type="text"
                value={tareaSeleccionada ? String(tareaSeleccionada.horas_disponibles_periodo) : '-'}
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
                <span className={styles.summaryLabel}>Histórico arrastre</span>
                <span className={styles.summaryValue}>
                  {tareaSeleccionada.horas_historicas_arrastre}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Asignadas período</span>
                <span className={styles.summaryValue}>
                  {tareaSeleccionada.horas_asignadas_periodo}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Total acumulado actual</span>
                <span className={styles.summaryValue}>
                  {tareaSeleccionada.horas_totales_acumuladas}
                </span>
              </div>
            </div>
          )}

          {(validation || validating) && (
            <div className={styles.validationBox}>
              <div className={styles.validationGrid}>
                <div className={styles.validationItem}>
                  <span className={styles.validationLabel}>Horas del trabajador en el día</span>
                  <span className={styles.validationValue}>
                    {validating ? 'Validando...' : validation?.horas_trabajador_dia ?? '-'}
                  </span>
                </div>

                <div className={styles.validationItem}>
                  <span className={styles.validationLabel}>Horas ingresadas</span>
                  <span className={styles.validationValue}>
                    {validating ? 'Validando...' : validation?.horas_ingresadas ?? '-'}
                  </span>
                </div>

                <div className={styles.validationItem}>
                  <span className={styles.validationLabel}>Total resultante</span>
                  <span className={styles.validationValue}>
                    {validating ? 'Validando...' : validation?.total_horas_resultante ?? '-'}
                  </span>
                </div>

                <div className={styles.validationItem}>
                  <span className={styles.validationLabel}>Disponibles del período</span>
                  <span className={styles.validationValue}>
                    {validating ? 'Validando...' : validation?.horas_disponibles_periodo ?? '-'}
                  </span>
                </div>
              </div>

              {validation && validation.messages.length > 0 && (
                <div className={styles.validationMessages}>
                  {validation.messages.map((message) => (
                    <div key={message} className={styles.validationError}>
                      {message}
                    </div>
                  ))}
                </div>
              )}

              {validation && validation.can_save && (
                <div className={styles.validationSuccess}>
                  El registro cumple las validaciones y puede guardarse.
                </div>
              )}
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={saving || validating || (validation ? !validation.can_save : false)}
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}