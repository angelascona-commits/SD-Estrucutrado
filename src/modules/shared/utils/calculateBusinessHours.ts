import { Feriado } from '@/modules/service-desk/interfaces/ticket.interfaces';

// Convierte un timestamp a un objeto Date. Como la BD guarda
// directamente la hora peruana como UTC (ej. 16:29:00+00 significa 16:29 PM local),
// devolvemos el Date tal cual y la lógica utilizará los métodos getUTC*()
function getPeruUTCDate(dateStr: string): Date {
  return new Date(dateStr);
}

export function calculateBusinessHours(
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined,
  feriados: Feriado[]
): number | null {
  if (!startDateStr || !endDateStr) return null;

  // Trabajaremos toda la lógica exclusivamente con métodos UTC
  const start = getPeruUTCDate(startDateStr);
  const end = getPeruUTCDate(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (start >= end) return 0;

  // Tranformar feriados a Set para búsqueda O(1)
  const feriadosSet = new Set(
    feriados.map((f) => f.fecha) // f.fecha = 'YYYY-MM-DD'
  );

  const isBusinessDay = (d: Date) => {
    const day = d.getUTCDay(); // 0 es Domingo, 6 es Sábado
    if (day === 0 || day === 6) return false;

    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;

    if (feriadosSet.has(dateString)) return false;

    return true;
  };

  let totalMilliseconds = 0;

  // Clonar inicio para recorrer día a día
  let current = new Date(start.getTime());

  while (current < end) {
    if (isBusinessDay(current)) {
      // Definir los bloques horarios usando UTC estricto.
      // Así aseguramos que 9 corresponda a las 9 AM de Perú.
      const morningStart = new Date(current.getTime());
      morningStart.setUTCHours(9, 0, 0, 0);
      const morningEnd = new Date(current.getTime());
      morningEnd.setUTCHours(13, 0, 0, 0);

      const afternoonStart = new Date(current.getTime());
      afternoonStart.setUTCHours(14, 0, 0, 0);
      const afternoonEnd = new Date(current.getTime());
      afternoonEnd.setUTCHours(18, 0, 0, 0);

      // Traslape de tiempo en la Mañana
      const overlapMorningStart = new Date(Math.max(current.getTime(), morningStart.getTime()));
      const overlapMorningEnd = new Date(Math.min(end.getTime(), morningEnd.getTime()));

      if (overlapMorningStart < overlapMorningEnd) {
        totalMilliseconds += overlapMorningEnd.getTime() - overlapMorningStart.getTime();
      }

      // Traslape de tiempo en la Tarde
      const overlapAfternoonStart = new Date(Math.max(current.getTime(), afternoonStart.getTime()));
      const overlapAfternoonEnd = new Date(Math.min(end.getTime(), afternoonEnd.getTime()));

      if (overlapAfternoonStart < overlapAfternoonEnd) {
        totalMilliseconds += overlapAfternoonEnd.getTime() - overlapAfternoonStart.getTime();
      }
    }

    // Avanzar al siguiente día exacto a las 00:00:00 (Huso horario desplazado a Perú)
    current.setUTCDate(current.getUTCDate() + 1);
    current.setUTCHours(0, 0, 0, 0);
  }

  const hours = totalMilliseconds / (1000 * 60 * 60);
  return Number(hours.toFixed(2));
}

// Convertimos las horas netas a días (1 día laboral = 8 horas)
export function calculateBusinessDays(
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined,
  feriados: Feriado[]
): number | null {
  const hours = calculateBusinessHours(startDateStr, endDateStr, feriados);
  if (hours === null) return null;
  
  return Number((hours / 8).toFixed(2));
}
