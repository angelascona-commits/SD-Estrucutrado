'use client'

import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { saveCatalogItemAction } from '../actions/tareo.action'
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
  onCatalogsChange?: () => void
}

function getInitialState(
  tarea?: TareaFormData | null,
  estadoPendienteId?: number,
  proyectos: ProyectoItem[] = []
): TareaFormData & { agrupador_id: number } {
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
      activo: tarea.activo ?? true,
      agrupador_id: proyectos.find(p => p.id === tarea.proyecto_id)?.agrupador_id || 0
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
    activo: true,
    agrupador_id: 0
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
  estadosTarea,
  onCatalogsChange
}: TareaModalProps) {
  const estadoPendiente = useMemo(() => {
    return (
      estadosTarea.find((item) => item.nombre.trim().toLowerCase() === 'pendiente') ?? null
    )
  }, [estadosTarea])

  const [formData, setFormData] = useState<TareaFormData & { agrupador_id: number }>(
    getInitialState(tarea, estadoPendiente?.id, proyectos)
  )
  const [saving, setSaving] = useState(false)
  const [usaArrastre, setUsaArrastre] = useState(false)
  const isEditing = Boolean(tarea?.id)

  useEffect(() => {
    if (isOpen) {
      const initialState = getInitialState(tarea, estadoPendiente?.id, proyectos)
      setFormData(initialState)
      setUsaArrastre(Number(initialState.horas_historicas_arrastre || 0) > 0)
    }
  }, [isOpen, tarea, estadoPendiente?.id, proyectos])

  const proyectoSeleccionado = useMemo(() => {
    return proyectos.find((item) => item.id === Number(formData.proyecto_id)) ?? null
  }, [proyectos, formData.proyecto_id])

  const agrupadorSeleccionado = useMemo(() => {
    return agrupadores.find((item) => item.id === Number(formData.agrupador_id)) ?? null
  }, [agrupadores, formData.agrupador_id])

  const proyectosFiltrados = useMemo(() => {
    if (!formData.agrupador_id) return []
    return proyectos.filter((p) => p.agrupador_id === Number(formData.agrupador_id))
  }, [proyectos, formData.agrupador_id])

  // Reset proyecto if selected agrupador changes and the current project doesn't belong to it
  useEffect(() => {
    if (formData.proyecto_id) {
      const proj = proyectos.find(p => p.id === formData.proyecto_id)
      if (proj && proj.agrupador_id !== Number(formData.agrupador_id)) {
         setFormData(prev => ({ ...prev, proyecto_id: 0, solicitante_id: 0, team_id: 0 }))
      }
    }
  }, [formData.agrupador_id, proyectos])

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

  const handleCreateProject = async () => {
    if (!formData.agrupador_id) {
       Swal.fire('Atención', 'Debe seleccionar un Agrupador primero', 'warning')
       return
    }

    const agrupadorName = agrupadores.find(a => a.id === Number(formData.agrupador_id))?.nombre

    const { value: formValues } = await Swal.fire({
      title: 'Crear Nuevo Proyecto',
      html: `
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">Agrupador Seleccionado</label>
          <input class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" value="${agrupadorName}" disabled>
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">Nombre del Proyecto</label>
          <input id="swal-input-nombre" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" placeholder="Nombre...">
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">Solicitante Predeterminado (Opcional)</label>
          <select id="swal-input-solicitante" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box; display: flex;">
            <option value="">Ninguno</option>
            ${solicitantes.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
          </select>
        </div>
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">Team Predeterminado (Opcional)</label>
          <select id="swal-input-team" class="swal2-select" style="width: 100%; margin: 0; box-sizing: border-box; display: flex;">
            <option value="">Ninguno</option>
            ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Crear Proyecto',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--primary, #ec5b13)',
      preConfirm: () => {
        const nombre = (document.getElementById('swal-input-nombre') as HTMLInputElement).value
        const solicitante_id = (document.getElementById('swal-input-solicitante') as HTMLSelectElement).value
        const team_id = (document.getElementById('swal-input-team') as HTMLSelectElement).value
        
        if (!nombre) {
          Swal.showValidationMessage('El nombre es obligatorio')
          return false
        }
        return { 
          nombre, 
          solicitante_id: solicitante_id ? Number(solicitante_id) : null, 
          team_id: team_id ? Number(team_id) : null 
        }
      }
    })

    if (formValues) {
       setSaving(true)
       try {
         const res = await saveCatalogItemAction('tareo_proyecto', {
           nombre: formValues.nombre,
           agrupador_id: formData.agrupador_id,
           solicitante_id: formValues.solicitante_id,
           team_id: formValues.team_id
         })
         
         if (res.success && res.data) {
            if (onCatalogsChange) {
               onCatalogsChange() // Trigger reload
            }
            // Auto-select the newly created project
            const newId = res.data.id
            setFormData(prev => ({
               ...prev,
               proyecto_id: newId,
               solicitante_id: formValues.solicitante_id || prev.solicitante_id,
               team_id: formValues.team_id || prev.team_id
            }))
            Swal.fire({
               icon: 'success',
               title: 'Proyecto Creado',
               text: 'El proyecto se ha creado correctamente y ha sido seleccionado.',
               timer: 2000,
               showConfirmButton: false
            })
         } else {
            throw new Error(res.error ?? 'Error desconocido')
         }
       } catch (e: any) {
          Swal.fire('Error', e.message || 'No se pudo crear el proyecto', 'error')
       }
       setSaving(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    try {
      if (solicitanteSeleccionado?.horas_maximas_estimadas !== null && solicitanteSeleccionado?.horas_maximas_estimadas !== undefined) {
        if (Number(formData.horas_asignadas_periodo) > solicitanteSeleccionado.horas_maximas_estimadas) {
          const result = await Swal.fire({
            title: 'Aumentar Estimado Mensual',
            text: `Las horas asignadas superan las estimadas del solicitante (${solicitanteSeleccionado.horas_maximas_estimadas}H). ¿Deseas aumentar el estimado del solicitante en el catálogo para continuar?`,
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
            title: 'Nuevo estimado de horas',
            input: 'number',
            inputLabel: `Ingrese el nuevo estimado de horas para el solicitante ${solicitanteSeleccionado.nombre}`,
            inputValue: formData.horas_asignadas_periodo,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: 'var(--primary, #ec5b13)',
            inputValidator: (value) => {
              if (!value || isNaN(Number(value)) || Number(value) < Number(formData.horas_asignadas_periodo)) {
                return 'Ingrese un número válido mayor o igual a las horas asignadas'
              }
            }
          })

          if (!inputResult.isConfirmed) {
            setSaving(false)
            return
          }
          
          const newValue = Number(inputResult.value)
          try {
            await saveCatalogItemAction('tareo_solicitante', {
              id: solicitanteSeleccionado.id,
              horas_maximas_estimadas: newValue
            })
          } catch (e) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo actualizar el solicitante.',
              confirmButtonColor: 'var(--primary, #ec5b13)'
            })
            setSaving(false)
            return
          }
        }
      }

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
                <label className={styles.label}>Agrupador</label>
                <select
                  value={formData.agrupador_id || ''}
                  onChange={(event) => setFormData(prev => ({ ...prev, agrupador_id: Number(event.target.value) }))}
                  className={styles.select}
                  required
                >
                  <option value="">Seleccionar agrupador</option>
                  {agrupadores.map((agrupador) => (
                    <option key={agrupador.id} value={agrupador.id}>
                      {agrupador.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field} style={{ display: 'flex', flexDirection: 'column' }}>
                <label className={styles.label}>Proyecto</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={formData.proyecto_id || ''}
                    onChange={(event) => {
                      const pid = Number(event.target.value)
                      const proj = proyectos.find((p) => p.id === pid)
                      setFormData((prev) => ({
                        ...prev,
                        proyecto_id: pid,
                        solicitante_id: proj?.solicitante_id ?? prev.solicitante_id,
                        team_id: proj?.team_id !== undefined ? proj.team_id : prev.team_id
                      }))
                    }}
                    className={styles.select}
                    style={{ flex: 1 }}
                    required
                    disabled={!formData.agrupador_id}
                  >
                    <option value="">Seleccionar proyecto</option>
                    {proyectosFiltrados.map((proyecto) => (
                      <option key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre}
                      </option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={handleCreateProject}
                    disabled={!formData.agrupador_id}
                    title="Crear nuevo proyecto en este agrupador"
                    style={{
                      background: 'var(--surface-50, #f8fafc)',
                      border: '1px solid var(--border, #e2e8f0)',
                      borderRadius: '8px',
                      padding: '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: formData.agrupador_id ? 'pointer' : 'not-allowed',
                      color: formData.agrupador_id ? 'var(--primary, #ec5b13)' : '#94a3b8'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                  </button>
                </div>
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