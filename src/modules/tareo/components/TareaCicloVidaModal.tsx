'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  Send,
  Loader2,
  ShieldCheck,
  History,
  Info
} from 'lucide-react'
import { getEntidadCicloVidaAction, registrarAuditoriaCicloVidaAction } from '../actions/tareo.action'
import styles from '../styles/public-report.module.css'

export interface CicloVidaModalItem {
  tipo: 'TAREA' | 'REGISTRO'
  id: number // tarea_periodo_id o registro_id
  tarea_id?: number
  registro_id?: number
  nombre: string
  fecha?: string
  trabajador_nombre?: string
  proyecto_nombre?: string
  solicitante_nombre?: string
  team_nombre?: string
  totalHoras?: number
  estado_nombre?: string
}

interface TareaCicloVidaModalProps {
  isOpen: boolean
  onClose: () => void
  item?: CicloVidaModalItem | null
  tarea?: {
    tarea_id: number
    tarea_periodo_id: number
    tarea_nombre: string
    proyecto_nombre?: string
    solicitante_nombre?: string
    team_nombre?: string
    totalHoras?: number
    estado_nombre?: string
  } | null
  onStateChanged?: (id: number, nuevoEstado: string, tipo?: 'TAREA' | 'REGISTRO') => void
}

interface EventoAuditoria {
  id: number
  entidad: string
  entidad_id: number
  accion: string
  descripcion: string
  fecha_movimiento: string
}

const ESTADOS_INFO = {
  Pendiente: {
    label: 'Pendiente',
    step: 1,
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fcd34d',
    desc: 'Nacimiento de la tarea o registro en el tareo operativo.'
  },
  Observado: {
    label: 'Observado',
    step: 2,
    color: '#b91c1c',
    bg: '#fee2e2',
    border: '#fca5a5',
    desc: 'Observación o solicitud de revisión registrada por Protecta.'
  },
  Actualizado: {
    label: 'Actualizado',
    step: 3,
    color: '#1d4ed8',
    bg: '#dbeafe',
    border: '#93c5fd',
    desc: 'Respuesta, aclaración o ajuste técnico del equipo Dev (DM Software).'
  },
  Aprobado: {
    label: 'Aprobado',
    step: 4,
    color: '#15803d',
    bg: '#dcfce7',
    border: '#86efac',
    desc: 'Conformidad y aprobación final otorgada por supervisión.'
  }
}

