import React from 'react';
import { TicketReporte } from '@/shared/hooks/useReportes';
import { formatearFecha } from '@/features/dashboard/utils/formatters';

interface Props {
    reportes: TicketReporte[];
    esAdmin: boolean;
    styles: any;
}

export default function ReportesTabla({ reportes, esAdmin, styles }: Props) {
    return (
        <div className={styles['rep-content'] || 'rep-content'}>
            <div className={styles['section-header'] || 'section-header'}>
                <h2 className={styles['section-title'] || 'section-title'}>Detalle de Tickets</h2>
            </div>
            <div className={styles['table-container'] || 'table-container'}>
                <table className={styles['ticket-table'] || 'ticket-table'}>
                    <thead>
                        <tr>
                            <th>Ticket</th>
                            {esAdmin && <th>Responsable</th>}
                            <th>Creación SD</th>
                            <th>Fecha Asignación</th>
                            <th className={styles['text-center'] || 'text-center'}>T. Asig.</th>
                            <th className={styles['text-center'] || 'text-center'}>SLA Aten.</th>
                            <th className={styles['text-center'] || 'text-center'}>T. Res.</th>
                            <th className={styles['text-center'] || 'text-center'}>Retraso</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(!reportes || reportes.length === 0) ? ( 
                            <tr><td colSpan={esAdmin ? 9 : 8} className={styles['text-center'] || 'text-center'}>No se encontraron tickets.</td></tr> 
                        ) : (
                            reportes.map((rep: any) => (
                                <tr key={rep.ticket_id || rep.id}>
                                    
                                    <td className={`${styles['t-id'] || 't-id'} ${styles['font-bold'] || 'font-bold'}`}>{rep.codigo_ticket}</td>
                                    
                                    {esAdmin && <td className={styles['t-assigned'] || 't-assigned'}>{rep.responsable || 'Sin asignar'}</td>}
                                    
                                    <td className={styles['t-date'] || 't-date'}>{formatearFecha(rep.fecha_creacion_sd)}</td>
                                    
                                    <td className={styles['t-date'] || 't-date'}>
                                        {rep.fecha_asignacion ? formatearFecha(rep.fecha_asignacion) : <span style={{ color: '#94a3b8' }}>Pendiente</span>}
                                    </td>
                                    
                                    <td className={`${styles['text-center'] || 'text-center'} ${styles['font-bold'] || 'font-bold'}`}>
                                        {rep.dias_asignacion_real === null 
                                            ? <span style={{ color: '#94a3b8' }}>Pendiente</span> 
                                            : <span style={{ color: rep.asignacion_fuera_tiempo ? '#dc2626' : '#16a34a' }}>{Number(rep.dias_asignacion_real).toFixed(1)} d</span>
                                        }
                                    </td>
                                    
                                    <td className={`${styles['text-center'] || 'text-center'} ${styles['t-date'] || 't-date'}`} style={{ fontSize: '12px' }}>
                                        {rep.fecha_maxima_atencion ? formatearFecha(rep.fecha_maxima_atencion) : '-'}
                                    </td>
                                    
                                    <td className={`${styles['text-center'] || 'text-center'} ${styles['font-bold'] || 'font-bold'}`}>
                                        {rep.dias_atencion_real === null 
                                            ? <span style={{ color: '#94a3b8' }}>En proceso</span> 
                                            : <span style={{ color: rep.atencion_fuera_tiempo ? '#dc2626' : '#16a34a' }}>{Number(rep.dias_atencion_real).toFixed(1)} d</span>
                                        }
                                    </td>
                                    
                                    <td className={`${styles['text-center'] || 'text-center'} ${styles['font-bold'] || 'font-bold'}`}>
                                        {rep.dias_retraso_actual > 0 
                                            ? <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>+{Number(rep.dias_retraso_actual).toFixed(1)} d</span> 
                                            : <span style={{ color: '#94a3b8' }}>-</span>
                                        }
                                    </td>
                                    
                                    <td>
                                        <span className={`${styles['status-pill'] || 'status-pill'} ${['Cerrado', 'Atendido', 'Resuelto'].includes(rep.estado) ? (styles['status-resolved'] || 'status-resolved') : (styles['status-open'] || 'status-open')}`}>
                                            {rep.estado || 'Abierto'}
                                        </span>
                                    </td>

                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}