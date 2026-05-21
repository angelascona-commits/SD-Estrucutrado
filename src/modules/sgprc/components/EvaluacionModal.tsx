'use client'

import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import styles from './EvaluacionModal.module.css'
import type { Solicitud, EvaluacionFormData } from '../interfaces/sgprc.interfaces'
import { saveEvaluacionAction, updateSolicitudEstadoAction } from '../actions/sgprc.action'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  solicitud: Solicitud
  rolEvaluador: 'infraestructura' | 'ciberseguridad'
}

export default function EvaluacionModal({ isOpen, onClose, onSuccess, solicitud, rolEvaluador }: Props) {
  const [loading, setLoading] = useState(false)
  const [presupuesto, setPresupuesto] = useState('0')
  const [integracionesDetalle, setIntegracionesDetalle] = useState('')
  const [reglasPerimetrales, setReglasPerimetrales] = useState('')
  const [comentarios, setComentarios] = useState('')

  useEffect(() => {
    if (solicitud && solicitud.evaluacion) {
      setPresupuesto(String(solicitud.evaluacion.presupuesto || '0'))
      setIntegracionesDetalle(solicitud.evaluacion.integraciones_detalle || '')
      setReglasPerimetrales(solicitud.evaluacion.reglas_perimetrales || '')
      setComentarios(solicitud.evaluacion.comentarios || '')
    } else {
      setPresupuesto('0')
      setIntegracionesDetalle('')
      setReglasPerimetrales('')
      setComentarios('')
    }
  }, [solicitud, isOpen])

  if (!isOpen) return null

  const handleAction = async (decision: 'Aprobar' | 'Rechazar') => {
    // Si se rechaza, los comentarios de rechazo son obligatorios
    if (decision === 'Rechazar') {
      const { value: text } = await Swal.fire({
        title: 'Motivo de Rechazo',
        input: 'textarea',
        inputLabel: 'Por favor, ingrese el sustento o retroalimentación del rechazo (Requerido para auditoría ISO):',
        inputPlaceholder: 'Escriba aquí los detalles...',
        inputAttributes: {
          'aria-label': 'Ingrese el motivo del rechazo'
        },
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Rechazar Solicitud',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'El motivo de rechazo es estrictamente obligatorio.'
          }
        }
      })

      if (!text) return // Canceló el SweetAlert2

      setLoading(true)

      try {
        // Guardamos primero la evaluación actual con el motivo
        const evalPayload: EvaluacionFormData = {
          solicitud_id: solicitud.id,
          presupuesto: Number(presupuesto || 0),
          integraciones_detalle: rolEvaluador === 'infraestructura' ? `Rechazado: ${text}` : integracionesDetalle,
          reglas_perimetrales: rolEvaluador === 'ciberseguridad' ? `Rechazado: ${text}` : reglasPerimetrales,
          comentarios: text,
          rol_evaluador: rolEvaluador
        }

        await saveEvaluacionAction(evalPayload)
        const res = await updateSolicitudEstadoAction(solicitud.id, 'Rechazado', text)

        if (res.success) {
          Swal.fire({
            icon: 'error',
            title: 'Solicitud Rechazada',
            text: 'Se ha registrado el rechazo y se notificará al orquestador técnico.',
            confirmButtonColor: '#ef4444'
          })
          onSuccess()
          onClose()
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: res.error || 'Ocurrió un error inesperado al actualizar el estado.',
            confirmButtonColor: 'var(--primary, #ec5b13)'
          })
        }
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error Inesperado',
          text: err.message,
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
      } finally {
        setLoading(false)
      }
      return
    }

    // Proceso de Aprobación
    if (rolEvaluador === 'infraestructura') {
      if (isNaN(Number(presupuesto)) || Number(presupuesto) < 0) {
        Swal.fire({ icon: 'error', title: 'Presupuesto Inválido', text: 'El presupuesto debe ser un número positivo.', confirmButtonColor: 'var(--primary, #ec5b13)' })
        return
      }
      if (!integracionesDetalle.trim()) {
        Swal.fire({ icon: 'error', title: 'Faltan Datos', text: 'Debe especificar el mapa de interconexión técnica.', confirmButtonColor: 'var(--primary, #ec5b13)' })
        return
      }
    } else {
      if (!reglasPerimetrales.trim()) {
        Swal.fire({ icon: 'error', title: 'Faltan Datos', text: 'Debe especificar las reglas perimetrales aplicadas.', confirmButtonColor: 'var(--primary, #ec5b13)' })
        return
      }
    }

    setLoading(true)

    try {
      const evalPayload: EvaluacionFormData = {
        solicitud_id: solicitud.id,
        presupuesto: Number(presupuesto || 0),
        integraciones_detalle: integracionesDetalle,
        reglas_perimetrales: reglasPerimetrales,
        comentarios: comentarios || 'Pre-aprobado y validado en conformidad.',
        rol_evaluador: rolEvaluador
      }

      // Guardamos la evaluación
      await saveEvaluacionAction(evalPayload)

      // Transición de estado:
      // Infraestructura -> Pendiente Ciberseguridad
      // Ciberseguridad -> Aprobado
      const siguienteEstado = rolEvaluador === 'infraestructura' ? 'Pendiente Ciberseguridad' : 'Aprobado'
      const res = await updateSolicitudEstadoAction(
        solicitud.id,
        siguienteEstado,
        rolEvaluador === 'infraestructura'
          ? 'Pre-aprobación de Infraestructura y viabilidad financiera'
          : 'Aprobación final de Ciberseguridad con reglas perimetrales aplicadas'
      )

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: rolEvaluador === 'infraestructura' ? 'Pre-aprobado' : 'Aprobación Final Exitosa',
          text: rolEvaluador === 'infraestructura'
            ? 'La solicitud avanzó al área de Ciberseguridad.'
            : 'El recurso y permisos cloud han sido plenamente autorizados para su despliegue.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
        onSuccess()
        onClose()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || 'Ocurrió un error al actualizar el estado.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error Crítico',
        text: err.message,
        confirmButtonColor: 'var(--primary, #ec5b13)'
      })
    } finally {
      setLoading(false)
    }
  }

  const isInfra = rolEvaluador === 'infraestructura'

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleBox}>
            <h2 className={styles.title}>
              {isInfra ? 'Evaluación Técnica de Infraestructura' : 'Aprobación Final de Ciberseguridad'}
            </h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.solicitudSummary}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Proyectista:</span>
              <span className={styles.summaryValue}>{solicitud.proyectista_nombre}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Negocio:</span>
              <span className={styles.summaryValue}>{solicitud.descripcion_negocio}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Sustento:</span>
              <span className={styles.summaryValue} style={{ fontStyle: 'italic' }}>"{solicitud.sustento_tecnico}"</span>
            </div>
          </div>

          {isInfra ? (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Presupuesto Mensual Estimado (S/.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={presupuesto}
                  onChange={(e) => setPresupuesto(e.target.value)}
                  className={styles.input}
                  required
                />
                <p className={styles.helpText}>Registre el costo financiero estimado del aprovisionamiento.</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Interconexión Técnica e Integraciones</label>
                <textarea
                  placeholder="Especifique con qué sistemas/APIs existentes se integrará el componente. Ej: Interconexión con API Core Protecta, consumo de BD de Clientes..."
                  value={integracionesDetalle}
                  onChange={(e) => setIntegracionesDetalle(e.target.value)}
                  className={styles.textarea}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Reglas de Control Perimetral</label>
                <textarea
                  placeholder="Detalle las barreras de control. Ej: IPs habilitadas en lista blanca, políticas de firewall de puertos, umbral de llamadas limitado a 100/min..."
                  value={reglasPerimetrales}
                  onChange={(e) => setReglasPerimetrales(e.target.value)}
                  className={styles.textarea}
                  required
                />
                <p className={styles.helpText}>Garantice los estándares ISO registrando cortafuegos y IPs de forma explícita.</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Comentarios Adicionales de Seguridad</label>
                <textarea
                  placeholder="Escriba comentarios complementarios..."
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  className={styles.textarea}
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.btnCancel} disabled={loading}>
            Cerrar
          </button>
          <button type="button" onClick={() => handleAction('Rechazar')} className={styles.btnReject} disabled={loading}>
            Rechazar
          </button>
          <button type="button" onClick={() => handleAction('Aprobar')} className={styles.btnApprove} disabled={loading}>
            {isInfra ? 'Pre-Aprobar' : 'Aprobación Final'}
          </button>
        </div>
      </div>
    </div>
  )
}
