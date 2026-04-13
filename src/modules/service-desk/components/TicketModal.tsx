'use client'

import { useEffect, useMemo, useState, useTransition, type ChangeEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import styles from './TicketModal.module.css'
import { fetchTicketModalData, saveTicketAction } from '@/modules/service-desk/actions/ticketForms.action'
import {
  TicketFormCatalogs,
  TicketFormValues,
  TicketHistoryEntry,
  TicketSlaInfo,
} from '@/modules/service-desk/interfaces/ticket.interfaces'
import { toPeruInputDateTime, toPeruDisplayDateTime, fromPeruInputDateTime, getCurrentPeruInputDateTime} from '@/modules/shared/utils/dateTimePeru'

interface Props {
  ticketId?: number
  isOpen: boolean
}

const EMPTY_FORM: TicketFormValues = {
  id: null,
  numero_ticket: null,
  descripcion: '',
  estado_id: null,
  prioridad_id: null,
  responsable_id: null,
  estado_jira_id: null,
  tipo_sd: '',
  aplicacion_id: null,
  producto_id: null,
  dni: '',
  poliza: '',
  comentario: '',
  horas_invertidas: null,
  observaciones: '',
  horario_laboral: '',
  fecha_registro: null,
  fecha_creacion_sd: null,
  fecha_asignacion: null,
  fecha_maxima_atencion: null,
  fecha_atencion: null,
  fecha_delegacion: null,
}

const EMPTY_SLA: TicketSlaInfo = {
  asignacionHoras: null,
  asignacionExcede: false,
  asignacionMensaje: null,
  atencionHoras: null,
  atencionIncumpleMinimo: false,
  atencionMensaje: null,
}

function getFechaLocalActual() {
  const ahora = new Date()
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

function toInputDateTime(value: string | null): string {
  if (!value) return ''
  return String(value).replace(' ', 'T').substring(0, 16)
}

function fromInputDateTime(value: string): string | null {
  if (!value) return null
  return value
}

function formatHistoryDate(value: string) {
  if (!value) return ''
  return String(value).replace('T', ' ').substring(0, 16)
}

function getCurrentLocalDateTime(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}


function getActionTone(action: string) {
  const upper = action.toUpperCase()

  if (upper.includes('CREACION')) return styles.historyCreation
  if (upper.includes('EDICION')) return styles.historyEdit
  if (upper.includes('ESTADO')) return styles.historyState
  return styles.historyDefault
}

export default function TicketModal({ ticketId, isOpen }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [loading, setLoading] = useState(false)
  const [catalogs, setCatalogs] = useState<TicketFormCatalogs | null>(null)
  const [formData, setFormData] = useState<TicketFormValues>(EMPTY_FORM)
  const [history, setHistory] = useState<TicketHistoryEntry[]>([])
  const [slaInfo, setSlaInfo] = useState<TicketSlaInfo>(EMPTY_SLA)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!ticketId

  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setLoading(true)
      setError(null)

      const response = await fetchTicketModalData(ticketId)

      if (!response.success) {
        setCatalogs(response.catalogs)
        setFormData(EMPTY_FORM)
        setHistory([])
        setSlaInfo(response.sla || EMPTY_SLA)
        setError(response.error || 'No se pudo cargar la información del ticket')
        setLoading(false)
        return
      }

      setCatalogs(response.catalogs)
      setFormData(response.ticket || EMPTY_FORM)
      setHistory(response.history || [])
      setSlaInfo(response.sla || EMPTY_SLA)
      setLoading(false)
    }

    loadData()
  }, [ticketId, isOpen])

  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('editId')
    params.delete('create')
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const validationErrors = useMemo(() => {
  const issues: string[] = []

  if (!isEditing && !formData.numero_ticket) {
    issues.push('El número de ticket es obligatorio.')
  }

  if (!formData.descripcion.trim()) {
    issues.push('La descripción es obligatoria.')
  }

  if (!isEditing && !formData.estado_id) {
    issues.push('El estado es obligatorio para crear el ticket.')
  }

  return issues
}, [formData.numero_ticket, formData.descripcion, formData.estado_id, isEditing])

  const footerAlerts = useMemo(() => {
    const alerts: { type: 'error' | 'warning'; text: string }[] = []

    if (error) {
      alerts.push({ type: 'error', text: error })
    } else if (validationErrors.length > 0) {
      alerts.push({ type: 'warning', text: validationErrors[0] })
    }

    return alerts
  }, [error, validationErrors])

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    const numberFields = new Set([
      'numero_ticket',
      'estado_id',
      'prioridad_id',
      'responsable_id',
      'estado_jira_id',
      'aplicacion_id',
      'producto_id',
      'horas_invertidas',
    ])

    setError(null)

    setFormData((prev) => {
      if (name === 'responsable_id') {
        const responsableId = value === '' ? null : Number(value)
        const selectedUser = catalogs?.usuarios.find((user) => user.id === responsableId)
        const changedResponsable = prev.responsable_id !== responsableId

        return {
          ...prev,
          responsable_id: responsableId,
          horario_laboral: selectedUser?.horario_laboral || '',
          fecha_delegacion:
            responsableId && changedResponsable
              ? prev.fecha_delegacion || getFechaLocalActual()
              : prev.fecha_delegacion,
        }
      }

      return {
        ...prev,
        [name]: numberFields.has(name)
          ? value === ''
            ? null
            : Number(value)
          : value,
      }
    })
  }

  const handleSubmit = async () => {
    setError(null)

    if (validationErrors.length > 0) {
      setError(validationErrors[0])
      return
    }

    const fd = new FormData()

    if (formData.id) {
      fd.append('id', String(formData.id))
    }

    if (!isEditing && formData.numero_ticket !== null) {
      fd.append('numero_ticket', String(formData.numero_ticket))
    }

    fd.append('descripcion', formData.descripcion)
    if (formData.estado_id !== null) fd.append('estado_id', String(formData.estado_id))
    if (formData.prioridad_id !== null) fd.append('prioridad_id', String(formData.prioridad_id))
    if (formData.responsable_id !== null) fd.append('responsable_id', String(formData.responsable_id))
    if (formData.estado_jira_id !== null) fd.append('estado_jira_id', String(formData.estado_jira_id))
    fd.append('tipo_sd', formData.tipo_sd || '')
    if (formData.aplicacion_id !== null) fd.append('aplicacion_id', String(formData.aplicacion_id))
    if (formData.producto_id !== null) fd.append('producto_id', String(formData.producto_id))
    fd.append('dni', formData.dni || '')
    fd.append('poliza', formData.poliza || '')
    fd.append('comentario', formData.comentario || '')
    if (formData.horas_invertidas !== null) fd.append('horas_invertidas', String(formData.horas_invertidas))
    fd.append('observaciones', formData.observaciones || '')
    fd.append('horario_laboral', formData.horario_laboral || '')
    fd.append('fecha_registro', fromInputDateTime(toInputDateTime(formData.fecha_registro)) || '')
    fd.append('fecha_creacion_sd', fromInputDateTime(toInputDateTime(formData.fecha_creacion_sd)) || '')
    fd.append('fecha_asignacion', fromInputDateTime(toInputDateTime(formData.fecha_asignacion)) || '')
    fd.append('fecha_maxima_atencion', fromInputDateTime(toInputDateTime(formData.fecha_maxima_atencion)) || '')
    fd.append('fecha_atencion', fromInputDateTime(toInputDateTime(formData.fecha_atencion)) || '')
    fd.append('fecha_delegacion', fromInputDateTime(toInputDateTime(formData.fecha_delegacion)) || '')

    startTransition(async () => {
      const response = await saveTicketAction(null, fd)

      if (!response.success) {
        setError(response.error || 'No se pudo guardar el ticket')
        return
      }

      if (response.sla) {
        setSlaInfo(response.sla)
      }

      closeModal()
    })
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div>
              <h2 className={styles.title}>
                {isEditing ? `Ticket SD-${formData.numero_ticket ?? ''}` : 'Nuevo Ticket'}
              </h2>
              <p className={styles.subtitle}>
                {isEditing ? 'Edición de ticket existente' : 'Registro de nuevo ticket'}
              </p>
            </div>

            {isEditing && formData.estado_id && catalogs?.estados && (
              <span className={styles.statusBadge}>
                {catalogs.estados.find((estado) => estado.id === formData.estado_id)?.nombre || 'Estado'}
              </span>
            )}
          </div>

          <button type="button" className={styles.closeButton} onClick={closeModal}>
            ×
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingBox}>Cargando información del ticket...</div>
        ) : (
          <>
            <div className={styles.body}>
              <div className={styles.formColumn}>
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>Detalles del Ticket</h3>

                  <div className={styles.grid}>
                    {!isEditing && (
                      <div className={styles.field}>
                        <label className={styles.label}>Número de Ticket *</label>
                        <input
                          className={styles.input}
                          type="number"
                          name="numero_ticket"
                          value={formData.numero_ticket ?? ''}
                          onChange={handleChange}
                        />
                      </div>
                    )}

                    <div className={styles.field}>
                      <label className={styles.label}>Tipo</label>
                      <select
                        className={styles.input}
                        name="tipo_sd"
                        value={formData.tipo_sd || ''}
                        onChange={handleChange}
                      >
                        <option value="">Seleccione...</option>
                        <option value="Solicitud">Solicitud</option>
                        <option value="Incidente">Incidente</option>
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Producto</label>
                      <select
                        className={styles.input}
                        name="producto_id"
                        value={formData.producto_id ?? ''}
                        onChange={handleChange}
                      >
                        <option value="">Seleccione...</option>
                        {catalogs?.productos.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={`${styles.field} ${styles.full}`}>
                      <label className={styles.label}>Descripción *</label>
                      <textarea
                        className={styles.textarea}
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleChange}
                        rows={4}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>DNI</label>
                      <input
                        className={styles.input}
                        type="text"
                        name="dni"
                        value={formData.dni || ''}
                        onChange={handleChange}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Póliza</label>
                      <input
                        className={styles.input}
                        type="text"
                        name="poliza"
                        value={formData.poliza || ''}
                        onChange={handleChange}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Responsable</label>
                      <select
                        className={styles.input}
                        name="responsable_id"
                        value={formData.responsable_id ?? ''}
                        onChange={handleChange}
                      >
                        <option value="">Sin asignar</option>
                        {catalogs?.usuarios.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Estado principal {!isEditing && '*'}</label>
                      <select
                        className={styles.input}
                        name="estado_id"
                        value={formData.estado_id ?? ''}
                        onChange={handleChange}
                      >
                        <option value="">Seleccione...</option>
                        {catalogs?.estados.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Aplicación</label>
                      <select
                        className={styles.input}
                        name="aplicacion_id"
                        value={formData.aplicacion_id ?? ''}
                        onChange={handleChange}
                      >
                        <option value="">Seleccione...</option>
                        {catalogs?.aplicaciones.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Estado Jira</label>
                      <select
                        className={styles.input}
                        name="estado_jira_id"
                        value={formData.estado_jira_id ?? ''}
                        onChange={handleChange}
                      >
                        <option value="">Seleccione...</option>
                        {catalogs?.estadosJira.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Horas invertidas</label>
                      <input
                        className={styles.input}
                        type="number"
                        step="0.5"
                        name="horas_invertidas"
                        value={formData.horas_invertidas ?? ''}
                        onChange={handleChange}
                      />
                    </div>

                    <div className={`${styles.field} ${styles.full}`}>
                      <label className={styles.label}>Comentario</label>
                      <textarea
                        className={styles.textarea}
                        name="comentario"
                        value={formData.comentario || ''}
                        onChange={handleChange}
                        rows={2}
                      />
                    </div>

                    <div className={`${styles.field} ${styles.full}`}>
                      <label className={styles.label}>Observaciones</label>
                      <textarea
                        className={styles.textarea}
                        name="observaciones"
                        value={formData.observaciones || ''}
                        onChange={handleChange}
                        rows={3}
                      />
                    </div>
                  </div>
                </section>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>Control de Tiempos y SLA</h3>

                  <div className={styles.grid}>
                    <div className={styles.field}>
                      <label className={styles.label}>Horario laboral</label>
                      <input
                        className={styles.inputDisabled}
                        type="text"
                        name="horario_laboral"
                        value={formData.horario_laboral || ''}
                        disabled
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Fecha de delegación</label>
                      <input
                        className={styles.input}
                        type="datetime-local"
                        name="fecha_delegacion"
                        value={toInputDateTime(formData.fecha_delegacion)}
                        onChange={handleChange}
                      />
                    </div>

                    <div className={styles.fieldHighlightBlue}>
                      <label className={styles.labelHighlightBlue}>Fecha creación SD</label>
                      <input
                        className={styles.input}
                        type="datetime-local"
                        name="fecha_creacion_sd"
                        value={toInputDateTime(formData.fecha_creacion_sd)}
                        onChange={handleChange}
                      />
                    </div>

                    <div className={styles.fieldHighlightBlue}>
                      <label className={styles.labelHighlightBlue}>Fecha asignación</label>
                      <input
                        className={styles.input}
                        type="datetime-local"
                        name="fecha_asignacion"
                        value={toInputDateTime(formData.fecha_asignacion)}
                        onChange={handleChange}
                      />
                      {slaInfo.asignacionMensaje && (
                        <span
                          className={
                            slaInfo.asignacionExcede
                              ? styles.inlineAlertWarning
                              : styles.inlineAlertSuccess
                          }
                        >
                          {slaInfo.asignacionMensaje}
                        </span>
                      )}
                    </div>

                    <div className={styles.fieldHighlightOrange}>
                      <label className={styles.labelHighlightOrange}>Fecha máxima atención</label>
                      <input
                        className={styles.input}
                        type="datetime-local"
                        name="fecha_maxima_atencion"
                        value={toInputDateTime(formData.fecha_maxima_atencion)}
                        onChange={handleChange}
                      />
                      {slaInfo.atencionMensaje && (
                        <span
                          className={
                            slaInfo.atencionIncumpleMinimo
                              ? styles.inlineAlertError
                              : styles.inlineAlertSuccess
                          }
                        >
                          {slaInfo.atencionMensaje}
                        </span>
                      )}
                    </div>

                    <div className={styles.fieldHighlightGreen}>
                      <label className={styles.labelHighlightGreen}>Fecha atención</label>
                      <input
                        className={styles.input}
                        type="datetime-local"
                        name="fecha_atencion"
                        value={toInputDateTime(formData.fecha_atencion)}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </section>
              </div>

              <aside className={styles.sidebar}>
                <h3 className={styles.sectionTitle}>Historial</h3>

                {!isEditing ? (
                  <div className={styles.emptyState}>
                    El historial aparecerá una vez que se cree el ticket.
                  </div>
                ) : history.length === 0 ? (
                  <div className={styles.emptyState}>
                    Aún no hay movimientos registrados.
                  </div>
                ) : (
                  <div className={styles.historyList}>
                    {history.map((item) => (
                      <div key={item.id} className={styles.historyItem}>
                        <div className={`${styles.historyBadge} ${getActionTone(item.accion)}`}>
                          {item.accion}
                        </div>
                        <p className={styles.historyDescription}>
                          {item.descripcion_cambio || 'Sin detalle adicional.'}
                        </p>
                        <p className={styles.historyMeta}>
                          {formatHistoryDate(item.fecha_movimiento)} • {item.usuario_nombre || 'Usuario'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>

            <div className={styles.footer}>
              <div className={styles.footerAlerts}>
                {footerAlerts.map((alert, index) => (
                  <div
                    key={`${alert.type}-${index}`}
                    className={`${styles.footerAlert} ${
                      alert.type === 'error'
                        ? styles.footerAlertError
                        : styles.footerAlertWarning
                    }`}
                  >
                    {alert.text}
                  </div>
                ))}
              </div>

              <div className={styles.footerActions}>
                <button type="button" className={styles.secondaryButton} onClick={closeModal}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSubmit}
                  disabled={isPending}
                >
                  {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Ticket'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}