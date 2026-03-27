import React from 'react';

interface Props {
    esAdmin: boolean;
    usuarioActual: any;
    mostrarGraficas: boolean;
    setMostrarGraficas: (val: boolean) => void;
    tieneGraficas: boolean;
    onExportarExcel: () => void;
    onDescargarPDF: () => void;
    styles: any;
}

export default function ReportesHeader({ esAdmin, usuarioActual, mostrarGraficas, setMostrarGraficas, tieneGraficas, onExportarExcel, onDescargarPDF, styles }: Props) {
    return (
        <div className={styles['rep-header']}>
            <div>
                <h1 className={styles['rep-title']}>Análisis de Nivel de Servicio (SLA)</h1>
                <p className={styles['rep-subtitle']}>
                    {esAdmin ? "Vista Global: Monitoreo de tiempos de todo el equipo." : `Mis Métricas: Rendimiento de ${usuarioActual?.nombre || 'Agente'}`}
                </p>
            </div>
            <div className={styles['rep-actions']}>
                <button className={styles['btn-outline']} onClick={() => window.location.reload()}>
                    <span className="material-symbols-outlined">refresh</span>
                </button>
                {tieneGraficas && (
                    <button 
                        className={`${styles['btn-export']} ${mostrarGraficas ? styles['btn-red'] : styles['btn-blue']}`} 
                        onClick={() => setMostrarGraficas(!mostrarGraficas)}
                    >
                        <span className="material-symbols-outlined">{mostrarGraficas ? 'bar_chart_off' : 'bar_chart'}</span> 
                        {mostrarGraficas ? 'Ocultar Panel' : 'Ver Gráficas'}
                    </button>
                )}
                <button className={styles['btn-outline']} onClick={onDescargarPDF}>
                    <span className="material-symbols-outlined">picture_as_pdf</span> PDF
                </button>
                <button className={styles['btn-primary']} onClick={onExportarExcel}>
                    <span className="material-symbols-outlined">table_view</span> Excel
                </button>
            </div>
        </div>
    );
}