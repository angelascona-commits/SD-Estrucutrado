import React from 'react';
import styles from './TicketModal.module.css';
import { useTicketModal } from '../hooks/useTicketModal';
import { formatearParaInput } from '../utils/dateUtils';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  numeroTicket: number | string | null;
  onSuccess?: () => void;
}

export default function TicketModal({ isOpen, onClose, numeroTicket, onSuccess }: TicketModalProps) {
  // 1. Obtenemos 'catalogos' del hook
  const {
    isEditing, formData, historial, cargando, catalogos,
    handleChange, handleGuardarCambios, getIconConfig, calcularHorasLaborables
  } = useTicketModal(numeroTicket, isOpen, onClose, onSuccess);

  // 2. Extraemos las listas de forma segura para que NUNCA sean undefined (evita el error map)
  const responsables = catalogos?.responsables || [];
  const estados = catalogos?.estados || [];
  const aplicaciones = catalogos?.aplicaciones || [];
  const estadosJira = catalogos?.estadosJira || [];
  const productos = catalogos?.productos || [];
  const feriados = catalogos?.feriados || [];

  if (!isOpen) return null;

  // Cálculos visuales para las alertas de SLA en la interfaz
  const uiHorasAsignacion = calcularHorasLaborables(formData.fecha_creacion_sd || '', formData.fecha_asignacion || '', feriados);
  const excedeAsignacion = (formData.fecha_creacion_sd && formData.fecha_asignacion) && (uiHorasAsignacion > 8);

  const uiHorasMaxima = calcularHorasLaborables(formData.fecha_asignacion || '', formData.fecha_maxima_atencion || '', feriados);
  const excedeMinimoAtencion = (formData.fecha_asignacion && formData.fecha_maxima_atencion) && (uiHorasMaxima < 16);

  return (
    <div className={styles['modal-overlay'] || 'modal-overlay'} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(34, 22, 16, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
      <div className={styles['modal-content'] || 'modal-content'} style={{ backgroundColor: '#fff', width: '100%', maxWidth: '1024px', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* HEADER */}
        <div className={styles['modal-header'] || 'modal-header'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div className={styles['modal-title-group'] || 'modal-title-group'} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className={styles['modal-title'] || 'modal-title'} style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {isEditing ? `Ticket SD-${formData.numero_ticket}` : 'Nuevo Ticket'}
            </h2>
            {isEditing && formData.estado_id && (
              <span className={styles['badge-status'] || 'badge-status'} style={{ padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569' }}>
                {estados.find((e: any) => e.id.toString() === String(formData.estado_id))?.nombre || 'Desconocido'}
              </span>
            )}
          </div>
          <button className={styles['btn-close'] || 'btn-close'} onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <p>Cargando información del ticket...</p>
          </div>
        ) : (
          <>
            <div className={styles['modal-body'] || 'modal-body'} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', padding: '24px', overflowY: 'auto' }}>
              
              {/* COLUMNA IZQUIERDA: FORMULARIO */}
              <div className={styles['modal-form-section'] || 'modal-form-section'} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: 0, paddingBottom: '8px', borderBottom: '2px solid #ea580c', width: 'fit-content' }}>Detalles del Ticket</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  
                  {/* Número de ticket solo en Creación */}
                  {!isEditing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Número de Ticket (SD) *</label>
                      <input type="number" name="numero_ticket" value={formData.numero_ticket} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Tipo *</label>
                    <select name="tipo_sd" value={formData.tipo_sd} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">Seleccione...</option>
                      <option value="Solicitud">Solicitud</option>
                      <option value="Incidente">Incidente</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Producto</label>
                    <select name="producto_id" value={formData.producto_id} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">Seleccione...</option>
                      {productos.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Descripción *</label>
                    <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows={3} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}></textarea>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>DNI</label>
                    <input type="text" name="dni" value={formData.dni} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Póliza</label>
                    <input type="text" name="poliza" value={formData.poliza} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Responsable</label>
                    <select name="responsable_id" value={formData.responsable_id} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">Sin asignar</option>
                      {responsables.map((r: any) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Estado Principal</label>
                    <select name="estado_id" value={formData.estado_id} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">Seleccione...</option>
                      {estados.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Aplicación</label>
                    <select name="aplicacion_id" value={formData.aplicacion_id} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">Seleccione...</option>
                      {aplicaciones.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Estado Jira</label>
                    <select name="estado_jira_id" value={formData.estado_jira_id} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">Seleccione...</option>
                      {estadosJira.map((j: any) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Horas Invertidas</label>
                    <input type="number" step="0.5" name="horas_invertidas" value={formData.horas_invertidas} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Observaciones / Notas internas</label>
                    <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows={2} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}></textarea>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0' }} />
                
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: 0, paddingBottom: '8px', borderBottom: '2px solid #ea580c', width: 'fit-content' }}>Control de Tiempos y SLA</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Horario Laboral (Resp.)</label>
                    <input type="text" name="horario_laboral" value={formData.horario_laboral} disabled placeholder="Automático" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Fecha de Delegación</label>
                    <input type="datetime-local" name="fecha_delegacion" value={formatearParaInput(formData.fecha_delegacion)} disabled style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0369a1' }}>Creación SD (Inicio KPI Asig.)</label>
                    <input type="datetime-local" name="fecha_creacion_sd" value={formatearParaInput(formData.fecha_creacion_sd)} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0369a1' }}>Asignación (Fin Asig. / Inicio Atenc.)</label>
                    <input type="datetime-local" name="fecha_asignacion" value={formatearParaInput(formData.fecha_asignacion)} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: excedeAsignacion ? '2px solid #ea580c' : '1px solid #cbd5e1' }} />
                    {(formData.fecha_creacion_sd && formData.fecha_asignacion) && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '2px', color: excedeAsignacion ? '#ea580c' : '#16a34a' }}>
                        {excedeAsignacion 
                          ? `⚠️ Excede 8 hrs laborales (${uiHorasAsignacion.toFixed(1)} hrs)` 
                          : `✅ Asignación a tiempo (${uiHorasAsignacion.toFixed(1)} hrs)`}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#fff7ed', padding: '12px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#c2410c' }}>Fecha Máxima Atención (SLA)</label>
                    <input type="datetime-local" name="fecha_maxima_atencion" value={formatearParaInput(formData.fecha_maxima_atencion)} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: excedeMinimoAtencion ? '2px solid #dc2626' : '1px solid #cbd5e1' }} />
                    {(formData.fecha_asignacion && formData.fecha_maxima_atencion) && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '2px', color: excedeMinimoAtencion ? '#dc2626' : '#16a34a' }}>
                        {excedeMinimoAtencion 
                          ? `⚠️ Menor a 16 hrs lab (${uiHorasMaxima.toFixed(1)} hrs)` 
                          : `✅ Rango correcto (${uiHorasMaxima.toFixed(1)} hrs)`}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#15803d' }}>Fecha de Atención (Cierre Real)</label>
                    <input type="datetime-local" name="fecha_atencion" value={formatearParaInput(formData.fecha_atencion)} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: HISTORIAL Y TIMELINE */}
              <div className={styles['modal-sidebar'] || 'modal-sidebar'} style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingLeft: '24px', borderLeft: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: 0, paddingBottom: '8px', borderBottom: '2px solid #ea580c', width: 'fit-content' }}>Historial</h3>
                
                {!isEditing ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>history</span>
                    <p style={{ fontSize: '0.875rem', marginTop: '16px' }}>El historial aparecerá una vez que se cree el ticket.</p>
                  </div>
                ) : (
                  <div className={styles['timeline-container'] || 'timeline-container'} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '8px' }}>
                    <div style={{ position: 'absolute', left: '15px', top: 0, bottom: 0, width: '2px', backgroundColor: '#f1f5f9' }}></div>
                    {historial.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Aún no hay movimientos registrados.</p>
                    ) : (
                      historial.map((item: any) => {
                        const iconConf = getIconConfig(item.tipo_accion);
                        return (
                          <div key={item.id} style={{ position: 'relative', display: 'flex', gap: '16px', zIndex: 1 }}>
                            <div className={iconConf.class} style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#f1f5f9', border: '2px solid #fff' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{iconConf.icon}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
                              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{item.descripcion}</p>
                              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{new Date(item.fecha_registro).toLocaleString()} • {item.usuario}</p>
                              {item.detalle_extra && <p style={{ backgroundColor: '#f8fafc', padding: '8px', marginTop: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontStyle: 'italic', margin: 0 }}>"{item.detalle_extra}"</p>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* FOOTER */}
            <div className={styles['modal-footer'] || 'modal-footer'} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button onClick={handleGuardarCambios} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#ea580c', color: '#fff', cursor: 'pointer', fontWeight: 600, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                {isEditing ? 'Guardar Cambios' : 'Crear Ticket'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}