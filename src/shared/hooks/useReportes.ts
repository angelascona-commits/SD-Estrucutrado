import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { calcularHorasLaborables } from '../services/calcularHoras';

// --- INTERFACES (Definición de Tipos) ---
export interface TicketReporte {
    ticket_id: number;
    codigo_ticket: string;
    responsable_id?: string;
    responsable?: string;
    estado: string;
    fecha_creacion_sd: string;
    fecha_asignacion: string | null;
    fecha_maxima_atencion: string | null;
    fecha_atencion?: string | null;
    fecha_actualizacion?: string | null;
    dias_asignacion_real: number | null;
    asignacion_fuera_tiempo: boolean;
    dias_atencion_real: number | null;
    atencion_fuera_tiempo: boolean;
    dias_retraso_actual: number;
}

export interface ResumenReporte {
    totalTickets: number;
    abiertos: number;
    atendidos: number;
    fueraSlaAsignacion: number;
    fueraSlaAtencion: number;
    promedioDiasAsignacion: number;
    promedioDiasAtencion: number;
}

export interface SemanaDisponible {
    value: string;
    label: string;
    time: number;
}

export function useReportes() {
    const [todosLosTickets, setTodosLosTickets] = useState<TicketReporte[]>([]);
    const [reportes, setReportes] = useState<TicketReporte[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [usuarioActual, setUsuarioActual] = useState<any>(null); // Puedes cambiar 'any' por tu tipo Usuario si lo tienes
    const [feriados, setFeriados] = useState<string[]>([]);

    // Estados de filtros
    const [filtroTipo, setFiltroTipo] = useState<string>('todos');
    const [filtroMes, setFiltroMes] = useState<string>('');
    const [filtroInicio, setFiltroInicio] = useState<string>('');
    const [filtroFin, setFiltroFin] = useState<string>('');
    const [filtroSemana, setFiltroSemana] = useState<string>('');
    
    const [semanasDisponibles, setSemanasDisponibles] = useState<SemanaDisponible[]>([]);
    const [datosGraficas, setDatosGraficas] = useState<any>(null);
    const [resumen, setResumen] = useState<ResumenReporte>({
        totalTickets: 0, abiertos: 0, atendidos: 0,
        fueraSlaAsignacion: 0, fueraSlaAtencion: 0,
        promedioDiasAsignacion: 0, promedioDiasAtencion: 0
    });

    // 1. CARGA INICIAL DE DATOS
    useEffect(() => {
        const cargarDatos = async () => {
            setCargando(true);
            try {
                const sesion = localStorage.getItem('usuario_sesion');
                const usuario = sesion ? JSON.parse(sesion) : null;
                setUsuarioActual(usuario);
                if (!usuario) return;

                // Obtener feriados
                const { data: dataFeriados } = await supabase.from('feriados').select('fecha');
                const feriadosList = dataFeriados ? dataFeriados.map(f => f.fecha) : [];
                setFeriados(feriadosList);

                // Obtener tickets
                let query = supabase.from('vista_tickets_completos').select('*').order('fecha_asignacion', { ascending: false, nullsFirst: false });
                
                const { data, error } = await query;
                if (error) throw error;

                // Filtrar basura
                const ticketsValidos = (data || []).filter(t => {
                    const estado = (t.estado || '').trim().toLowerCase();
                    return estado !== 'desestimado' && estado !== 'corresponde a mg';
                });

                // Calcular SLA reutilizando calcularHorasLaborables
                const datosProcesados: TicketReporte[] = ticketsValidos.map(ticket => {
                    const esCerrado = ['Cerrado', 'Atendido', 'Resuelto'].includes(ticket.estado);
                    
                    let diasAsignacion: number | null = null, asigFueraTiempo = false;
                    if (ticket.fecha_creacion_sd && ticket.fecha_asignacion) {
                        diasAsignacion = Math.max(0, calcularHorasLaborables(ticket.fecha_creacion_sd, ticket.fecha_asignacion, feriadosList)) / 8;
                        asigFueraTiempo = diasAsignacion > 1; // SLA Asignación: 1 día
                    }

                    let diasAtencion: number | null = null, atencionFueraTiempo = false;
                    if (ticket.fecha_asignacion && esCerrado) {
                        const fechaCierre = ticket.fecha_atencion || ticket.fecha_actualizacion || new Date().toISOString();
                        diasAtencion = Math.max(0, calcularHorasLaborables(ticket.fecha_asignacion, fechaCierre, feriadosList)) / 8;
                        if (ticket.fecha_maxima_atencion) {
                            const limiteCalculado = Math.max(0, calcularHorasLaborables(ticket.fecha_asignacion, ticket.fecha_maxima_atencion, feriadosList)) / 8;
                            atencionFueraTiempo = diasAtencion > limiteCalculado;
                        }
                    }

                    let diasRetraso = 0;
                    if (ticket.fecha_maxima_atencion && !esCerrado) {
                        const retrasoHoras = calcularHorasLaborables(ticket.fecha_maxima_atencion, new Date().toISOString(), feriadosList);
                        if (retrasoHoras > 0) diasRetraso = retrasoHoras / 8;
                    }

                    return { 
                        ...ticket, 
                        dias_asignacion_real: diasAsignacion, 
                        asignacion_fuera_tiempo: asigFueraTiempo, 
                        dias_atencion_real: diasAtencion, 
                        atencion_fuera_tiempo: atencionFueraTiempo, 
                        dias_retraso_actual: diasRetraso 
                    };
                });

                setTodosLosTickets(datosProcesados);
                setSemanasDisponibles(generarSemanasDisponibles(datosProcesados));
            } catch (error) {
                console.error("Error cargando reportes:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarDatos();
    }, []);

    // 2. EFECTO DE FILTRADO
    useEffect(() => {
        if (!todosLosTickets.length) return;
        let filtrados = [...todosLosTickets];

        if (filtroTipo === 'mes' && filtroMes) {
            const [year, month] = filtroMes.split('-');
            filtrados = filtrados.filter(t => t.fecha_asignacion && t.fecha_asignacion.startsWith(`${year}-${month}`));
            setDatosGraficas(calcularDatosMultiplesGraficas(filtrados));
        } else {
            setDatosGraficas(null);
        }

        if (filtroTipo === 'rango' && (filtroInicio || filtroFin)) {
            const start = filtroInicio ? new Date(filtroInicio + 'T00:00:00').getTime() : 0;
            const end = filtroFin ? new Date(filtroFin + 'T23:59:59').getTime() : Infinity;
            filtrados = filtrados.filter(t => t.fecha_asignacion && new Date(t.fecha_asignacion).getTime() >= start && new Date(t.fecha_asignacion).getTime() <= end);
        } else if (filtroTipo === 'semana' && filtroSemana) {
            const [inicio, fin] = filtroSemana.split('|').map(Number);
            filtrados = filtrados.filter(t => t.fecha_asignacion && new Date(t.fecha_asignacion).getTime() >= inicio && new Date(t.fecha_asignacion).getTime() <= fin);
        }

        setReportes(filtrados);
        calcularResumen(filtrados);
    }, [filtroTipo, filtroMes, filtroSemana, filtroInicio, filtroFin, todosLosTickets]);

    // Lógicas internas
    const calcularResumen = (datos: TicketReporte[]) => {
        const atendidos = datos.filter(d => ['Cerrado', 'Atendido', 'Resuelto'].includes(d.estado)).length;
        const tAsig = datos.filter(d => d.dias_asignacion_real !== null);
        const tAten = datos.filter(d => d.dias_atencion_real !== null);

        setResumen({
            totalTickets: datos.length,
            abiertos: datos.length - atendidos,
            atendidos,
            fueraSlaAsignacion: datos.filter(d => d.asignacion_fuera_tiempo).length,
            fueraSlaAtencion: datos.filter(d => d.atencion_fuera_tiempo || d.dias_retraso_actual > 0).length,
            promedioDiasAsignacion: tAsig.length ? tAsig.reduce((a, b) => a + (b.dias_asignacion_real as number), 0) / tAsig.length : 0,
            promedioDiasAtencion: tAten.length ? tAten.reduce((a, b) => a + (b.dias_atencion_real as number), 0) / tAten.length : 0
        });
    };

    const generarSemanasDisponibles = (tickets: TicketReporte[]): SemanaDisponible[] => {
        const semanas = new Map<string, SemanaDisponible>();
        tickets.forEach(t => {
            if (!t.fecha_asignacion) return;
            const fecha = new Date(t.fecha_asignacion);
            const dia = fecha.getDay();
            const diff = fecha.getDate() - dia + (dia === 0 ? -6 : 1);
            const lunes = new Date(fecha); lunes.setDate(diff); lunes.setHours(0, 0, 0, 0);
            const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6); domingo.setHours(23, 59, 59, 999);
            const value = `${lunes.getTime()}|${domingo.getTime()}`;
            if (!semanas.has(value)) {
                semanas.set(value, { value, label: `${lunes.toLocaleDateString('es-ES')} al ${domingo.toLocaleDateString('es-ES')}`, time: lunes.getTime() });
            }
        });
        return Array.from(semanas.values()).sort((a, b) => b.time - a.time);
    };

    const calcularDatosMultiplesGraficas = (tickets: TicketReporte[]) => {
        const stats = Array.from({ length: 5 }, () => ({ sumAsig: 0, countAsig: 0, sumRes: 0, countRes: 0, creados: 0, resueltos: 0 }));
        tickets.forEach(t => {
            if (!t.fecha_asignacion) return;
            const weekIndex = Math.ceil(new Date(t.fecha_asignacion).getDate() / 7) - 1;
            if (weekIndex >= 0 && weekIndex < 5) {
                stats[weekIndex].creados++;
                if (['Cerrado', 'Atendido', 'Resuelto'].includes(t.estado)) stats[weekIndex].resueltos++;
                if (t.dias_asignacion_real !== null) { stats[weekIndex].sumAsig += t.dias_asignacion_real; stats[weekIndex].countAsig++; }
                if (t.dias_atencion_real !== null) { stats[weekIndex].sumRes += t.dias_atencion_real; stats[weekIndex].countRes++; }
            }
        });

        const labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'];
        return {
            totales: { labels, datasets: [{ label: 'Horas Asignación', data: stats.map(s => (s.sumAsig * 8).toFixed(1)), backgroundColor: 'rgba(245, 158, 11, 0.7)' }, { label: 'Horas Resolución', data: stats.map(s => (s.sumRes * 8).toFixed(1)), backgroundColor: 'rgba(16, 185, 129, 0.7)' }] },
            promedios: { labels, datasets: [{ label: 'Promedio Asignación', data: stats.map(s => s.countAsig ? ((s.sumAsig / s.countAsig) * 8).toFixed(1) : 0), backgroundColor: 'rgba(59, 130, 246, 0.7)' }, { label: 'Promedio Resolución', data: stats.map(s => s.countRes ? ((s.sumRes / s.countRes) * 8).toFixed(1) : 0), backgroundColor: 'rgba(99, 102, 241, 0.7)' }] },
            volumen: { labels, datasets: [{ label: 'Entrantes', data: stats.map(s => s.creados), backgroundColor: 'rgba(148, 163, 184, 0.7)' }, { label: 'Resueltos', data: stats.map(s => s.resueltos), backgroundColor: 'rgba(16, 185, 129, 0.7)' }] }
        };
    };

    return {
        cargando, usuarioActual, reportes, resumen, datosGraficas,
        filtros: { tipo: filtroTipo, mes: filtroMes, inicio: filtroInicio, fin: filtroFin, semana: filtroSemana },
        setFiltros: { setFiltroTipo, setFiltroMes, setFiltroInicio, setFiltroFin, setFiltroSemana },
        semanasDisponibles
    };
}