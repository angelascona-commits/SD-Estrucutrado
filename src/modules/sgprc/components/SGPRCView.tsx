'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Swal from 'sweetalert2'
import styles from './SGPRCView.module.css'
import SolicitudModal from './SolicitudModal'
import EvaluacionModal from './EvaluacionModal'
import type { Solicitud, SGPRCCatalogs } from '../interfaces/sgprc.interfaces'
import {
  fetchSGPRCCatalogsAction,
  listSolicitudesAction,
  updateSolicitudEstadoAction,
  fetchAuditLogsAction,
  simulateOutboundEmailAction,
  submitDecisionAction
} from '../actions/sgprc.action'
import SGPRCViewHeader from './views/SGPRCViewHeader'

export default function SGPRCView() {
  const [loading, setLoading] = useState(true)
  const [catalogs, setCatalogs] = useState<SGPRCCatalogs | null>(null)
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<string>('Todos')

  // Modales
  const [solModalOpen, setSolModalOpen] = useState(false)
  const [selectedSol, setSelectedSol] = useState<Solicitud | null>(null)

  const [evalModalOpen, setEvalModalOpen] = useState(false)
  const [evalSol, setEvalSol] = useState<Solicitud | null>(null)
  const [evalRole, setEvalRole] = useState<'infraestructura' | 'ciberseguridad'>('infraestructura')

  // Simulación de Correo
  const [simModalOpen, setSimModalOpen] = useState(false)
  const [simEmailData, setSimEmailData] = useState<{
    html: string
    toName: string
    toEmail: string
    tokenAprobar: string
    tokenRechazar: string
    solicitudId: number
  } | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [catRes, solRes] = await Promise.all([
        fetchSGPRCCatalogsAction(),
        listSolicitudesAction()
      ])

      if (catRes.success && catRes.data) setCatalogs(catRes.data)
      if (solRes.success && solRes.data) setSolicitudes(solRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Métricas dinámicas cargadas desde base de datos
  const renderedMetrics = useMemo(() => {
    const config = catalogs?.metricasConfig || [
      { key_name: 'total', label: 'Total', estado_asociado: null, style_class: 'total' },
      { key_name: 'borradores', label: 'Borradores', estado_asociado: 'Borrador', style_class: 'draft' },
      { key_name: 'infra', label: 'Infraestructura', estado_asociado: 'Pendiente Infraestructura', style_class: 'infra' },
      { key_name: 'ciber', label: 'Ciberseguridad', estado_asociado: 'Pendiente Ciberseguridad', style_class: 'security' },
      { key_name: 'aprobados', label: 'Aprobados', estado_asociado: 'Aprobado', style_class: 'approved' }
    ]

    return config.map((m) => {
      const count = m.estado_asociado
        ? solicitudes.filter((s) => s.estado === m.estado_asociado).length
        : solicitudes.length

      return {
        key: m.key_name,
        label: m.label,
        count,
        styleClass: m.style_class
      }
    })
  }, [solicitudes, catalogs])

  // Filtrado
  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter((sol) => {
      const matchSearch =
        (sol.proyectista_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        sol.descripcion_negocio.toLowerCase().includes(search.toLowerCase()) ||
        sol.sustento_tecnico.toLowerCase().includes(search.toLowerCase()) ||
        (sol.orquestador_nombre && sol.orquestador_nombre.toLowerCase().includes(search.toLowerCase()))

      const matchEstado = filterEstado === 'Todos' || sol.estado === filterEstado

      return matchSearch && matchEstado
    })
  }, [solicitudes, search, filterEstado])

  // Cambiar estado a Infra (enviar borrador)
  const handleSendToInfra = async (sol: Solicitud) => {
    const confirm = await Swal.fire({
      title: '¿Enviar a Infraestructura?',
      text: 'Se cambiará el estado a Pendiente Infraestructura para iniciar las evaluaciones técnicas.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary, #ec5b13)',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    })

    if (!confirm.isConfirmed) return

    try {
      const res = await updateSolicitudEstadoAction(sol.id, 'Pendiente Infraestructura', 'Enviado formalmente a Infraestructura desde Borrador.')
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Enviado',
          text: 'La solicitud se encuentra en evaluación de Infraestructura.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
        loadData()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || 'No se pudo enviar.',
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
    }
  }

  // Visualizar Logs de Auditoría
  const handleViewLogs = async (sol: Solicitud) => {
    try {
      const res = await fetchAuditLogsAction(sol.id)
      if (res.success && res.data) {
        const timelineHtml = res.data
          .map(
            (log) => `
          <div style="margin-bottom: 16px; padding-left: 16px; border-left: 3px solid var(--primary, #ec5b13); text-align: left; position: relative;">
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">
              ${new Date(log.created_at).toLocaleString('es-PE')}
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">
              ${log.accion}
            </div>
            <div style="font-size: 12px; color: #64748b;">
              Ejecutado por: <b>${log.usuario_nombre}</b>
            </div>
          </div>
        `
          )
          .join('') || '<p style="color: #64748b; padding: 20px 0;">No se registran logs de auditoría para esta solicitud.</p>'

        Swal.fire({
          title: `Trazabilidad ISO 27001 - Ticket #${sol.id}`,
          html: `
            <div style="text-align: left; margin-bottom: 12px; font-size: 12px; color: #475569; background-color: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <b>Proyectista:</b> ${sol.proyectista_nombre}<br/>
              <b>Estado Actual:</b> ${sol.estado}
            </div>
            <div style="max-height: 380px; overflow-y: auto; padding: 4px 8px;">
              ${timelineHtml}
            </div>
          `,
          confirmButtonColor: 'var(--primary, #ec5b13)',
          confirmButtonText: 'Cerrar Bitácora'
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || 'No se pudieron cargar los logs.',
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
    }
  }

  // Lanzar Simulación de Correo Outbound
  const handleSimulateOutboundEmail = async (sol: Solicitud) => {
    if (!catalogs) return

    // Buscar usuarios con rol para simular
    let targetRole = 'Infraestructura'
    if (sol.estado === 'Pendiente Ciberseguridad') targetRole = 'Ciberseguridad'

    const candidates = catalogs.usuarios.filter(
      (u) => u.rol.toLowerCase().includes(targetRole.toLowerCase()) || u.rol.toLowerCase() === 'administrador'
    )

    if (candidates.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin Aprobadores',
        text: `No se encontraron usuarios registrados con el rol de ${targetRole} en el sistema.`,
        confirmButtonColor: 'var(--primary, #ec5b13)'
      })
      return
    }

    const { value: userId } = await Swal.fire({
      title: 'Simulación de Email Outbound',
      text: `Seleccione qué aprobador de ${targetRole} recibirá la notificación interactiva:`,
      input: 'select',
      inputOptions: candidates.reduce((acc, c) => {
        acc[c.id] = `${c.nombre} (${c.rol})`
        return acc
      }, {} as Record<number, string>),
      inputPlaceholder: 'Seleccione un aprobador...',
      showCancelButton: true,
      confirmButtonColor: 'var(--primary, #ec5b13)',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Generar Vista Previa',
      cancelButtonText: 'Cancelar'
    })

    if (!userId) return

    try {
      const res = await simulateOutboundEmailAction(sol.id, Number(userId))
      if (res.success && res.data) {
        const rawHtml = res.data.html

        // Extraer los tokens de aprobación y rechazo directamente
        const matchApprove = rawHtml.match(/token=([a-f0-9]+)/)
        const tokenAprobar = matchApprove ? matchApprove[1] : ''
        const tokensFound = [...rawHtml.matchAll(/token=([a-f0-9]+)/g)]
        const tokenRechazar = tokensFound[1] ? tokensFound[1][1] : ''

        setSimEmailData({
          html: rawHtml,
          toName: res.data.toName,
          toEmail: res.data.toEmail,
          tokenAprobar,
          tokenRechazar,
          solicitudId: sol.id
        })
        setSimModalOpen(true)
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || 'No se pudo generar el correo.',
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
    }
  }

  // Simular la decisión del botón de correo
  const handleSimulateDecision = async (accion: 'Aprobar' | 'Rechazar') => {
    if (!simEmailData) return

    const token = accion === 'Aprobar' ? simEmailData.tokenAprobar : simEmailData.tokenRechazar

    if (accion === 'Rechazar') {
      const { value: text } = await Swal.fire({
        title: 'Motivo de Rechazo por Correo',
        input: 'textarea',
        inputLabel: 'Ingrese de forma obligatoria el sustento del rechazo para la respuesta interactiva:',
        inputPlaceholder: 'Presupuesto no asignado / IPs fuera del rango...',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        inputValidator: (v) => {
          if (!v || !v.trim()) return 'El sustento es obligatorio.'
        }
      })

      if (!text) return

      setSimModalOpen(false)
      Swal.fire({
        title: 'Procesando decisión...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      })

      const res = await submitDecisionAction(token, text)
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Acción Completada',
          text: res.data?.message || 'Rechazo guardado exitosamente.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
        loadData()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error en la decisión',
          text: res.error || 'Token inválido o expirado.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
      }
    } else {
      setSimModalOpen(false)
      Swal.fire({
        title: 'Procesando decisión...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      })

      const res = await submitDecisionAction(token)
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Acción Completada',
          text: res.data?.message || 'Aprobación procesada correctamente.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
        loadData()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error en la decisión',
          text: res.error || 'Token inválido o expirado.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
      }
    }
  }

  const handleEdit = (sol: Solicitud) => {
    setSelectedSol(sol)
    setSolModalOpen(true)
  }

  const handleEvaluate = (sol: Solicitud, role: 'infraestructura' | 'ciberseguridad') => {
    setEvalSol(sol)
    setEvalRole(role)
    setEvalModalOpen(true)
  }

  if (loading) {
    return <div className={styles.loadingContainer}>Cargando panel de solicitudes...</div>
  }

  return (
    <div className={styles.wrapper}>
      <SGPRCViewHeader
        currentView="dashboard"
        dashboardHref="/sgprc?view=dashboard"
        catalogosHref="/sgprc?view=catalogos"
        actionButton={
          <button onClick={() => { setSelectedSol(null); setSolModalOpen(true) }} className={styles.btnNew}>
            Nueva Solicitud
          </button>
        }
      />

      {/* Metrics */}
      <div className={styles.metricsGrid}>
        {renderedMetrics.map((met) => (
          <div key={met.key} className={styles.metricCard}>
            <div className={styles.metricInfo}>
              <span className={styles.metricValue}>{met.count}</span>
              <span className={styles.metricLabel}>{met.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className={styles.filtersCard}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por proyectista, negocio, sustento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="Todos">Todos los estados</option>
          {catalogs?.metricasConfig
            .filter((m) => m.estado_asociado !== null && m.estado_asociado !== undefined)
            .map((m) => (
              <option key={m.id || m.key_name} value={m.estado_asociado!}>
                {m.label}
              </option>
            ))}
        </select>
      </div>

      {/* Tabla de Datos */}
      <div className={styles.tableCard}>
        {filteredSolicitudes.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No se encontraron solicitudes Cloud registradas.</p>
            <p style={{ margin: 0, fontSize: '13px' }}>Cree una nueva solicitud utilizando el botón superior.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>ID</th>
                <th className={styles.th}>Proyectista / Negocio</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Componentes Cloud</th>
                <th className={styles.th}>Viabilidad / Controles</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSolicitudes.map((sol) => (
                <tr key={sol.id} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                    #{sol.id}
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{sol.proyectista_nombre || 'Desconocido'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineBreak: 'anywhere' }}>
                      {sol.descripcion_negocio}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span
                      className={`${styles.badge} ${
                        sol.estado === 'Borrador'
                          ? styles.badgeBorrador
                          : sol.estado === 'Pendiente Infraestructura'
                          ? styles.badgeInfra
                          : sol.estado === 'Pendiente Ciberseguridad'
                          ? styles.badgeSecurity
                          : sol.estado === 'Aprobado'
                          ? styles.badgeAprobado
                          : styles.badgeRechazado
                      }`}
                    >
                      {sol.estado}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {sol.componentes && sol.componentes.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                        {sol.componentes.map((c, i) => (
                          <div key={i} style={{ 
                            borderLeft: '3px solid var(--primary, #ec5b13)', 
                            paddingLeft: '8px', 
                            fontSize: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            backgroundColor: '#f8fafc',
                            padding: '6px 8px',
                            borderRadius: '0 8px 8px 0'
                          }}>
                            {c.usuario_cloud && (
                              <div><b>User:</b> <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{c.usuario_cloud}</span></div>
                            )}
                            {c.cuenta_cloud && (
                              <div><b>Cuenta:</b> <span style={{ color: '#475569', fontSize: '11px' }}>{c.cuenta_cloud}</span></div>
                            )}
                            <div><b>Servicio:</b> {c.servicio_requerido} <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '10px', 
                              fontWeight: 'bold',
                              backgroundColor: c.entorno === 'Producción' ? '#fee2e2' : c.entorno === 'QA' ? '#fef3c7' : '#dcfce7',
                              color: c.entorno === 'Producción' ? '#ef4444' : c.entorno === 'QA' ? '#d97706' : '#16a34a',
                              marginLeft: '4px'
                            }}>{c.entorno}</span></div>
                            {c.accion_cloud && (
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#64748b', 
                                fontStyle: 'italic', 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                maxWidth: '240px' 
                              }} title={c.accion_cloud}>
                                <b>Acción:</b> {c.accion_cloud}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '12px' }}>Ninguno</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {sol.evaluacion ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                        {sol.evaluacion.presupuesto !== undefined && (
                          <div>
                            <b>Presupuesto:</b> S/. {sol.evaluacion.presupuesto.toFixed(2)}
                          </div>
                        )}
                        {sol.evaluacion.reglas_perimetrales && (
                          <div style={{ color: '#059669', fontWeight: 600 }}>Controles Aplicados</div>
                        )}
                        {sol.evaluacion.comentarios && (
                          <div style={{ color: '#64748b', fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{sol.evaluacion.comentarios}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '12px' }}>Sin Evaluación</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actionsCell}>
                      {sol.estado === 'Borrador' && (
                        <>
                          <button onClick={() => handleEdit(sol)} className={styles.btnAction} title="Editar Solicitud">
                            Editar
                          </button>
                          <button onClick={() => handleSendToInfra(sol)} className={`${styles.btnAction} ${styles.btnActionPrimary}`}>
                            Enviar
                          </button>
                        </>
                      )}

                      {sol.estado === 'Pendiente Infraestructura' && (
                        <button onClick={() => handleEvaluate(sol, 'infraestructura')} className={`${styles.btnAction} ${styles.btnActionSuccess}`}>
                          Infra
                        </button>
                      )}

                      {sol.estado === 'Pendiente Ciberseguridad' && (
                        <button onClick={() => handleEvaluate(sol, 'ciberseguridad')} className={`${styles.btnAction} ${styles.btnActionDanger}`}>
                          Ciberseg.
                        </button>
                      )}

                      {(sol.estado === 'Pendiente Infraestructura' || sol.estado === 'Pendiente Ciberseguridad') && (
                        <button onClick={() => handleSimulateOutboundEmail(sol)} className={styles.btnAction} title="Simular Correo de Aprobación">
                          Simular Mail
                        </button>
                      )}

                      <button onClick={() => handleViewLogs(sol)} className={styles.btnAction} title="Ver Bitácora de Trazabilidad">
                        Trazabilidad
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva/Editar Solicitud */}
      {catalogs && (
        <SolicitudModal
          isOpen={solModalOpen}
          onClose={() => setSolModalOpen(false)}
          onSuccess={loadData}
          solicitud={selectedSol}
          catalogs={catalogs}
        />
      )}

      {/* Modal Evaluaciones */}
      {evalSol && evalModalOpen && (
        <EvaluacionModal
          isOpen={evalModalOpen}
          onClose={() => setEvalModalOpen(false)}
          onSuccess={loadData}
          solicitud={evalSol}
          rolEvaluador={evalRole}
        />
      )}

      {/* Modal de Simulación de Correo Outbound */}
      {simModalOpen && simEmailData && (
        <div className={styles.mailSimBackdrop}>
          <div className={styles.mailSimModal}>
            <div className={styles.mailSimHeader}>
              <h3 className={styles.mailSimTitle}>
                Bandeja de Entrada (Simulador del Servidor de Correo)
              </h3>
              <button className={styles.closeBtn} onClick={() => setSimModalOpen(false)} style={{ color: 'white' }}>
                ✕
              </button>
            </div>

            <div className={styles.mailSimDetails}>
              <div><b>De:</b> SGPRC Automation Engine (no-reply@sgem.protecta.com.pe)</div>
              <div><b>Para:</b> {simEmailData.toName} (${simEmailData.toEmail})</div>
              <div><b>Asunto:</b> [URGENTE] SGPRC: Solicitud de Permisos y Recursos Cloud - Ticket #${simEmailData.solicitudId}</div>
            </div>

            <iframe
              srcDoc={simEmailData.html}
              className={styles.mailIframe}
              title="Cuerpo del Correo HTML"
            />

            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => handleSimulateDecision('Rechazar')} className={styles.btnActionDanger} style={{ padding: '10px 18px', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer' }}>
                Simular clic en RECHAZAR
              </button>
              <button onClick={() => handleSimulateDecision('Aprobar')} className={styles.btnActionSuccess} style={{ padding: '10px 18px', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer' }}>
                Simular clic en APROBAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
