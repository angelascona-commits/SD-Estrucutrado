import React from 'react';
import { ResumenReporte } from '../../../shared/hooks/useReportes';

interface Props {
    resumen: ResumenReporte;
    styles: any;
}

export default function ReportesKPIs({ resumen, styles }: Props) {
    return (
        <div className={styles['kpi-grid']}>
            <div className={styles['kpi-card']}>
                <div className={`${styles['kpi-icon']} ${styles['icon-blue']}`}><span className="material-symbols-outlined">tag</span></div>
                <div className={styles['kpi-info']}><h3>{resumen.totalTickets}</h3><p>Total Creados</p></div>
            </div>
            <div className={styles['kpi-card']}>
                <div className={`${styles['kpi-icon']} ${styles['icon-orange']}`}><span className="material-symbols-outlined">pending_actions</span></div>
                <div className={styles['kpi-info']}><h3>{resumen.abiertos}</h3><p>Tickets Abiertos</p></div>
            </div>
            <div className={styles['kpi-card']}>
                <div className={`${styles['kpi-icon']} ${styles['icon-green']}`}><span className="material-symbols-outlined">task_alt</span></div>
                <div className={styles['kpi-info']}><h3>{resumen.atendidos}</h3><p>Tickets Resueltos</p></div>
            </div>
            <div className={styles['kpi-card']}>
                <div className={`${styles['kpi-icon']} ${resumen.promedioDiasAsignacion > 1 ? styles['icon-red'] : styles['icon-blue']}`}>
                    <span className="material-symbols-outlined">person_add</span>
                </div>
                <div className={styles['kpi-info']}>
                    <h3 style={{ color: resumen.promedioDiasAsignacion > 1 ? '#dc2626' : 'inherit' }}>
                        {resumen.promedioDiasAsignacion.toFixed(1)} <span style={{ fontSize: '12px' }}>días</span>
                    </h3>
                    <p>Promedio Asignación</p>
                </div>
            </div>
            <div className={styles['kpi-card']}>
                <div className={`${styles['kpi-icon']} ${styles['icon-blue']}`}><span className="material-symbols-outlined">timer</span></div>
                <div className={styles['kpi-info']}>
                    <h3>{resumen.promedioDiasAtencion.toFixed(1)} <span style={{ fontSize: '12px' }}>días</span></h3>
                    <p>Promedio Resolución</p>
                </div>
            </div>
            <div className={styles['kpi-card']}>
                <div className={`${styles['kpi-icon']} ${(resumen.fueraSlaAsignacion > 0 || resumen.fueraSlaAtencion > 0) ? styles['icon-red'] : styles['icon-green']}`}>
                    <span className="material-symbols-outlined">assignment_late</span>
                </div>
                <div className={styles['kpi-info']}>
                    <h3 style={{ color: (resumen.fueraSlaAsignacion > 0 || resumen.fueraSlaAtencion > 0) ? '#dc2626' : 'inherit' }}>
                        {resumen.fueraSlaAsignacion + resumen.fueraSlaAtencion}
                    </h3>
                    <p>Fuera de SLA</p>
                </div>
            </div>
        </div>
    );
}