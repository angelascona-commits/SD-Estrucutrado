import React, { useState } from 'react';
import styles from '../styles/dashboard.module.css';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { useDashboardSort } from '../hooks/useDashboardSort';
import AlarmasSection from './AlarmasSection';
import DashboardTable from './DashboardTable';

// 1. COMENTAMOS LAS IMPORTACIONES DE LOS MODALES
import TicketModal from '@/shared/components/TicketModal'; 
import RetrasosModal from '@/shared/components/RetrasosModal';

export default function DashboardView() {
    const { alarmas, ticketsRecientes, feriados, cargando } = useDashboardData();
    const filterData = useDashboardFilters(ticketsRecientes);
    const sortData = useDashboardSort(filterData.ticketsFiltrados);

    const [modalAbierto, setModalAbierto] = useState(false);
    const [ticketSeleccionado, setTicketSeleccionado] = useState<number | null>(null);
    const [modalRetrasosAbierto, setModalRetrasosAbierto] = useState(false);

    const abrirModal = (numeroTicket: number | null) => {
        setTicketSeleccionado(numeroTicket);
        setModalAbierto(true);
    };

    const abrirRetrasos = () => {
        setModalRetrasosAbierto(true);
    }

    if (cargando) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                <span>Cargando tu información...</span>
            </div>
        );
    }

    return (
        <div className={styles['dashboard-container']}>
            <div className={styles['dash-header']}>
                <div><h1 className={styles['dash-title']}>Vista de Dashboard</h1></div>
                <button className={styles['btn-primary']} onClick={() => abrirModal(null)}>
                    <span className="material-symbols-outlined">add</span> Nuevo Ticket
                </button>
            </div>

            <div className={styles['dash-content']}>
                <AlarmasSection 
                    alarmas={alarmas} 
                    onAbrirModal={abrirModal} 
                    onAbrirRetrasos={abrirRetrasos} 
                />

                <DashboardTable 
                    ticketsProcesados={sortData.ticketsProcesados}
                    feriados={feriados}
                    filterData={filterData}
                    sortData={sortData}
                    onAbrirModal={abrirModal}
                />
            </div>
            {modalAbierto && (
                <TicketModal 
                    isOpen={modalAbierto} 
                    onClose={() => setModalAbierto(false)} 
                    numeroTicket={ticketSeleccionado}
                    // 🟢 NUEVO: Qué hacer cuando guarde con éxito
                    onSuccess={() => {
                        console.log("Ticket guardado");
                    }}
                />
            )}
            {modalRetrasosAbierto && <RetrasosModal isOpen={modalRetrasosAbierto} onClose={() => setModalRetrasosAbierto(false)} />} 
        </div>
    );
}