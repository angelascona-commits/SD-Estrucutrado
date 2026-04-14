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

function getInitialState(tarea?: TareaFormData | null): TareaFormData {
  if (tarea) {
    return {
      id: tarea.id,
      periodo_id: tarea.periodo_id,
      nombre: tarea.nombre,
      proyecto_id: tarea.proyecto_id,
      team_id: tarea.team_id,
      solicitante_id: tarea.solicitante_id,
      estado_id: tarea.estado_id,
      horas_totales: tarea.horas_totales,
      comentario_ps: tarea.comentario_ps ?? '',
      activo: tarea.activo ?? true
    }
  }

  return {
    periodo_id: 0,
    nombre: '',
    proyecto_id: 0,
    team_id: null,
    solicitante_id: 0,
    estado_id: 0,
    horas_totales: 0,
    comentario_ps: '',
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
  const [formData, setFormData] = useState<TareaFormData>(getInitialState(tarea))
  const [saving, setSaving] = useState(false)
  const isEditing = Boolean(tarea?.id)

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialState(tarea))
    }
  }, [isOpen, tarea])

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    try {
      await onSave(
        {
          ...formData,
          comentario_ps: formData.comentario_ps ?? null
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
              Configura la bolsa de horas y los datos base de la tarea
            </p>
          </div>

          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
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

            <div className={styles.field}>
              <label className={styles.label}>Horas totales</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.horas_totales || ''}
                onChange={(event) => handleChange('horas_totales', Number(event.target.value))}
                className={styles.input}
                required
              />
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

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Comentario PS</label>
              <textarea
                value={formData.comentario_ps ?? ''}
                onChange={(event) => handleChange('comentario_ps', event.target.value)}
                className={styles.textarea}
                rows={4}
              />
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