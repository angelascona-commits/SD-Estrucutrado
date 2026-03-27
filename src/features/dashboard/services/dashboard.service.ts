import { supabase } from '@/lib/supabase';
import { Ticket } from '../types/dashboard.types';

export const obtenerFeriados = async (): Promise<string[]> => {
    const { data: dataFeriados, error } = await supabase.from('feriados').select('fecha');
    if (error) {
        console.error("Error cargando feriados:", error.message);
        return [];
    }
    return dataFeriados ? dataFeriados.map(f => f.fecha) : [];
};

export const obtenerAlarmas = async (): Promise<Ticket[]> => {
    const { data: dataAlarmas, error: errorAlarmas } = await supabase
        .from('vista_tickets_completos')
        .select('*')
        .neq('estado', 'Cerrado')
        .neq('estado', 'Atendido')
        .gt('dias_retraso', 0)
        .order('dias_retraso', { ascending: false })
        .limit(3);

    if (errorAlarmas) throw errorAlarmas;
    return dataAlarmas || [];
};

export const obtenerTicketsRecientes = async (): Promise<Ticket[]> => {
    const { data: dataTickets, error: errorTickets } = await supabase
        .from('vista_tickets_completos')
        .select('*')
        .limit(400);

    if (errorTickets) throw errorTickets;
    return dataTickets || [];
};