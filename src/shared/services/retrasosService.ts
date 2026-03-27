import { supabase } from "@/lib/supabase";
import { RetrasoTicket } from '../types/retrasos.types';

export const fetchRetrasos = async (): Promise<RetrasoTicket[]> => {
    const { data, error } = await supabase
        .from('vista_tickets_completos')
        .select('*')
        .gt('dias_retraso', 0)
        .order('dias_retraso', { ascending: false });

    if (error) throw error;

    const estadosExcluidos = ['Cerrado', 'Atendido', 'Resuelto'];
    return (data || []).filter(t => !estadosExcluidos.includes(t.estado));
};