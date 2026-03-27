import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
    datosGraficas: any;
    styles: any;
}

export default function ReportesGraficas({ datosGraficas, styles }: Props) {
    return (
        <div className={`${styles['rep-content']} ${styles['charts-container']}`} style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className={styles['section-title']} style={{ margin: 0 }}>Panel Gráfico de Tendencias Mensuales</h2>
                <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>* Puedes hacer clic en las leyendas o pasar el ratón sobre las barras.</span>
            </div>

            {/* GRÁFICA 1 */}
            <div className={styles['chart-wrapper']} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
                <Bar 
                    id="chart-totales" 
                    data={datosGraficas.totales} 
                    options={{
                        responsive: true,
                        plugins: { 
                            legend: { position: 'top' }, 
                            title: { display: true, text: 'Acumulado Total de Horas Trabajadas', font: { size: 14 } },
                            tooltip: { 
                                mode: 'index', intersect: false, 
                                callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y} horas` } 
                            }
                        },
                        scales: { y: { beginAtZero: true, title: { display: true, text: 'Horas Laborables Totales' } } }
                    }} 
                />
            </div>

            {/* GRÁFICA 2 */}
            <div className={styles['chart-wrapper']} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
                <Bar 
                    id="chart-promedios" 
                    data={datosGraficas.promedios} 
                    options={{
                        responsive: true,
                        plugins: { 
                            legend: { position: 'top' }, 
                            title: { display: true, text: 'Promedio de Horas por Ticket', font: { size: 14 } },
                            tooltip: { 
                                mode: 'index', intersect: false, 
                                callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y} horas` } 
                            }
                        },
                        scales: { y: { beginAtZero: true, title: { display: true, text: 'Horas Promedio' } } }
                    }} 
                />
            </div>

            {/* GRÁFICA 3 */}
            <div className={styles['chart-wrapper']} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <Bar 
                    id="chart-volumen" 
                    data={datosGraficas.volumen} 
                    options={{
                        responsive: true,
                        plugins: { 
                            legend: { position: 'top' }, 
                            title: { display: true, text: 'Volumen de Tickets (Entrantes vs Resueltos)', font: { size: 14 } },
                            tooltip: { 
                                mode: 'index', intersect: false, 
                                callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y} tickets` } 
                            }
                        },
                        scales: { y: { beginAtZero: true, title: { display: true, text: 'Cantidad de Tickets' } } }
                    }} 
                />
            </div>

        </div>
    );
}