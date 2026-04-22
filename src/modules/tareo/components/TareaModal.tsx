'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  CatalogItem,
  ProyectoItem,
  TareaFormData
} from '../interfaces/tareo.interfaces'
import styles from '../styles/tarea-modal.module.css'

interface TareaModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: TareaFormData, isEditing: boolean) => Promise<void> | void
  tarea?: TareaFormData | null
  periodos: Array<{
    id: number
    anio: number
    mes: number
    cerrado: boolean
  }>
  proyectos: ProyectoItem[]
  agrupadores: CatalogItem[]
  solicitantes: Array<{
    id: number
    nombre: string
    horas_maximas_estimadas: number | null
  }>
  teams: CatalogItem[]
  estadosTarea: CatalogItem[]
}

function getInitialState(
  tarea?: TareaFormData | null,
  estadoPendienteId?: number
): TareaFormData {
  if (tarea) {
    return {
      id: tarea.id,
      periodo_id: tarea.periodo_id,
      nombre: tarea.nombre,
      proyecto_id: tarea.proyecto_id,
      team_id: tarea.team_id,
      solicitante_id: tarea.solicitante_id,
      estado_id: tarea.estado_id,
      horas_historicas_arrastre: tarea.horas_historicas_arrastre ?? 0,
      horas_asignadas_periodo: tarea.horas_asignadas_periodo,
      comentario_periodo: tarea.comentario_periodo ?? '',
      comentario_dm: tarea.comentario_dm ?? null,
      activo: tarea.activo ?? true
    }
  }

  return {
    periodo_id: 0,
    nombre: '',
    proyecto_id: 0,
    team_id: null,
    solicitante_id: 0,
    estado_id: estadoPendienteId ?? 0,
    horas_historicas_arrastre: 0,
    horas_asignadas_periodo: 0,
    comentario_periodo: '',
    comentario_dm: null,
    activo: true
  }
}

function buildPeriodoLabel(periodo: { anio: number; mes: number; cerrado: boolean }) {
  const month = `${periodo.mes}`.padStart(2, '0')
  return `${periodo.anio}-${month}${periodo.cerrado ? ' · Cerrado' : ''}`
}

