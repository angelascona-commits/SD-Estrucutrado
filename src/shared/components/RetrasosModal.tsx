import React from 'react';
import styles from './retrasos.module.css';
import { useRetrasos } from '../hooks/useRetrasos';

interface RetrasosModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RetrasosModal({ isOpen, onClose }: RetrasosModalProps) {
    const { retrasos, cargando } = useRetrasos(isOpen);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: '#dc2626' }}>warning</span>
                        Tickets con Retraso
                    </h2>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className={styles.body}>
                    {cargando ? (
                        <p style={{ textAlign: 'center', padding: '20px' }}>Cargando retrasos...</p>
                    ) : retrasos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#22c55e' }}>check_circle</span>
                            <h3>¡Todo al día!</h3>
                            <p>No hay tickets pendientes con retraso.</p>
                        </div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Asunto / Aplicación</th>
                                        <th>Responsable</th>
                                        <th style={{ textAlign: 'center' }}>Retraso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {retrasos.map(ticket => (
                                        <tr key={ticket.ticket_id}>
                                            <td style={{ fontWeight: 'bold' }}>{ticket.codigo_ticket}</td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{ticket.descripcion?.substring(0, 50)}...</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>App: {ticket.aplicacion || 'N/A'}</div>
                                            </td>
                                            <td>{ticket.responsable || 'Sin asignar'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={styles.badgeRetraso}>
                                                    {ticket.dias_retraso}{ticket.dias_retraso === 1 ? 'día' : 'días'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button 
                        onClick={onClose}
                        style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}