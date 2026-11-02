'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Calendar,
  User,
  Send,
  Loader2,
  ShieldCheck,
  History,
  ArrowRight,
  Info
} from 'lucide-react'
import { getTareaCicloVidaAction, registrarAuditoriaCicloVidaAction } from '../actions/tareo.action'
import styles from '../styles/public-report.module.css'

interface TareaCicloVidaModalProps {
  isOpen: boolean
  onClose: () => void
  tarea: {
    tarea_id: number
    tarea_periodo_id: number
    tarea_nombre: string
    proyecto_nombre?: string
    solicitante_nombre?: string
    team_nombre?: string
    totalHoras?: number
    estado_nombre?: string
  } | null
  onStateChanged?: (tareaPeriodoId: number, nuevoEstado: string) => void
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
    desc: 'Nacimiento de la tarea asignada en el tareo operativo.'
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

  useEffect(() => {
    if (!isOpen || !tarea) return

    setEstadoActual(tarea.estado_nombre || 'Pendiente')
    setMotivo('')
    setSuccessMsg('')
    setErrorMsg('')

    // Establecer estado sugerido según el ciclo
    const cur = (tarea.estado_nombre || 'Pendiente').toLowerCase()
    if (cur.includes('observ')) setNuevoEstado('Actualizado')
    else if (cur.includes('actualiz')) setNuevoEstado('Aprobado')
    else if (cur.includes('aprob') || cur.includes('conform')) setNuevoEstado('Observado')
    else setNuevoEstado('Observado')

    const fetchHistorial = async () => {
      setLoading(true)
      const res = await getTareaCicloVidaAction(tarea.tarea_id, tarea.tarea_periodo_id)
      if (res.success && res.data) {
        setHistorial(res.data)
      } else {
        setHistorial([])
      }
      setLoading(false)
    }

    fetchHistorial()
  }, [isOpen, tarea])

  if (!isOpen || !tarea) return null

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
        tareaId: tarea.tarea_id,
        tareaPeriodoId: tarea.tarea_periodo_id,
        nuevoEstado,
        actor,
        motivo: motivo.trim()
      })

      if (res.success) {
        setEstadoActual(nuevoEstado)
        setSuccessMsg(`Estado actualizado a "${nuevoEstado}" y registrado en el ciclo de vida.`)
        setMotivo('')

        // Refrescar historial
        const histRes = await getTareaCicloVidaAction(tarea.tarea_id, tarea.tarea_periodo_id)
        if (histRes.success && histRes.data) {
          setHistorial(histRes.data)
        }

        if (onStateChanged) {
          onStateChanged(tarea.tarea_periodo_id, nuevoEstado)
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
              <span>Auditoría de Ciclo de Vida</span>
            </div>
            <h3 className={styles.cicloVidaTitle}>{tarea.tarea_nombre}</h3>
            <div className={styles.cicloVidaMeta}>
              <span>{tarea.proyecto_nombre || 'Sin Proyecto'}</span>
              <span>•</span>
              <span>{tarea.solicitante_nombre || 'Sin Solicitante'}</span>
              <span>•</span>
              <span>{tarea.team_nombre || 'Sin Equipo'}</span>
              <span>•</span>
              <strong>{(tarea.totalHoras || 0).toFixed(2)} hrs</strong>
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
        <div className={styles.cicloVidaBody}>
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
                <Send size={15} color="#0f3d3e" />
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                  Registrar Cambio de Estado y Auditoría
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Registra trazabilidad con hora y responsable
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
                  <option value="Actualizado">Actualizado (Dev ajustó la tarea)</option>
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
                placeholder="Describe la razón del cambio de estado, detalle observado o justificación del visto bueno..."
                className={styles.transicionTextarea}
                rows={2}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={saving}
                className={styles.btnRegistrarAuditoria}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className={styles.spin} />
                    <span>Guardando...</span>
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

          {/* 3. Timeline de Auditoría */}
          <div className={styles.timelineSection}>
            <div className={styles.timelineHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={16} color="#0f3d3e" />
                <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                  Línea de Tiempo y Auditoría
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {historial.length} evento{historial.length !== 1 ? 's' : ''} registrado{historial.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                <Loader2 size={24} className={styles.spin} style={{ margin: '0 auto 8px' }} />
                <span>Cargando auditoría...</span>
              </div>
            ) : (
              <div className={styles.timelineList}>
                {/* Evento Génesis (Nacimiento de la tarea) */}
                <div className={styles.timelineItem}>
                  <div className={styles.timelineNode}>
                    <div
                      className={styles.timelineDot}
                      style={{ background: '#b45309', borderColor: '#fef3c7' }}
                    />
                    <div className={styles.timelineConnector} />
                  </div>
                  <div className={styles.timelineCard}>
                    <div className={styles.timelineTop}>
                      <span className={styles.timelineActionBadge} style={{ background: '#fef3c7', color: '#92400e' }}>
                        Nacimiento de la Tarea
                      </span>
                      <span className={styles.timelineDate}>
                        <Calendar size={11} />
                        Estado Inicial: Pendiente
                      </span>
                    </div>
                    <div className={styles.timelineDesc}>
                      La tarea fue registrada en el sistema con un estado inicial <strong>Pendiente</strong>, lista para ejecución y posterior supervisión de Protecta Security.
                    </div>
                  </div>
                </div>

                {/* Eventos registrados en BD */}
                {historial.map((item) => {
                  const accionUpper = (item.accion || '').toUpperCase()
                  let badgeBg = '#f1f5f9'
                  let badgeColor = '#475569'
                  if (accionUpper.includes('OBSERV')) {
                    badgeBg = '#fee2e2'
                    badgeColor = '#b91c1c'
                  } else if (accionUpper.includes('APROB') || accionUpper.includes('CONFORM')) {
                    badgeBg = '#dcfce7'
                    badgeColor = '#15803d'
                  } else if (accionUpper.includes('ACTUALIZ')) {
                    badgeBg = '#dbeafe'
                    badgeColor = '#1d4ed8'
                  } else if (accionUpper.includes('PEND')) {
                    badgeBg = '#fef3c7'
                    badgeColor = '#92400e'
                  }

                  return (
                    <div key={item.id} className={styles.timelineItem}>
                      <div className={styles.timelineNode}>
                        <div
                          className={styles.timelineDot}
                          style={{ background: badgeColor, borderColor: badgeBg }}
                        />
                        <div className={styles.timelineConnector} />
                      </div>
                      <div className={styles.timelineCard}>
                        <div className={styles.timelineTop}>
                          <span
                            className={styles.timelineActionBadge}
                            style={{ background: badgeBg, color: badgeColor }}
                          >
                            {item.accion}
                          </span>
                          <span className={styles.timelineDate}>
                            <Clock size={11} />
                            {formatFecha(item.fecha_movimiento)}
                          </span>
                        </div>
                        <div className={styles.timelineDesc}>{item.descripcion}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.cicloVidaFooter}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <Info size={14} />
            <span>Toda modificación queda auditada permanentemente para revisión entre Protecta y DM Software.</span>
          </div>
          <button
            type="button"
            className={styles.btnCerrarModal}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

