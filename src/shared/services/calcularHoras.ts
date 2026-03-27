import { Feriado } from '../../features/dashboard/types/dashboard.types';

export const calcularHorasLaborables = (
    fechaInicioStr: string | null, 
    fechaFinStr: string | null, 
    listaFeriados: (Feriado | string)[] = []
): number => {
    if (!fechaInicioStr || !fechaFinStr) return 0;
    
    const limpiarFecha = (fecha: string) => String(fecha).replace(' ', 'T').substring(0, 16);

    let inicio = new Date(limpiarFecha(fechaInicioStr));
    let fin = new Date(limpiarFecha(fechaFinStr));
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return 0;

    const feriadosSet = new Set(listaFeriados.map(f => {
        if (typeof f === 'string') return f;
        if (!f.fecha) return f;
        const [year, month, day] = f.fecha.split('T')[0].split('-');
        return `${year}-${month}-${day}`;
    }));

    let esNegativo = false;
    if (inicio > fin) {
        const temp = inicio;
        inicio = fin;
        fin = temp;
        esNegativo = true;
    }

    let minutosLaborables = 0;
    let actual = new Date(inicio.getTime());

    while (actual < fin) {
        const dia = actual.getDay();
        const hora = actual.getHours();
        const fechaLocalStr = `${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, '0')}-${String(actual.getDate()).padStart(2, '0')}`;

        if (dia >= 1 && dia <= 5 && hora >= 9 && hora < 18 && hora !== 13 && !feriadosSet.has(fechaLocalStr)) {
            minutosLaborables++;
        }
        actual.setMinutes(actual.getMinutes() + 1);
    }

    const horas = minutosLaborables / 60;
    return esNegativo ? -horas : horas;
};