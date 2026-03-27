
export const getFechaLocalActual = (): string => {
  const ahora = new Date();
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};


export const formatearParaInput = (fecha: string | undefined | null): string => {
  if (!fecha) return "";
  try {
    return String(fecha).replace(' ', 'T').substring(0, 16);
  } catch (e) {
    return "";
  }
};


export const calcularHorasLaborables = (fechaInicioStr: string, fechaFinStr: string, listaFeriados: string[] = []): number => {
  if (!fechaInicioStr || !fechaFinStr) return 0;
  
  const inicio = new Date(formatearParaInput(fechaInicioStr));
  const fin = new Date(formatearParaInput(fechaFinStr));

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || inicio >= fin) return 0;

  const feriadosSet = new Set(listaFeriados.map(f => {
    const [year, month, day] = f.split('T')[0].split('-');
    return `${year}-${month}-${day}`;
  }));

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
  
  return minutosLaborables / 60;
};


export const validarCongruenciaFechas = (fCreacion?: string, fAsig?: string, fMax?: string, fCierre?: string): string | null => {
  const tCreacion = fCreacion ? new Date(fCreacion).getTime() : 0;
  const tAsig = fAsig ? new Date(fAsig).getTime() : 0;
  const tMax = fMax ? new Date(fMax).getTime() : 0;
  const tCierre = fCierre ? new Date(fCierre).getTime() : 0;

  if (tCreacion && tAsig && tAsig < tCreacion) return 'La Fecha de Asignación no puede ser ANTERIOR a la Fecha de registro SD.';
  if (tAsig && tMax && tMax < tAsig) return 'La Fecha Máxima de Atención no puede ser ANTERIOR a la Fecha de Asignación.';
  if (tAsig && tCierre && tCierre < tAsig) return 'La Fecha de Cierre no puede ser ANTERIOR a la Fecha de Asignación.';
  
  return null;
};