'use client'

import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { validateRegistroRealtimeAction, saveCatalogItemAction, saveTareaAction } from '../actions/tareo.action'
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
  const [horasInput, setHorasInput] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<RegistroRealtimeValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const isEditing = Boolean(registro)

  useEffect(() => {
    if (isOpen) {
      const initial = getInitialState(registro, fechaInicial)
      setFormData(initial)
      setHorasInput(initial.horas > 0 ? String(initial.horas) : '')
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
      if (validation && validation.excede_maximo_dia) {
        const result = await Swal.fire({
          title: 'Aumentar Límite Diario',
          text: `El trabajador superará su límite de horas. (Total resultante: ${validation.total_horas_resultante}H). ¿Deseas aumentar sus horas máximas diarias para poder guardar?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, aumentar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })

        if (!result.isConfirmed) {
          setSaving(false)
          return
        }
        
        const inputResult = await Swal.fire({
          title: 'Nuevo límite de horas',
          input: 'number',
          inputLabel: 'Ingrese el nuevo límite de horas diarias para el trabajador',
          inputValue: validation.total_horas_resultante,
          showCancelButton: true,
          confirmButtonText: 'Actualizar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: 'var(--primary, #ec5b13)',
          inputValidator: (value) => {
            if (!value || isNaN(Number(value)) || Number(value) < validation.total_horas_resultante) {
              return 'Ingrese un número válido mayor o igual al total resultante'
            }
          }
        })

        if (!inputResult.isConfirmed) {
          setSaving(false)
          return
        }
        
        const newValue = Number(inputResult.value)
        try {
          await saveCatalogItemAction('tareo_trabajador', {
            id: formData.trabajador_id,
            horas_maximas: newValue
          })
        } catch (e) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar el trabajador.',
            confirmButtonColor: 'var(--primary, #ec5b13)'
          })
          setSaving(false)
          return
        }
      }

      if (validation && validation.excede_horas_disponibles) {
        const result = await Swal.fire({
          title: 'Aumentar Bolsa de Horas',
          text: `Las horas superan las disponibles del período. ¿Deseas aumentar las horas asignadas a la tarea para continuar?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, aumentar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })

        if (!result.isConfirmed) {
           setSaving(false)
           return
        }
        
        if (tareaSeleccionada) {
          const diff = Number(formData.horas) - validation.horas_disponibles_periodo
          const nuevaBolsa = tareaSeleccionada.horas_asignadas_periodo + diff

          const inputResult = await Swal.fire({
            title: 'Nueva bolsa de horas',
            input: 'number',
            inputLabel: 'Ingrese la nueva bolsa de horas asignadas para la tarea',
            inputValue: nuevaBolsa,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: 'var(--primary, #ec5b13)',
            inputValidator: (value) => {
              if (!value || isNaN(Number(value)) || Number(value) < nuevaBolsa) {
                return 'El valor debe ser numérico y válido'
              }
            }
          })

          if (!inputResult.isConfirmed) {
             setSaving(false)
             return
          }

          const newValue = Number(inputResult.value)
          try {
            await saveTareaAction({
              id: tareaSeleccionada.tarea_periodo_id,
              periodo_id: tareaSeleccionada.periodo_id,
              nombre: tareaSeleccionada.tarea_nombre,
              proyecto_id: tareaSeleccionada.proyecto_id,
              team_id: tareaSeleccionada.team_id,
              solicitante_id: tareaSeleccionada.solicitante_id,
              estado_id: tareaSeleccionada.estado_id,
              horas_historicas_arrastre: tareaSeleccionada.horas_historicas_arrastre,
              horas_asignadas_periodo: newValue,
              comentario_periodo: tareaSeleccionada.comentario_periodo,
              comentario_dm: tareaSeleccionada.comentario_dm,
              activo: tareaSeleccionada.activo
            }, true)
          } catch(e) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Error al actualizar la tarea.',
              confirmButtonColor: 'var(--primary, #ec5b13)'
            })
            setSaving(false)
            return
          }
        }
      }

      if (validation && validation.periodo_cerrado) {
        Swal.fire({
          icon: 'error',
          title: 'Período Cerrado',
          text: 'El período está cerrado.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
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
                {tareasPeriodo
                  .filter((tarea) => tarea.activo || (isEditing && formData.tarea_periodo_id === tarea.tarea_periodo_id))
                  .map((tarea) => (
                    <option key={tarea.tarea_periodo_id} value={tarea.tarea_periodo_id}>
                      {tarea.tarea_nombre} · {tarea.proyecto_nombre} · {tarea.periodo_anio}-
                      {`${tarea.periodo_mes}`.padStart(2, '0')}
                    </option>
                  ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Horas (decimales permitidos, ej: 0.50, 0.75)</label>
              <input
                type="text"
                inputMode="decimal"
                value={horasInput}
                onChange={(event) => {
                  const raw = event.target.value
                  // Permite escribir libremente: dígitos, punto y coma decimal
                  if (/^[\d]*[.,]?[\d]*$/.test(raw)) {
                    const normalized = raw.replace(',', '.')
                    setHorasInput(raw)
                    const parsed = parseFloat(normalized)
                    if (!isNaN(parsed) && parsed > 0) {
                      handleChange('horas', parsed)
                    } else {
                      handleChange('horas', 0)
                    }
                  }
                }}
                className={styles.input}
                placeholder="ej: 0.50"
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
              disabled={saving || validating || (validation ? validation.periodo_cerrado : false)}
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}