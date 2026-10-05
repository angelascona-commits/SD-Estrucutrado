'use client'

import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import {
  validateRegistroRealtimeAction,
  saveCatalogItemAction,
  saveTareaAction,
  listTareasAction
} from '../actions/tareo.action'
import type {
  PeriodoItem,
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
  periodos?: PeriodoItem[]
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
  fechaInicial,
  periodos = []
}: RegistroTareoModalProps) {
  const [formData, setFormData] = useState<RegistroFormData>(getInitialState(registro, fechaInicial))
  const [horasInput, setHorasInput] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<RegistroRealtimeValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [periodTasks, setPeriodTasks] = useState<TareaPeriodoListItem[]>([])
  const [loadingPeriodTasks, setLoadingPeriodTasks] = useState(false)
  const isEditing = Boolean(registro)

  // Determinar el período exacto correspondiente a la fecha seleccionada
  const targetPeriodo = useMemo(() => {
    if (!formData.fecha || !periodos || periodos.length === 0) return null
    const [yearStr, monthStr] = formData.fecha.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    return (
      periodos.find(
        (p) =>
          p.fecha_inicio &&
          p.fecha_fin &&
          formData.fecha >= p.fecha_inicio &&
          formData.fecha <= p.fecha_fin
      ) ?? periodos.find((p) => p.anio === year && p.mes === month) ?? null
    )
  }, [formData.fecha, periodos])

  useEffect(() => {
    if (isOpen) {
      const initial = getInitialState(registro, fechaInicial)
      setFormData(initial)
      setHorasInput(initial.horas > 0 ? String(initial.horas) : '')
      setValidation(null)
    }
  }, [isOpen, registro, fechaInicial])

  // Filtro estricto: al cambiar la fecha, listar únicamente las tareas correspondientes al período de dicha fecha
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    const updateTasksForFecha = async () => {
      if (!formData.fecha) {
        setPeriodTasks([])
        return
      }

      const [yearStr, monthStr] = formData.fecha.split('-')
      const year = Number(yearStr)
      const month = Number(monthStr)

      const resolvedPeriod =
        periodos && periodos.length > 0
          ? periodos.find(
              (p) =>
                p.fecha_inicio &&
                p.fecha_fin &&
                formData.fecha >= p.fecha_inicio &&
                formData.fecha <= p.fecha_fin
            ) ?? periodos.find((p) => p.anio === year && p.mes === month) ?? null
          : null

      const applyNewTasks = (newTasks: TareaPeriodoListItem[]) => {
        setPeriodTasks(newTasks)
        setFormData((prev) => {
          if (!prev.tarea_periodo_id) return prev

          // ¿Existe el tarea_periodo_id actual en la lista del período?
          const exists = newTasks.some((t) => t.tarea_periodo_id === prev.tarea_periodo_id)
          if (exists) return prev

          // Si no existe, intentar asociar automáticamente a la misma tarea en este período
          const oldTask =
            tareasPeriodo.find((t) => t.tarea_periodo_id === prev.tarea_periodo_id) ??
            periodTasks.find((t) => t.tarea_periodo_id === prev.tarea_periodo_id)

          if (oldTask) {
            const matchInNew = newTasks.find(
              (t) => t.tarea_id === oldTask.tarea_id || t.tarea_nombre === oldTask.tarea_nombre
            )
            if (matchInNew) {
              return { ...prev, tarea_periodo_id: matchInNew.tarea_periodo_id }
            }
          }

          // Si no existe equivalente en el nuevo período, resetear selección a 0
          return { ...prev, tarea_periodo_id: 0 }
        })
      }

      // 1. Revisar si tareasPeriodo recibidas por prop ya corresponden a este período
      const matchingInProps = tareasPeriodo.filter((t) =>
        resolvedPeriod
          ? t.periodo_id === resolvedPeriod.id
          : t.periodo_anio === year && t.periodo_mes === month
      )

      if (matchingInProps.length > 0) {
        if (isMounted) {
          applyNewTasks(matchingInProps)
        }
        return
      }

      // 2. Si no están en las props y hay un período identificado, consultarlas al backend
      if (resolvedPeriod?.id) {
        if (isMounted) setLoadingPeriodTasks(true)
        const res = await listTareasAction({ periodo_id: resolvedPeriod.id })
        if (isMounted) {
          setLoadingPeriodTasks(false)
          if (res.success && res.data) {
            applyNewTasks(res.data)
          } else {
            applyNewTasks([])
          }
        }
      } else {
        if (isMounted) {
          applyNewTasks([])
        }
      }
    }

    void updateTasksForFecha()

    return () => {
      isMounted = false
    }
  }, [isOpen, formData.fecha, periodos, tareasPeriodo])

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
    const selectedId = Number(formData.tarea_periodo_id)
    if (!selectedId) return null
    return (
      periodTasks.find((item) => item.tarea_periodo_id === selectedId) ??
      tareasPeriodo.find((item) => item.tarea_periodo_id === selectedId) ??
      null
    )
  }, [periodTasks, tareasPeriodo, formData.tarea_periodo_id])

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
        const limiteConfigurado = validation.horas_maximas_trabajador ?? 24
        await Swal.fire({
          icon: 'error',
          title: 'Límite Diario Superado',
          text: validation.messages[0] || `El trabajador ya tiene registradas ${validation.horas_trabajador_dia} horas en este día. Al intentar registrar ${validation.horas_ingresadas} horas más, el total será de ${validation.total_horas_resultante} horas, superando el límite diario configurado de ${limiteConfigurado} horas.`,
          confirmButtonText: 'Aceptar',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
        setSaving(false)
        return
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

      if (targetPeriodo && targetPeriodo.cerrado) {
        await Swal.fire({
          icon: 'error',
          title: 'Período Cerrado',
          text: `El período ${targetPeriodo.anio}-${String(targetPeriodo.mes).padStart(2, '0')} correspondiente a la fecha está cerrado.`,
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
        setSaving(false)
        return
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
              <label className={styles.label}>
                Tarea del período
                {targetPeriodo && (
                  <span className={styles.periodTag}>
                    Período {targetPeriodo.anio}-{String(targetPeriodo.mes).padStart(2, '0')}
                  </span>
                )}
              </label>
              <select
                value={formData.tarea_periodo_id || ''}
                onChange={(event) => handleChange('tarea_periodo_id', Number(event.target.value))}
                className={styles.select}
                required
                disabled={loadingPeriodTasks || !targetPeriodo || Boolean(targetPeriodo?.cerrado)}
              >
                <option value="">
                  {loadingPeriodTasks
                    ? 'Cargando tareas del período...'
                    : !targetPeriodo
                    ? 'Sin período configurado para esta fecha'
                    : periodTasks.length === 0
                    ? 'No hay tareas asignadas a este período'
                    : 'Seleccionar tarea'}
                </option>
                {periodTasks
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

          {targetPeriodo?.cerrado && (
            <div className={styles.validationError}>
              ⚠️ El período {targetPeriodo.anio}-{String(targetPeriodo.mes).padStart(2, '0')} correspondiente a la fecha ({formData.fecha}) se encuentra <strong>cerrado</strong>. No se permite crear ni editar registros en períodos cerrados.
            </div>
          )}

          {formData.fecha && !targetPeriodo && periodos && periodos.length > 0 && (
            <div className={styles.validationError}>
              ⚠️ No existe un período configurado en el sistema para la fecha seleccionada ({formData.fecha}).
            </div>
          )}

          {targetPeriodo && !targetPeriodo.cerrado && !loadingPeriodTasks && periodTasks.length === 0 && (
            <div className={styles.validationWarning}>
              ℹ️ El período {targetPeriodo.anio}-{String(targetPeriodo.mes).padStart(2, '0')} no tiene tareas asignadas. No se pueden registrar horas hasta asignar tareas a dicho período.
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={
                saving ||
                validating ||
                loadingPeriodTasks ||
                Boolean(targetPeriodo?.cerrado) ||
                !targetPeriodo ||
                !formData.tarea_periodo_id ||
                (validation ? validation.periodo_cerrado : false)
              }
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}