import React, { useState } from 'react';
import { useReportes } from '@/shared/hooks/useReportes';
import ReportesFiltros from './components/ReportesFiltros';
import ReportesKPIs from './components/ReportesKPIs';
import ReportesGraficas from './components/ReportesGraficas';
import ReportesTabla from './components/ReportesTabla';
import styles from './Reportes.module.css';

// IMPORTACIONES PARA DESCARGAS
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatearFecha } from '@/features/dashboard/utils/formatters';

export default function Reportes() {
    const { 
        cargando, usuarioActual, reportes, resumen, datosGraficas, 
        filtros, setFiltros, semanasDisponibles 
    } = useReportes();

    const [mostrarGraficas, setMostrarGraficas] = useState<boolean>(false);
    const esAdmin = usuarioActual?.rol === 'Administrador';

    const exportarExcel = () => {
        if (!reportes || reportes.length === 0) {
            alert("No hay datos para exportar");
            return;
        }

        const libro = XLSX.utils.book_new();

        // --- HOJA 1: DETALLE DE TICKETS ---
        const dataAExportar = reportes.map((rep: any) => ({
            "Ticket ID": rep.codigo_ticket,
            "Responsable": rep.responsable || 'Sin asignar',
            "Fecha Creación SD": formatearFecha(rep.fecha_creacion_sd),
            "Fecha Asignación": rep.fecha_asignacion ? formatearFecha(rep.fecha_asignacion) : 'Pendiente',
            "Días Asignación": rep.dias_asignacion_real !== null ? Number(rep.dias_asignacion_real).toFixed(1) : 'Pendiente',
            "SLA Atención": rep.fecha_maxima_atencion ? formatearFecha(rep.fecha_maxima_atencion) : '-',
            "Días Resolución": rep.dias_atencion_real !== null ? Number(rep.dias_atencion_real).toFixed(1) : 'En proceso',
            "Retraso (Días)": rep.dias_retraso_actual > 0 ? Number(rep.dias_retraso_actual).toFixed(1) : '0',
            "Estado": rep.estado || 'Abierto'
        }));
        const hojaTickets = XLSX.utils.json_to_sheet(dataAExportar);
        XLSX.utils.book_append_sheet(libro, hojaTickets, "Detalle Tickets");

        // --- HOJA 2: RESUMEN / KPIs (Ajustado a tu useReportes real) ---
        if (resumen) {
            const dataResumen = [
                { "Métrica": "Total de Tickets", "Valor": resumen.totalTickets },
                { "Métrica": "Tickets Abiertos", "Valor": resumen.abiertos },
                { "Métrica": "Tickets Atendidos/Cerrados", "Valor": resumen.atendidos },
                { "Métrica": "Tickets Fuera de SLA (Asignación)", "Valor": resumen.fueraSlaAsignacion },
                { "Métrica": "Tickets Fuera de SLA (Atención)", "Valor": resumen.fueraSlaAtencion },
                { "Métrica": "Promedio de Días (Asignación)", "Valor": Number(resumen.promedioDiasAsignacion).toFixed(1) },
                { "Métrica": "Promedio de Días (Atención)", "Valor": Number(resumen.promedioDiasAtencion).toFixed(1) }
            ];
            const hojaResumen = XLSX.utils.json_to_sheet(dataResumen);
            XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen General");
        }

        XLSX.writeFile(libro, "Reporte_Tickets.xlsx");
    };

    // --- FUNCIÓN PARA EXPORTAR A PDF ---
    const exportarPDF = () => {
        if (!reportes || reportes.length === 0) {
            alert("No hay datos para exportar");
            return;
        }

        const doc = new jsPDF('landscape'); // Formato horizontal
        
        // --- PÁGINA 1: TABLA DE DATOS ---
        doc.text("Reporte de Tickets - Detalle", 14, 15);

        const columnas = ["Ticket", "Responsable", "Creación", "Asignación", "T. Asig.", "SLA Aten.", "T. Res.", "Retraso", "Estado"];
        const filas = reportes.map((rep: any) => [
            rep.codigo_ticket,
            rep.responsable || 'Sin asignar',
            formatearFecha(rep.fecha_creacion_sd),
            rep.fecha_asignacion ? formatearFecha(rep.fecha_asignacion) : 'Pendiente',
            rep.dias_asignacion_real !== null ? `${Number(rep.dias_asignacion_real).toFixed(1)} d` : '-',
            rep.fecha_maxima_atencion ? formatearFecha(rep.fecha_maxima_atencion) : '-',
            rep.dias_atencion_real !== null ? `${Number(rep.dias_atencion_real).toFixed(1)} d` : '-',
            rep.dias_retraso_actual > 0 ? `+${Number(rep.dias_retraso_actual).toFixed(1)} d` : '-',
            rep.estado || 'Abierto'
        ]);

        autoTable(doc, {
            head: [columnas],
            body: filas,
            startY: 20,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [236, 91, 19] } 
        });

        // --- PÁGINAS SIGUIENTES: GRÁFICOS ---
        // Buscamos todas las etiquetas <canvas> que genera Chart.js en la pantalla
        const graficas = document.querySelectorAll('canvas');
        
        if (graficas.length > 0) {
            graficas.forEach((canvas, index) => {
                doc.addPage(); // Creamos una hoja nueva por gráfico
                doc.text(`Gráfico de Rendimiento ${index + 1}`, 14, 15);
                
                // Convertimos el gráfico a una imagen PNG en memoria base64
                const imgData = canvas.toDataURL('image/png');
                
                // Pegamos la imagen en el PDF (x: 15, y: 25, ancho: 260, alto: 120)
                // Ajusta estos últimos dos números si tus gráficos se ven muy estirados
                doc.addImage(imgData, 'PNG', 15, 25, 260, 120); 
            });
        }

        doc.save("Reporte_Tickets.pdf");
    };

    // --- VISTA DE CARGA ---
    if (cargando) return (
        <div className={styles['spinner-container']}>
            <div className={styles.spinner}></div>
            <span className={styles['spinner-text']}>Calculando métricas...</span>
        </div>
    );

    // --- VISTA PRINCIPAL ---
    return (
        <div className={styles['reportes-container']}>
            
            {/* HEADER INTEGRADO */}
            <div className={styles['rep-header']}>
                <div>
                    <h1 className={styles['rep-title']}>Reportes</h1>
                    <p className={styles['rep-subtitle']}>Resumen de rendimiento y tickets</p>
                </div>
                
                <div className={styles['rep-actions']}>
                    {/* Botón para mostrar/ocultar gráficas */}
                    {!!datosGraficas && (
                        <button 
                            className={styles['btn-outline']} 
                            onClick={() => setMostrarGraficas(!mostrarGraficas)}
                        >
                            <span className="material-symbols-outlined">
                                {mostrarGraficas ? 'bar_chart_off' : 'bar_chart'}
                            </span>
                            {mostrarGraficas ? 'Ocultar Gráficas' : 'Ver Gráficas'}
                        </button>
                    )}

                    {/* Botón Exportar PDF */}
                    <button className={styles['btn-outline']} onClick={exportarPDF}>
                        <span className="material-symbols-outlined">picture_as_pdf</span>
                        Exportar PDF
                    </button>
                    
                    {/* Botón Exportar Excel */}
                    <button className={styles['btn-primary']} onClick={exportarExcel}>
                        <span className="material-symbols-outlined">download</span>
                        Exportar Excel
                    </button>
                </div>
            </div>

            <ReportesFiltros 
                filtros={filtros} 
                setFiltros={setFiltros} 
                semanasDisponibles={semanasDisponibles} 
                styles={styles}
            />

            <ReportesKPIs resumen={resumen} styles={styles} />

            {datosGraficas && mostrarGraficas && (
                <ReportesGraficas datosGraficas={datosGraficas} styles={styles} />
            )}

            <ReportesTabla reportes={reportes} esAdmin={esAdmin} styles={styles} />

        </div>
    );
}