export default function TareaCicloVidaModal({
  isOpen,
  onClose,
  item,
  tarea,
  onStateChanged
}: TareaCicloVidaModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [historial, setHistorial] = useState<EventoAuditoria[]>([])
  const [estadoActual, setEstadoActual] = useState('Pendiente')
  const [nuevoEstado, setNuevoEstado] = useState('Observado')
  const [motivo, setMotivo] = useState('')
  const [actor, setActor] = useState('Supervisor Protecta')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const bodyRef = React.useRef<HTMLDivElement>(null)

  const activeItem: CicloVidaModalItem | null = item || (tarea ? {
    tipo: 'TAREA',
    id: tarea.tarea_periodo_id,
    tarea_id: tarea.tarea_id,
    nombre: tarea.tarea_nombre,
    proyecto_nombre: tarea.proyecto_nombre,
    solicitante_nombre: tarea.solicitante_nombre,
    team_nombre: tarea.team_nombre,
    totalHoras: tarea.totalHoras,
    estado_nombre: tarea.estado_nombre
  } : null)

  useEffect(() => {
    if (isOpen && bodyRef.current) {
      bodyRef.current.scrollTop = 0
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !activeItem) return

    setEstadoActual(activeItem.estado_nombre || 'Pendiente')
    setMotivo('')
    setSuccessMsg('')
    setErrorMsg('')

    // Establecer estado sugerido según el ciclo inicial
    const cur = (activeItem.estado_nombre || 'Pendiente').toLowerCase()
    if (cur.includes('observ')) setNuevoEstado('Actualizado')
    else if (cur.includes('actualiz')) setNuevoEstado('Aprobado')
    else if (cur.includes('aprob') || cur.includes('conform')) setNuevoEstado('Observado')
    else setNuevoEstado('Observado')

    const fetchHistorial = async () => {
      setLoading(true)
      const res = await getEntidadCicloVidaAction({
        tipo: activeItem.tipo,
        id: activeItem.id,
        tareaId: activeItem.tarea_id
      })
      if (res.success && res.data) {
        setHistorial(res.data)

        // Resolver el estado más reciente directamente desde los eventos auditados en la BD
        let resolvedEstado = activeItem.estado_nombre || 'Pendiente'
        for (let i = res.data.length - 1; i >= 0; i--) {
          const acc = (res.data[i].accion || '').toLowerCase()
          if (acc.includes('observ')) {
            resolvedEstado = 'Observado'
            break
          } else if (acc.includes('actualiz')) {
            resolvedEstado = 'Actualizado'
            break
          } else if (acc.includes('aprob') || acc.includes('conform')) {
            resolvedEstado = 'Aprobado'
            break
          } else if (acc.includes('pend')) {
            resolvedEstado = 'Pendiente'
            break
          }
        }

        setEstadoActual(resolvedEstado)

        // Ajustar el próximo estado sugerido
        const resLower = resolvedEstado.toLowerCase()
        if (resLower.includes('observ')) setNuevoEstado('Actualizado')
        else if (resLower.includes('actualiz')) setNuevoEstado('Aprobado')
        else if (resLower.includes('aprob') || resLower.includes('conform')) setNuevoEstado('Observado')
        else setNuevoEstado('Observado')

        // Sincronizar el estado resuelto hacia la tabla principal
        if (onStateChanged && resolvedEstado !== activeItem.estado_nombre) {
          onStateChanged(activeItem.id, resolvedEstado, activeItem.tipo)
        }
      } else {
        setHistorial([])
      }
      setLoading(false)
    }

    fetchHistorial()
  }, [isOpen, activeItem?.id, activeItem?.tipo])

  if (!isOpen || !activeItem) return null

  const currentStep = ESTADOS_INFO[estadoActual as keyof typeof ESTADOS_INFO]?.step || 1

  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motivo.trim()) {
      setErrorMsg('Por favor ingresa un comentario o motivo para la auditoría.')
      return
    }

    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await registrarAuditoriaCicloVidaAction({
        tipo: activeItem.tipo,
        id: activeItem.id,
        tareaId: activeItem.tarea_id,
        registroId: activeItem.registro_id || (activeItem.tipo === 'REGISTRO' ? activeItem.id : undefined),
        tareaPeriodoId: activeItem.tipo === 'TAREA' ? activeItem.id : undefined,
        nuevoEstado,
        actor,
        motivo: motivo.trim()
      })

      if (res.success) {
        setEstadoActual(nuevoEstado)
        setSuccessMsg(`Estado actualizado a "${nuevoEstado}" y registrado en el ciclo de vida.`)
        setMotivo('')

        // Refrescar historial
        const histRes = await getEntidadCicloVidaAction({
          tipo: activeItem.tipo,
          id: activeItem.id,
          tareaId: activeItem.tarea_id
        })
        if (histRes.success && histRes.data) {
          setHistorial(histRes.data)
        }

        if (onStateChanged) {
          onStateChanged(activeItem.id, nuevoEstado, activeItem.tipo)
        }
      } else {
        setErrorMsg(res.error || 'No se pudo registrar la auditoría.')
      }
    } catch {
      setErrorMsg('Error de conexión al guardar el registro de auditoría.')
    } finally {
      setSaving(false)
    }
  }

  const formatFecha = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoStr
    }
  }

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.cicloVidaModal}>
        {/* Header */}
        <div className={styles.cicloVidaHeader}>
          <div className={styles.cicloVidaHeaderTitleBox}>
            <div className={styles.cicloVidaBadge}>
              <ShieldCheck size={14} />
              <span>
                Auditoría de Ciclo de Vida ({activeItem.tipo === 'REGISTRO' ? 'Registro Diario' : 'Tarea General'})
              </span>
            </div>
            <h3 className={styles.cicloVidaTitle}>{activeItem.nombre}</h3>
            <div className={styles.cicloVidaMeta}>
              {activeItem.fecha && (
                <>
                  <span>Fecha: <strong>{activeItem.fecha}</strong></span>
                  <span>•</span>
                </>
              )}
              {activeItem.trabajador_nombre && (
                <>
                  <span>Trabajador: <strong>{activeItem.trabajador_nombre}</strong></span>
                  <span>•</span>
                </>
              )}
              <span>{activeItem.proyecto_nombre || 'Sin Proyecto'}</span>
              <span>•</span>
              <span>{activeItem.solicitante_nombre || 'Sin Solicitante'}</span>
              {activeItem.team_nombre && (
                <>
                  <span>•</span>
                  <span>{activeItem.team_nombre}</span>
                </>
              )}
              <span>•</span>
              <strong>{(activeItem.totalHoras || 0).toFixed(2)} hrs</strong>
            </div>
          </div>
          <button
            type="button"
            className={styles.cicloVidaCloseBtn}
            onClick={onClose}
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.cicloVidaBody} ref={bodyRef}>
          {/* 1. Stepper Visual del Ciclo de Vida */}
          <div className={styles.stepperContainer}>
            <div className={styles.stepperHeader}>
              <span className={styles.stepperTitle}>Flujo del Ciclo de Vida</span>
              <span
                className={styles.currentStatusPill}
                style={{
                  color: ESTADOS_INFO[estadoActual as keyof typeof ESTADOS_INFO]?.color || '#475569',
                  background: ESTADOS_INFO[estadoActual as keyof typeof ESTADOS_INFO]?.bg || '#f1f5f9',
                  borderColor: ESTADOS_INFO[estadoActual as keyof typeof ESTADOS_INFO]?.border || '#cbd5e1'
                }}
              >
                Fase Actual: {estadoActual}
              </span>
            </div>

            <div className={styles.stepperTrack}>
              {Object.entries(ESTADOS_INFO).map(([key, info], idx) => {
                const isPassed = currentStep > info.step
                const isCurrent = currentStep === info.step

                return (
                  <React.Fragment key={key}>
                    <div className={styles.stepperNode}>
                      <div
                        className={`${styles.stepperCircle} ${
                          isCurrent
                            ? styles.stepperCircleCurrent
                            : isPassed
                            ? styles.stepperCirclePassed
                            : styles.stepperCircleUpcoming
                        }`}
                        style={{
                          borderColor: isCurrent || isPassed ? info.color : '#cbd5e1',
                          background: isCurrent ? info.color : isPassed ? info.bg : '#ffffff',
                          color: isCurrent ? '#ffffff' : isPassed ? info.color : '#94a3b8'
                        }}
                      >
                        {isPassed ? (
                          <CheckCircle2 size={16} />
                        ) : isCurrent ? (
                          <span>{info.step}</span>
                        ) : (
                          <span>{info.step}</span>
                        )}
                      </div>
                      <span
                        className={styles.stepperLabel}
                        style={{
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? info.color : '#475569'
                        }}
                      >
                        {info.label}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div
                        className={`${styles.stepperLine} ${
                          currentStep > idx + 1 ? styles.stepperLineActive : ''
                        }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* 2. Formulario de Transición / Nueva Auditoría */}
          <form className={styles.transicionCard} onSubmit={handleRegistrar}>
            <div className={styles.transicionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={16} color="#0f3d3e" />
                <span className={styles.transicionTitle}>
                  Registrar Observación / Transición ({activeItem.tipo === 'REGISTRO' ? 'Registro Diario' : 'Tarea'})
                </span>
              </div>
              <span className={styles.transicionSubtitle}>
                Los cambios se auditan permanentemente en el historial.
              </span>
            </div>

            {successMsg && (
              <div className={styles.alertSuccess}>
                <CheckCircle2 size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className={styles.alertError}>
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className={styles.transicionGrid}>
              <div className={styles.transicionField}>
                <label className={styles.transicionLabel}>Nuevo Estado</label>
                <select
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                  className={styles.transicionSelect}
                >
                  <option value="Observado">Observado (Requiere revisión)</option>
                  <option value="Actualizado">Actualizado (Dev ajustó la tarea o registro)</option>
                  <option value="Aprobado">Aprobado (Visto bueno final)</option>
                  <option value="Pendiente">Pendiente (Reabrir ciclo)</option>
                </select>
              </div>

              <div className={styles.transicionField}>
                <label className={styles.transicionLabel}>Actor / Responsable</label>
                <select
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  className={styles.transicionSelect}
                >
                  <option value="Supervisor Protecta">Supervisor Protecta</option>
                  <option value="Equipo Dev DM Software">Equipo Dev DM Software</option>
                  <option value="Auditor Externo">Auditor Externo</option>
                  <option value="Líder de Proyecto">Líder de Proyecto</option>
                </select>
              </div>
            </div>

            <div className={styles.transicionField}>
              <label className={styles.transicionLabel}>
                Detalle / Motivo de la Observación o Actualización
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={
                  activeItem.tipo === 'REGISTRO'
                    ? 'Indica el motivo de la observación o ajuste técnico sobre este registro diario específico...'
                    : 'Indica el motivo de la observación, aclaración técnica o aprobación de la tarea...'
                }
                rows={3}
                className={styles.transicionTextarea}
              />
            </div>

            <div className={styles.transicionActions}>
              <button
                type="submit"
                disabled={saving || !motivo.trim()}
                className={styles.btnRegistrarTransicion}
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className={styles.spin} />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Registrar en Ciclo de Vida</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* 3. Línea de Tiempo de Auditoría */}
          <div className={styles.timelineSection}>
            <div className={styles.timelineHeader}>
              <span className={styles.timelineTitle}>Línea de Tiempo y Eventos Registrados</span>
              <span className={styles.timelineCount}>
                {historial.length} evento(s) auditado(s)
              </span>
            </div>

            {loading ? (
              <div className={styles.timelineLoading}>
                <Loader2 size={24} className={styles.spin} color="#0f3d3e" />
                <span>Cargando auditoría...</span>
              </div>
            ) : (
              <div className={styles.timelineList}>
                {(!historial || historial.length === 0 || !historial.some(h => (h.accion || '').toUpperCase().includes('CREA'))) && (
                  <div className={styles.historialGenesis}>
                    <div className={styles.historialIconGenesis}>
                      <Clock size={16} />
                    </div>
                    <div className={styles.historialContent}>
                      <div className={styles.historialHeaderItem}>
                        <span className={styles.historialBadgeInit}>INICIO</span>
                        <span className={styles.historialDate}>{activeItem.fecha || 'Inicio de ciclo'}</span>
                      </div>
                      <p className={styles.historialDesc}>
                        {activeItem.tipo === 'REGISTRO'
                          ? `Registro diario creado con estado inicial "Pendiente".`
                          : `Tarea creada e incorporada al período operativo en estado inicial "Pendiente".`}
                      </p>
                    </div>
                  </div>
                )}

                {historial.map((h, i) => {
                      const accionUpper = (h.accion || '').toUpperCase()
                      let badgeColor = '#b45309'
                      let badgeBg = '#fef3c7'

                      if (accionUpper.includes('OBSERV')) {
                        badgeColor = '#b91c1c'
                        badgeBg = '#fee2e2'
                      } else if (accionUpper.includes('ACTUALIZ')) {
                        badgeColor = '#1d4ed8'
                        badgeBg = '#dbeafe'
                      } else if (accionUpper.includes('APROB') || accionUpper.includes('CONFORM')) {
                        badgeColor = '#15803d'
                        badgeBg = '#dcfce7'
                      }

                      return (
                        <div key={h.id || i} className={styles.historialItem}>
                          <div
                            className={styles.historialDot}
                            style={{ borderColor: badgeColor }}
                          />
                          <div className={styles.historialContent}>
                            <div className={styles.historialHeaderItem}>
                              <span
                                className={styles.historialAccionBadge}
                                style={{ color: badgeColor, background: badgeBg }}
                              >
                                {h.accion}
                              </span>
                              <span className={styles.historialDate}>
                                {formatFecha(h.fecha_movimiento)}
                              </span>
                            </div>
                            <p className={styles.historialDesc}>{h.descripcion}</p>
                          </div>
                        </div>
                      )
                    })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
