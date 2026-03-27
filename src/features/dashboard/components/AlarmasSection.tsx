"use client";
import React from 'react';
import { Ticket } from '../types/dashboard.types';
import styles from '../styles/dashboard.module.css';

interface Props {
    alarmas: Ticket[];
    onAbrirModal: (numeroTicket: number | null) => void;
    onAbrirRetrasos: () => void;
}

export default function AlarmasSection({ alarmas, onAbrirModal, onAbrirRetrasos }: Props) {
    return (
        <section>
            <div className={styles['section-header']}>
                <h2 className={styles['section-title']}>
                    <span className={`material-symbols-outlined ${styles['alert-icon']}`}>notifications_active</span>
                    Alarma de Pendientes
                </h2>
                <button className={styles['btn-link']} onClick={onAbrirRetrasos} style={{ cursor: 'pointer' }}>
                    Ver todos los retrasos
                </button>
            </div>

            <div className={styles['alarm-grid']}>
                {alarmas.length === 0 ? (
                    <p style={{ color: '#047857', fontWeight: 'bold' }}>No hay tickets atrasados hoy</p>
                ) : (
                    alarmas.map((ticket) => {
                        const esCritico = (ticket.dias_retraso || 0) > 5;
                        const claseBorde = esCritico ? styles['border-red'] : styles['border-orange'];
                        const claseBadge = esCritico ? styles['badge-red'] : styles['badge-orange'];

                        return (
                            <div key={ticket.ticket_id} className={`${styles['alarm-card']} ${claseBorde}`}>
                                <div className={styles['card-top']}>
                                    <span className={styles['ticket-id']}>{ticket.codigo_ticket}</span>
                                    <span className={`${styles.badge} ${claseBadge}`}>{ticket.dias_retraso} DÍAS DE RETRASO</span>
                                </div>
                                <p className={styles['ticket-desc']}>{ticket.descripcion}</p>
                                <div className={styles['card-bottom']}>
                                    <span className={styles['ticket-assigned']}>Designado: <strong>{ticket.responsable || 'Sin asignar'}</strong></span>
                                    <button className={styles['btn-manage']} onClick={() => onAbrirModal(ticket.numero_ticket as number)}>Gestionar →</button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}