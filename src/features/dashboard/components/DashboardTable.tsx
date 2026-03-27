"use client";
import React, { useState, useEffect } from 'react';
import { Ticket } from '../types/dashboard.types';
import { calcularHorasLaborables } from '../../../shared/services/calcularHoras';
import { formatearFecha, obtenerClaseEstado } from '../utils/formatters';
import styles from '../styles/dashboard.module.css';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { useDashboardSort } from '../hooks/useDashboardSort';

interface DashboardTableProps {
    ticketsProcesados: Ticket[];
    feriados: string[];
    filterData: ReturnType<typeof useDashboardFilters>;
    sortData: ReturnType<typeof useDashboardSort>;
    onAbrirModal: (numeroTicket: number | null) => void;
}

export default function DashboardTable({ ticketsProcesados, feriados, filterData, sortData, onAbrirModal }: DashboardTableProps) {
    const { filtros, filtroActivo, setFiltroActivo, handleFiltroChange, toggleFiltroMenu, limpiarFiltroColumna, tieneFiltroActivo, opcionesEstado, opcionesApp, opcionesResponsable } = filterData as any;
    const { ordenConfig, manejarOrdenClick } = sortData as any;
    
    const [paginaActual, setPaginaActual] = useState(1);
    const TICKETS_POR_PAGINA = 50;
    
    useEffect(() => {
        setPaginaActual(1);
    }, [ticketsProcesados]);

    const totalPaginas = Math.ceil(ticketsProcesados.length / TICKETS_POR_PAGINA);
    const indiceUltimoTicket = paginaActual * TICKETS_POR_PAGINA;
    const indicePrimerTicket = indiceUltimoTicket - TICKETS_POR_PAGINA;
    const ticketsPaginados = ticketsProcesados.slice(indicePrimerTicket, indiceUltimoTicket);

    const isChecked = (arr: any, val: string) => Array.isArray(arr) && arr.includes(val);

    return (
        <section>
            <div className={styles['section-header']}>
                <h2 className={styles['section-title']}>Resumen de Tickets Recientes</h2>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Mostrando {ticketsProcesados.length} tickets</span>
            </div>

            <div className={styles['table-container']}>
                <table className={styles['ticket-table']}>
                    <thead>
                        <tr>
                            {/* --- 1. F. ASIGNACIÓN --- */}
                            <th className={styles['table-th']} onClick={() => toggleFiltroMenu('fecha_asignacion')} style={{ position: 'relative' }}>
                                <div className={styles['th-content']} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>F. Asignación</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <button onClick={(e) => manejarOrdenClick('fecha_asignacion', e)} className={styles['btn-icon']}>
                                            {ordenConfig?.columna === 'fecha_asignacion' ? (ordenConfig?.direccion === 'asc' ? '↑' : '↓') : '⇅'}
                                        </button>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tieneFiltroActivo(['fecha_asignacion_desde', 'fecha_asignacion_hasta', 'fecha_asignacion_vacia']) ? '#2563eb' : '#94a3b8' }}>filter_alt</span>
                                    </div>
                                </div>
                                {filtroActivo === 'fecha_asignacion' && (
                                    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '220px', padding: '12px', fontWeight: 'normal', textTransform: 'none' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#334155' }}>
                                                Desde:
                                                <input type="date" name="fecha_asignacion_desde" value={filtros?.fecha_asignacion_desde || ''} onChange={handleFiltroChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                            </label>
                                            <label style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#334155' }}>
                                                Hasta:
                                                <input type="date" name="fecha_asignacion_hasta" value={filtros?.fecha_asignacion_hasta || ''} onChange={handleFiltroChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                            </label>
                                            <button onClick={() => limpiarFiltroColumna(['fecha_asignacion_desde', 'fecha_asignacion_hasta', 'fecha_asignacion_vacia'])}  style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontWeight: 600, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>Limpiar fechas</button>
                                        </div>
                                    </div>
                                )}
                            </th>

                            {/* --- 2. ESTADO --- */}
                            <th className={styles['table-th']} onClick={() => toggleFiltroMenu('estado')} style={{ position: 'relative' }}>
                                <div className={styles['th-content']} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>Estado</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <button onClick={(e) => manejarOrdenClick('estado', e)} className={styles['btn-icon']}>
                                            {ordenConfig?.columna === 'estado' ? (ordenConfig?.direccion === 'asc' ? '↑' : '↓') : '⇅'}
                                        </button>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tieneFiltroActivo(['estado']) ? '#2563eb' : '#94a3b8' }}>filter_alt</span>
                                    </div>
                                </div>
                                {filtroActivo === 'estado' && (
                                    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '200px', maxHeight: '250px', overflowY: 'auto', fontWeight: 'normal', textTransform: 'none' }}>
                                        <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                            <button onClick={() => limpiarFiltroColumna(['estado'])} style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontWeight: 600 }}>Desmarcar todos</button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {opcionesEstado?.map((opcion: string) => (
                                                <div 
                                                    key={opcion} 
                                                    onClick={() => handleFiltroChange({ target: { name: 'estado', value: opcion } })}
                                                    style={{ 
                                                        padding: '8px 12px', 
                                                        fontSize: '13px', 
                                                        cursor: 'pointer', 
                                                        color: '#334155', 
                                                        backgroundColor: filtros?.estado === opcion ? '#eff6ff' : 'transparent', 
                                                        fontWeight: filtros?.estado === opcion ? 600 : 400 
                                                    }}
                                                >
                                                    {opcion}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </th>

                            {/* --- 3. TICKET ID --- */}
                            <th className={styles['table-th']} onClick={() => toggleFiltroMenu('codigo_ticket')} style={{ position: 'relative' }}>
                                <div className={styles['th-content']} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>Ticket ID</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <button onClick={(e) => manejarOrdenClick('codigo_ticket', e)} className={styles['btn-icon']}>
                                            {ordenConfig?.columna === 'codigo_ticket' ? (ordenConfig?.direccion === 'asc' ? '↑' : '↓') : '⇅'}
                                        </button>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tieneFiltroActivo(['codigo_ticket']) ? '#2563eb' : '#94a3b8' }}>filter_alt</span>
                                    </div>
                                </div>
                                {filtroActivo === 'codigo_ticket' && (
                                    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '200px', padding: '12px', fontWeight: 'normal', textTransform: 'none' }}>
                                        <input type="text" name="codigo_ticket" placeholder="Buscar ID..." value={filtros?.codigo_ticket || ''} onChange={handleFiltroChange} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                                        <button onClick={() => limpiarFiltroColumna(['codigo_ticket'])} style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontWeight: 600, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>Limpiar búsqueda</button>
                                    </div>
                                )}
                            </th>

                            {/* --- DESCRIPCIÓN --- */}
                            <th className={styles['table-th']} style={{ cursor: 'default', width: '250px', minWidth: '250px', maxWidth: '250px' }}>
                                <div className={styles['th-content']}>
                                    <span>Descripción</span>
                                </div>
                            </th>

                            {/* --- 4. APLICACIÓN --- */}
                            <th className={styles['table-th']} onClick={() => toggleFiltroMenu('aplicacion')} style={{ position: 'relative' }}>
                                <div className={styles['th-content']} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>Aplicación</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <button onClick={(e) => manejarOrdenClick('aplicacion', e)} className={styles['btn-icon']}>
                                            {ordenConfig?.columna === 'aplicacion' ? (ordenConfig?.direccion === 'asc' ? '↑' : '↓') : '⇅'}
                                        </button>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tieneFiltroActivo(['aplicacion']) ? '#2563eb' : '#94a3b8' }}>filter_alt</span>
                                    </div>
                                </div>
                                {filtroActivo === 'aplicacion' && (
                                    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '200px', maxHeight: '250px', overflowY: 'auto', fontWeight: 'normal', textTransform: 'none' }}>
                                        <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                            <button onClick={() => limpiarFiltroColumna(['aplicacion'])} style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontWeight: 600 }}>Desmarcar todos</button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {opcionesApp?.map((opcion: string) => (
                                                <div 
                                                    key={opcion} 
                                                    onClick={() => handleFiltroChange({ target: { name: 'aplicacion', value: opcion } })}
                                                    style={{ 
                                                        padding: '8px 12px', 
                                                        fontSize: '13px', 
                                                        cursor: 'pointer', 
                                                        color: '#334155', 
                                                        backgroundColor: filtros?.aplicacion === opcion ? '#eff6ff' : 'transparent', 
                                                        fontWeight: filtros?.aplicacion === opcion ? 600 : 400 
                                                    }}
                                                >
                                                    {opcion}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </th>

                            <th className={`${styles['table-th']} ${styles['text-center']}`} style={{ cursor: 'default' }}>
                                <div className={styles['th-content']} style={{ justifyContent: 'center' }}>T. Asig</div>
                            </th>
                            <th className={`${styles['table-th']} ${styles['text-center']}`} style={{ cursor: 'default' }}>
                                <div className={styles['th-content']} style={{ justifyContent: 'center' }}>T. Límite</div>
                            </th>
                            <th className={`${styles['table-th']} ${styles['text-center']}`} style={{ cursor: 'default' }}>
                                <div className={styles['th-content']} style={{ justifyContent: 'center' }}>Resolución</div>
                            </th>

                            {/* --- 5. RESPONSABLE --- */}
                            <th className={styles['table-th']} onClick={() => toggleFiltroMenu('responsable')} style={{ position: 'relative' }}>
                                <div className={styles['th-content']} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>Designado a</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <button onClick={(e) => manejarOrdenClick('responsable', e)} className={styles['btn-icon']}>
                                            {ordenConfig?.columna === 'responsable' ? (ordenConfig?.direccion === 'asc' ? '↑' : '↓') : '⇅'}
                                        </button>
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tieneFiltroActivo(['responsable']) ? '#2563eb' : '#94a3b8' }}>filter_alt</span>
                                    </div>
                                </div>
                                {filtroActivo === 'responsable' && (
                                    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '200px', maxHeight: '250px', overflowY: 'auto', fontWeight: 'normal', textTransform: 'none' }}>
                                        <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                            <button onClick={() => limpiarFiltroColumna(['responsable'])} style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontWeight: 600 }}>Desmarcar todos</button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {opcionesResponsable?.map((opcion: string) => (
                                                <div 
                                                    key={opcion} 
                                                    onClick={() => handleFiltroChange({ target: { name: 'responsable', value: opcion } })}
                                                    style={{ 
                                                        padding: '8px 12px', 
                                                        fontSize: '13px', 
                                                        cursor: 'pointer', 
                                                        color: '#334155', 
                                                        backgroundColor: filtros?.responsable === opcion ? '#eff6ff' : 'transparent', 
                                                        fontWeight: filtros?.responsable === opcion ? 600 : 400 
                                                    }}
                                                >
                                                    {opcion}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {ticketsPaginados.length === 0 ? (
                            <tr>
                                <td colSpan={10} className={styles['text-center']} style={{ padding: '24px' }}>
                                    No se encontraron tickets con los filtros actuales.
                                </td>
                            </tr>
                        ) : (
                            ticketsPaginados.map((ticket) => {
                                let tAsignacionJSX = <span>-</span>;
                                if (ticket.fecha_creacion_sd && ticket.fecha_asignacion) {
                                    let horasAsig = Math.max(0, calcularHorasLaborables(ticket.fecha_creacion_sd, ticket.fecha_asignacion, feriados));
                                    tAsignacionJSX = <span style={{ color: (horasAsig / 8) > 1 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>{(horasAsig / 8).toFixed(1)}d</span>;
                                }

                                let tLimiteJSX = <span>-</span>;
                                if (ticket.fecha_asignacion && ticket.fecha_maxima_atencion) {
                                    let horasLim = Math.max(0, calcularHorasLaborables(ticket.fecha_asignacion, ticket.fecha_maxima_atencion, feriados));
                                    tLimiteJSX = <span style={{ color: (horasLim / 8) < 2 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>{(horasLim / 8).toFixed(1)}d</span>;
                                }

                                let resolucionJSX = <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>En proceso</span>;
                                if (['Cerrado', 'Atendido', 'Resuelto'].includes(ticket.estado) && ticket.fecha_maxima_atencion && ticket.fecha_atencion) {
                                    const horasRes = calcularHorasLaborables(ticket.fecha_maxima_atencion, ticket.fecha_atencion, feriados);
                                    resolucionJSX = <span style={{ color: horasRes > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>{horasRes > 0 ? '+' : ''}{horasRes.toFixed(1)}h</span>;
                                }

                                return (
                                    <tr key={ticket.ticket_id} onClick={() => onAbrirModal(ticket.numero_ticket as number)}>
                                        <td className={styles['t-date']}>{formatearFecha(ticket.fecha_asignacion)}</td>
                                        <td className={styles['text-center']}><span className={`${styles['status-pill']} ${styles[obtenerClaseEstado(ticket.estado)] || styles['status-open']}`}>{ticket.estado}</span></td>
                                        <td className={styles['t-id']}>{ticket.codigo_ticket}</td>
                                        <td style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}>
                                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#475569', fontSize: '13px' }} title={ticket.descripcion}>
                                                {ticket.descripcion || 'Sin descripción'}
                                            </div>
                                        </td>
                                        <td className={styles['t-app']}>{ticket.aplicacion || 'N/A'}</td>
                                        <td className={styles['text-center']}>{tAsignacionJSX}</td>
                                        <td className={styles['text-center']}>{tLimiteJSX}</td>
                                        <td className={styles['text-center']}>{resolucionJSX}</td>
                                        <td className={styles['t-assigned']}>{ticket.responsable || 'Sin asignar'}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {ticketsProcesados.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '8px 16px' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                        Mostrando del {indicePrimerTicket + 1} al {Math.min(indiceUltimoTicket, ticketsProcesados.length)} de {ticketsProcesados.length} tickets
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                            disabled={paginaActual === 1}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: paginaActual === 1 ? '#f8fafc' : '#ffffff', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', color: paginaActual === 1 ? '#94a3b8' : '#334155', fontWeight: 500 }}
                        >
                            Anterior
                        </button>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                            Página {paginaActual} de {totalPaginas}
                        </span>
                        <button
                            onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                            disabled={paginaActual === totalPaginas}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: paginaActual === totalPaginas ? '#f8fafc' : '#ffffff', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', color: paginaActual === totalPaginas ? '#94a3b8' : '#334155', fontWeight: 500 }}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}