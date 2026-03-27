"use client";
import { useState, useMemo } from 'react';
import { Ticket, FiltrosDashboard } from '../types/dashboard.types';

export const useDashboardFilters = (ticketsRecientes: Ticket[]) => {
    const [filtros, setFiltros] = useState<FiltrosDashboard>({
        fecha_asignacion_desde: '', fecha_asignacion_hasta: '', fecha_asignacion_vacia: false,
        fecha_creacion_sd_desde: '', fecha_creacion_sd_hasta: '', fecha_creacion_sd_vacia: false,
        estado: '', codigo_ticket: '', descripcion: '', aplicacion: '', responsable: ''
    });
    const [filtroActivo, setFiltroActivo] = useState<string | null>(null);

    const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = isCheckbox ? (e.target as HTMLInputElement).checked : false;
        
        setFiltros(prev => ({
            ...prev,
            [name]: isCheckbox ? checked : value
        }));
    };

    const toggleFiltroMenu = (columna: string) => setFiltroActivo(prev => prev === columna ? null : columna);

    const limpiarFiltroColumna = (campos: string[]) => {
        const nuevosFiltros = { ...filtros };
        campos.forEach(campo => nuevosFiltros[campo] = typeof filtros[campo] === 'boolean' ? false : '');
        setFiltros(nuevosFiltros);
        setFiltroActivo(null);
    };

    const tieneFiltroActivo = (campos: string[]) => campos.some(campo => filtros[campo] !== '' && filtros[campo] !== false);

    const opcionesEstado = useMemo(() => [...new Set(ticketsRecientes.map(t => t.estado).filter(Boolean))].sort(), [ticketsRecientes]);
    const opcionesApp = useMemo(() => [...new Set(ticketsRecientes.map(t => t.aplicacion).filter(Boolean))].sort(), [ticketsRecientes]);
    const opcionesResponsable = useMemo(() => [...new Set(ticketsRecientes.map(t => t.responsable).filter(Boolean))].sort(), [ticketsRecientes]);

    const ticketsFiltrados = useMemo(() => {
        return ticketsRecientes.filter(ticket => {
            const matchEstado = filtros.estado === '' || ticket.estado === filtros.estado;
            const matchApp = filtros.aplicacion === '' || ticket.aplicacion === filtros.aplicacion;
            const matchResp = filtros.responsable === '' || ticket.responsable === filtros.responsable;
            const matchId = (ticket.codigo_ticket || '').toLowerCase().includes(String(filtros.codigo_ticket).toLowerCase());
            const matchDesc = (ticket.descripcion || '').toLowerCase().includes(String(filtros.descripcion).toLowerCase());

            let matchFechaAsignacion = true;
            const hayFiltroAsignacion = filtros.fecha_asignacion_desde !== '' || filtros.fecha_asignacion_hasta !== '' || filtros.fecha_asignacion_vacia;
            
            if (hayFiltroAsignacion) {
                if (filtros.fecha_asignacion_vacia) {
                    matchFechaAsignacion = !ticket.fecha_asignacion;
                } else if (!ticket.fecha_asignacion) {
                    matchFechaAsignacion = false;
                } else {
                    if (filtros.fecha_asignacion_desde) matchFechaAsignacion = matchFechaAsignacion && (ticket.fecha_asignacion >= filtros.fecha_asignacion_desde);
                    if (filtros.fecha_asignacion_hasta) {
                        const hasta = new Date(filtros.fecha_asignacion_hasta as string);
                        hasta.setHours(23, 59, 59, 999);
                        matchFechaAsignacion = matchFechaAsignacion && (new Date(ticket.fecha_asignacion) <= hasta);
                    }
                }
            }

            // --- CORRECCIÓN: Lógica de Fechas de Creación SD ---
            let matchFechaCreacion = true;
            const hayFiltroCreacion = filtros.fecha_creacion_sd_desde !== '' || filtros.fecha_creacion_sd_hasta !== '' || filtros.fecha_creacion_sd_vacia;

            if (hayFiltroCreacion) {
                if (filtros.fecha_creacion_sd_vacia) {
                    matchFechaCreacion = !ticket.fecha_creacion_sd;
                } else if (!ticket.fecha_creacion_sd) {
                    matchFechaCreacion = false;
                } else {
                    if (filtros.fecha_creacion_sd_desde) matchFechaCreacion = matchFechaCreacion && (ticket.fecha_creacion_sd >= filtros.fecha_creacion_sd_desde);
                    if (filtros.fecha_creacion_sd_hasta) {
                        const hasta = new Date(filtros.fecha_creacion_sd_hasta as string);
                        hasta.setHours(23, 59, 59, 999);
                        matchFechaCreacion = matchFechaCreacion && (new Date(ticket.fecha_creacion_sd) <= hasta);
                    }
                }
            }

            return matchEstado && matchApp && matchResp && matchId && matchDesc && matchFechaAsignacion && matchFechaCreacion;
        });
    }, [ticketsRecientes, filtros]);

    return { filtros, filtroActivo, setFiltroActivo, handleFiltroChange, toggleFiltroMenu, limpiarFiltroColumna, tieneFiltroActivo, opcionesEstado, opcionesApp, opcionesResponsable, ticketsFiltrados };
};