export default function TareaModal({
  isOpen,
  onClose,
  onSave,
  tarea,
  periodos,
  proyectos,
  agrupadores,
  solicitantes,
  teams,
  estadosTarea
}: TareaModalProps) {
  const estadoPendiente = useMemo(() => {
    return (
      estadosTarea.find((item) => item.nombre.trim().toLowerCase() === 'pendiente') ?? null
    )
  }, [estadosTarea])

  const [formData, setFormData] = useState<TareaFormData>(
    getInitialState(tarea, estadoPendiente?.id)
  )
  const [saving, setSaving] = useState(false)
  const [usaArrastre, setUsaArrastre] = useState(false)
  const isEditing = Boolean(tarea?.id)

  useEffect(() => {
    if (isOpen) {
      const initialState = getInitialState(tarea, estadoPendiente?.id)
      setFormData(initialState)
      setUsaArrastre(Number(initialState.horas_historicas_arrastre || 0) > 0)
    }
  }, [isOpen, tarea, estadoPendiente?.id])

  const proyectoSeleccionado = useMemo(() => {
    return proyectos.find((item) => item.id === Number(formData.proyecto_id)) ?? null
  }, [proyectos, formData.proyecto_id])

  const agrupadorSeleccionado = useMemo(() => {
    if (!proyectoSeleccionado) {
      return null
    }

    return agrupadores.find((item) => item.id === proyectoSeleccionado.agrupador_id) ?? null
  }, [proyectoSeleccionado, agrupadores])

  const solicitanteSeleccionado = useMemo(() => {
    return solicitantes.find((item) => item.id === Number(formData.solicitante_id)) ?? null
  }, [solicitantes, formData.solicitante_id])

  if (!isOpen) {
    return null
  }

  const handleChange = <K extends keyof TareaFormData>(field: K, value: TareaFormData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleToggleArrastre = (checked: boolean) => {
    setUsaArrastre(checked)

    if (!checked) {
      setFormData((prev) => ({
        ...prev,
        horas_historicas_arrastre: 0
      }))
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    try {
      await onSave(
        {
          ...formData,
          estado_id: isEditing ? formData.estado_id : (estadoPendiente?.id ?? formData.estado_id),
          activo: isEditing ? formData.activo : true,
          horas_historicas_arrastre: usaArrastre
            ? Number(formData.horas_historicas_arrastre || 0)
            : 0,
          comentario_periodo: formData.comentario_periodo ?? null
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
            <h2 className={styles.title}>{isEditing ? 'Editar tarea' : 'Nueva tarea'}</h2>
            <p className={styles.subtitle}>
              Configura la tarea y su bolsa de horas para el período
            </p>
          </div>

          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Datos generales</h3>

            <div className={styles.grid}>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label className={styles.label}>Nombre de tarea</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(event) => handleChange('nombre', event.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Proyecto</label>
                <select
                  value={formData.proyecto_id || ''}
                  onChange={(event) => handleChange('proyecto_id', Number(event.target.value))}
                  className={styles.select}
                  required
                >
                  <option value="">Seleccionar proyecto</option>
                  {proyectos.map((proyecto) => (
                    <option key={proyecto.id} value={proyecto.id}>
                      {proyecto.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Agrupador</label>
                <input
                  type="text"
                  value={agrupadorSeleccionado?.nombre ?? ''}
                  className={styles.inputReadOnly}
                  readOnly
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Solicitante</label>
                <select
                  value={formData.solicitante_id || ''}
                  onChange={(event) => handleChange('solicitante_id', Number(event.target.value))}
                  className={styles.select}
                  required
                >
                  <option value="">Seleccionar solicitante</option>
                  {solicitantes.map((solicitante) => (
                    <option key={solicitante.id} value={solicitante.id}>
                      {solicitante.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Team</label>
                <select
                  value={formData.team_id || ''}
                  onChange={(event) =>
                    handleChange('team_id', event.target.value ? Number(event.target.value) : null)
                  }
                  className={styles.select}
                >
                  <option value="">Seleccionar team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {isEditing && (
                <>
                  <div className={styles.field}>
                    <label className={styles.label}>Estado</label>
                    <select
                      value={formData.estado_id || ''}
                      onChange={(event) => handleChange('estado_id', Number(event.target.value))}
                      className={styles.select}
                      required
                    >
                      <option value="">Seleccionar estado</option>
                      {estadosTarea.map((estado) => (
                        <option key={estado.id} value={estado.id}>
                          {estado.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Activo</label>
                    <select
                      value={formData.activo ? 'true' : 'false'}
                      onChange={(event) => handleChange('activo', event.target.value === 'true')}
                      className={styles.select}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Configuración del período</h3>

            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label}>Período</label>
                <select
                  value={formData.periodo_id || ''}
                  onChange={(event) => handleChange('periodo_id', Number(event.target.value))}
                  className={styles.select}
                  required
                >
                  <option value="">Seleccionar período</option>
                  {periodos.map((periodo) => (
                    <option key={periodo.id} value={periodo.id}>
                      {buildPeriodoLabel(periodo)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Horas asignadas del período</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.horas_asignadas_periodo || ''}
                  onChange={(event) =>
                    handleChange('horas_asignadas_periodo', Number(event.target.value))
                  }
                  className={styles.input}
                  required
                />
              </div>

              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={usaArrastre}
                    onChange={(event) => handleToggleArrastre(event.target.checked)}
                  />
                  <span>Esta tarea viene de un período anterior</span>
                </label>
              </div>

              {usaArrastre && (
                <div className={styles.field}>
                  <label className={styles.label}>Horas históricas de arrastre</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.horas_historicas_arrastre || ''}
                    onChange={(event) =>
                      handleChange('horas_historicas_arrastre', Number(event.target.value))
                    }
                    className={styles.input}
                  />
                </div>
              )}

              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label className={styles.label}>Comentario del período</label>
                <textarea
                  value={formData.comentario_periodo ?? ''}
                  onChange={(event) => handleChange('comentario_periodo', event.target.value)}
                  className={styles.textarea}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className={styles.summaryBox}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Agrupador</span>
              <span className={styles.summaryValue}>{agrupadorSeleccionado?.nombre ?? '-'}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Horas máx. solicitante</span>
              <span className={styles.summaryValue}>
                {solicitanteSeleccionado?.horas_maximas_estimadas ?? '-'}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Estado inicial</span>
              <span className={styles.summaryValue}>
                {isEditing
                  ? estadosTarea.find((item) => item.id === formData.estado_id)?.nombre ?? '-'
                  : 'Pendiente'}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Activo inicial</span>
              <span className={styles.summaryValue}>{isEditing ? (formData.activo ? 'Activo' : 'Inactivo') : 'Activo'}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total visible inicial</span>
              <span className={styles.summaryValue}>
                {(usaArrastre ? Number(formData.horas_historicas_arrastre || 0) : 0) +
                  Number(formData.horas_asignadas_periodo || 0)}
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}