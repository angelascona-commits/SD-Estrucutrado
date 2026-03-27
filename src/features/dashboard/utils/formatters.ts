export const obtenerClaseEstado = (estado: string): string => {
    switch (estado) {
        case 'Pendiente': return 'status-open';
        case 'En proceso': return 'status-progress';
        case 'Atendido':
        case 'Cerrado':
        case 'Resuelto': return 'status-resolved';
        default: return 'status-open';
    }
};

export const formatearFecha = (fechaIso: string | null): string => {
    if (!fechaIso) return '-';
    const fecha = new Date(fechaIso);
    return fecha.toLocaleString('es-PE', {
        timeZone: 'UTC',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export const obtenerPesoEstado = (estado: string | null): number => {
    const est = (estado || '').toLowerCase();
    if (est.includes('pendiente')) return 1;
    if (est.includes('proceso')) return 2;
    return 3;
};