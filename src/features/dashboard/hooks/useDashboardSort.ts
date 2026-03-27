import { useState, useMemo } from 'react';
import { Ticket, OrdenConfig } from '../types/dashboard.types';
import { obtenerPesoEstado } from '../utils/formatters';

export const useDashboardSort = (ticketsFiltrados: Ticket[]) => {
    const [ordenConfig, setOrdenConfig] = useState<OrdenConfig>({ columna: null, direccion: 'asc' });

    const manejarOrdenClick = (columna: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setOrdenConfig(prev => ({
            columna,
            direccion: prev.columna === columna && prev.direccion === 'asc' ? 'desc' : 'asc'
        }));
    };

    const ticketsProcesados = useMemo(() => {
        return [...ticketsFiltrados].sort((a, b) => {
            if (ordenConfig.columna) {
                let valA = a[ordenConfig.columna] || '';
                let valB = b[ordenConfig.columna] || '';
                if (valA < valB) return ordenConfig.direccion === 'asc' ? -1 : 1;
                if (valA > valB) return ordenConfig.direccion === 'asc' ? 1 : -1;
                return 0;
            } else {
                const pesoA = obtenerPesoEstado(a.estado);
                const pesoB = obtenerPesoEstado(b.estado);
                if (pesoA !== pesoB) return pesoA - pesoB;
                const fechaA = a.fecha_asignacion ? new Date(a.fecha_asignacion).getTime() : 0;
                const fechaB = b.fecha_asignacion ? new Date(b.fecha_asignacion).getTime() : 0;
                return fechaB - fechaA;
            }
        });
    }, [ticketsFiltrados, ordenConfig]);

    return { ordenConfig, manejarOrdenClick, ticketsProcesados };
};