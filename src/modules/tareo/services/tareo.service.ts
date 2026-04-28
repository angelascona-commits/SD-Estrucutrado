import ExcelJS from 'exceljs'
import type {
  RegistroFormData,
  TareaFilters,
  TareaFormData,
  TareaPeriodoListItem,
  RegistroDetalleItem
} from '../interfaces/tareo.interfaces'

export function validateTareaPayload(payload: TareaFormData): void {
  if (!payload.periodo_id) {
    throw new Error('El período es obligatorio')
  }

  if (!payload.nombre?.trim()) {
    throw new Error('El nombre de la tarea es obligatorio')
  }

  if (!payload.proyecto_id) {
    throw new Error('El proyecto es obligatorio')
  }

  if (!payload.solicitante_id) {
    throw new Error('El solicitante es obligatorio')
  }

  if (!payload.estado_id) {
    throw new Error('El estado es obligatorio')
  }

  if (Number(payload.horas_historicas_arrastre) < 0) {
    throw new Error('Las horas históricas no pueden ser menores a 0')
  }

  if (Number(payload.horas_asignadas_periodo) < 0) {
    throw new Error('Las horas asignadas del período no pueden ser menores a 0')
  }
}

export function validateTareaUpdatePayload(
  payload: TareaFormData,
  currentTask: TareaPeriodoListItem | null
): void {
  validateTareaPayload(payload)

  if (!currentTask) {
    throw new Error('No se encontró la tarea del período a editar')
  }

  if (Number(payload.horas_asignadas_periodo) < Number(currentTask.horas_consumidas_periodo)) {
    throw new Error('Las horas asignadas del período no pueden ser menores a las horas consumidas')
  }
}

export function normalizeTareaPayload(payload: TareaFormData): TareaFormData {
  return {
    ...payload,
    nombre: payload.nombre.trim(),
    periodo_id: Number(payload.periodo_id),
    proyecto_id: Number(payload.proyecto_id),
    solicitante_id: Number(payload.solicitante_id),
    estado_id: Number(payload.estado_id),
    team_id: payload.team_id ? Number(payload.team_id) : null,
    horas_historicas_arrastre: Number(payload.horas_historicas_arrastre || 0),
    horas_asignadas_periodo: Number(payload.horas_asignadas_periodo || 0),
    comentario_periodo: payload.comentario_periodo?.trim() || null,
    comentario_dm: payload.comentario_dm?.trim() || null,
    activo: payload.activo ?? true
  }
}

export function validateRegistroPayload(payload: RegistroFormData): void {
  if (!payload.tarea_periodo_id) {
    throw new Error('La tarea del período es obligatoria')
  }

  if (!payload.fecha) {
    throw new Error('La fecha es obligatoria')
  }

  if (!payload.trabajador_id) {
    throw new Error('El trabajador es obligatorio')
  }

  if (Number(payload.horas) <= 0) {
    throw new Error('Las horas deben ser mayores a 0')
  }

  if (Number(payload.horas) > 12) {
    throw new Error('Las horas no pueden superar 12 en un solo registro')
  }
}

export function normalizeRegistroPayload(payload: RegistroFormData): RegistroFormData {
  return {
    ...payload,
    tarea_periodo_id: Number(payload.tarea_periodo_id),
    trabajador_id: Number(payload.trabajador_id),
    horas: Number(payload.horas),
    comentario: payload.comentario?.trim() || null
  }
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function applyTareaFilters(
  items: TareaPeriodoListItem[],
  filters?: TareaFilters
): TareaPeriodoListItem[] {
  if (!filters) {
    return items
  }

  const search = filters.search ? normalizeText(filters.search) : ''

  return items.filter((item) => {
    if (filters.periodo_id && item.periodo_id !== Number(filters.periodo_id)) {
      return false
    }

    if (filters.agrupador_id && item.agrupador_id !== Number(filters.agrupador_id)) {
      return false
    }

    if (filters.proyecto_id && item.proyecto_id !== Number(filters.proyecto_id)) {
      return false
    }

    if (filters.solicitante_id && item.solicitante_id !== Number(filters.solicitante_id)) {
      return false
    }

    if (filters.estado_id && item.estado_id !== Number(filters.estado_id)) {
      return false
    }

    if (filters.team_id && item.team_id !== Number(filters.team_id)) {
      return false
    }

    if (typeof filters.activo === 'boolean' && item.activo !== filters.activo) {
      return false
    }

    if (!search) {
      return true
    }

    const searchableValues = [
      item.tarea_nombre,
      item.proyecto_nombre,
      item.agrupador_nombre,
      item.solicitante_nombre,
      item.team_nombre ?? '',
      item.estado_nombre,
      item.comentario_periodo ?? '',
      String(item.periodo_anio),
      String(item.periodo_mes),
      String(item.horas_historicas_arrastre),
      String(item.horas_asignadas_periodo),
      String(item.horas_consumidas_periodo),
      String(item.horas_disponibles_periodo),
      String(item.horas_totales_acumuladas),
      item.activo ? 'activo' : 'inactivo',
      item.periodo_cerrado ? 'cerrado' : 'abierto'
    ]

    return searchableValues.some((value) => normalizeText(value).includes(search))
  })
}
function sortRegistros(registros: RegistroDetalleItem[]): RegistroDetalleItem[] {
  return [...registros].sort((a, b) => {
    const res = a.solicitante_nombre.localeCompare(b.solicitante_nombre)
    if (res !== 0) return res
    return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  })
}
function sortTareoData(items: TareaPeriodoListItem[]): TareaPeriodoListItem[] {
  return [...items].sort((a, b) => {
    const sortSolicitante = a.solicitante_nombre.localeCompare(b.solicitante_nombre)
    if (sortSolicitante !== 0) return sortSolicitante

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

// Función auxiliar para crear las hojas de detalle
function createDetailSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  registros: RegistroDetalleItem[],
  periodoLabel: string
) {
  const sheet = workbook.addWorksheet(name)

  // Las columnas exactas de tu imagen
  sheet.columns = [
    { header: 'Task Name', key: 'nombre', width: 45 },
    { header: 'Week (drop down)', key: 'periodo', width: 25 },
    { header: 'Assignee', key: 'assignee', width: 20 },
    { header: 'Team (labels)', key: 'team', width: 20 },
    { header: 'Solicitante (drop down)', key: 'solicitante', width: 25 },
    { header: 'Pry - Protecta (drop down)', key: 'proyecto', width: 35 },
    { header: 'Agrupador', key: 'agrupador', width: 25 },
    { header: 'Horas Estimadas', key: 'horas', width: 18 },
    { header: 'Estado', key: 'estado', width: 15 },
    { header: 'Comentario PS', key: 'comentario_ps', width: 40 },
    { header: 'Comentario DM', key: 'comentario_dm', width: 40 }
  ]

  // Título
  sheet.insertRow(1, [`REPORTE DE TAREO - PERÍODO: ${periodoLabel}`])
  sheet.mergeCells('A1:K1')
  sheet.getRow(1).font = { size: 14, bold: true }
  sheet.getRow(1).alignment = { horizontal: 'center' }

  // Estilos del encabezado
  const headerRow = sheet.getRow(2)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }
    cell.alignment = { horizontal: 'center' }
  })
  function formatWeekDate(fechaStr: string): string {
    const [yyyy, mm, dd] = fechaStr.split('-')
    const meses = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ]
    const mesNombre = meses[parseInt(mm, 10) - 1]
    const shortYear = yyyy.substring(2)
    return `${mesNombre} ${yyyy} (${dd}/${mm}/${shortYear})`
  }
  // Insertar cada registro diario como una fila independiente
  registros.forEach((reg) => {
    sheet.addRow({
      nombre: reg.tarea_nombre,
      periodo: formatWeekDate(reg.fecha),
      assignee: reg.trabajador_nombre,
      team: reg.team_nombre ?? '',
      solicitante: reg.solicitante_nombre,
      proyecto: reg.proyecto_nombre,
      agrupador: reg.agrupador_nombre,
      horas: Number(reg.horas), // Las horas específicas de ese día
      estado: reg.estado_tarea,
      comentario_ps: reg.comentario ?? '', // El comentario específico que puso el trabajador ese día
      comentario_dm: '' // Columna vacía para que el cliente la llene
    })
  })
}

// Función principal de generación
export async function generateTareoExcel(
  tareasPeriodo: TareaPeriodoListItem[],
  registros: RegistroDetalleItem[],
  periodoLabel: string,
  costoHora: number,
  isFiltered: boolean = false
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  
  if (isFiltered) {
    createDetailSheet(workbook, 'Detalle Registros', registros, periodoLabel);
    createFilteredSummarySheet(workbook, tareasPeriodo, costoHora);
  } else {
    // Separación de datos para detalle y resumen
    const agilRegs = registros.filter(r => (r.agrupador_nombre || '').toLowerCase().includes('squad') || (r.agrupador_nombre || '').toLowerCase().includes('agil'));
    const proyRegs = registros.filter(r => !agilRegs.includes(r));

    const agilTareas = tareasPeriodo.filter(t => (t.agrupador_nombre || '').toLowerCase().includes('squad') || (t.agrupador_nombre || '').toLowerCase().includes('agil'));
    const proyTareas = tareasPeriodo.filter(t => !agilTareas.includes(t));

    // Hojas de detalle
    createDetailSheet(workbook, 'Agil', agilRegs, periodoLabel);
    createDetailSheet(workbook, 'Proyectos', proyRegs, periodoLabel);
    
    // Hoja de resumen con el nuevo formato
    createSummarySheet(workbook, agilTareas, proyTareas, costoHora);
  }

  return workbook;
}

function createFilteredSummarySheet(
  workbook: ExcelJS.Workbook,
  tareas: TareaPeriodoListItem[],
  costoHora: number
) {
  const sheet = workbook.addWorksheet('Resumen Filtrado');
  
  // Configuración de anchos de columna
  sheet.getColumn(1).width = 60; // Tarea
  sheet.getColumn(2).width = 15; // Horas
  sheet.getColumn(3).width = 20; // Monto S/

  // Título de la tabla
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'RESUMEN TOTAL FILTRADO';
  titleCell.font = { bold: true, size: 14 };

  // Cabecera
  const header = sheet.getRow(2);
  header.values = ['Nombre de la Tarea', 'Horas Totales', 'Monto a pagar'];
  styleRow(header, true);

  let currentRow = 3;
  let totalH = 0;

  tareas.forEach((t) => {
    const horas = Number(t.horas_consumidas_periodo || 0);
    if (horas > 0) {
      const row = sheet.addRow([t.tarea_nombre, horas, horas * costoHora]);
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '"S/ "#,##0.00';
      styleRow(row);
      totalH += horas;
      currentRow++;
    }
  });

  // Fila de Subtotal
  const subtotal = sheet.addRow(['TOTAL GENERAL', totalH, totalH * costoHora]);
  subtotal.font = { bold: true, size: 12 };
  subtotal.getCell(3).numFmt = '"S/ "#,##0.00';
  styleRow(subtotal);
}
function createSummarySheet(
  workbook: ExcelJS.Workbook,
  agilTareas: TareaPeriodoListItem[],
  proyectosTareas: TareaPeriodoListItem[],
  costoHora: number
) {
  const sheet = workbook.addWorksheet('Resumen');
  
  // Configuración de anchos de columna
  sheet.getColumn(1).width = 50; // Agrupador / Proyecto
  sheet.getColumn(2).width = 15; // Horas
  sheet.getColumn(3).width = 20; // Monto S/

  const addTable = (title: string, tareas: TareaPeriodoListItem[], groupByKey: 'proyecto_nombre' | 'agrupador_nombre', startRow: number) => {
    // Usamos las horas que el sistema ya calculó (horas_consumidas_periodo)
    const grouped = tareas.reduce((acc, t) => {
      const name = t[groupByKey] || 'Sin asignar';
      const horas = Number(t.horas_consumidas_periodo || 0);
      acc[name] = (acc[name] || 0) + horas;
      return acc;
    }, {} as Record<string, number>);

    // Título de la tabla
    const titleCell = sheet.getCell(`A${startRow}`);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };

    // Cabecera
    const header = sheet.getRow(startRow + 1);
    header.values = [groupByKey === 'proyecto_nombre' ? 'Pry - Protecta' : 'Agrupador', 'Horas', 'Monto a pagar'];
    styleRow(header, true);

    let currentRow = startRow + 2;
    let totalH = 0;

    Object.entries(grouped).forEach(([name, h]) => {
      const row = sheet.addRow([name, h, h * costoHora]);
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '"S/ "#,##0.00'; // Cambio a Soles
      styleRow(row);
      totalH += h;
      currentRow++;
    });

    // Fila de Subtotal
    const subtotal = sheet.addRow(['Sub Total', totalH, totalH * costoHora]);
    subtotal.font = { bold: true };
    subtotal.getCell(3).numFmt = '"S/ "#,##0.00';
    styleRow(subtotal);

    return { h: totalH, m: totalH * costoHora, next: currentRow + 3 };
  };

  // 1. RESUMEN AGIL (Agrupado por Proyecto)
  const resAgil = addTable('RESUMEN AGIL', agilTareas, 'proyecto_nombre', 1);

  // 2. RESUMEN PROYECTOS (Agrupado por Agrupador)
  const resProy = addTable('RESUMEN PROYECTOS', proyectosTareas, 'agrupador_nombre', resAgil.next);

  // 3. CONSOLIDADO GENERAL
  const genStart = resProy.next;
  const genTitle = sheet.getCell(`A${genStart}`);
  genTitle.value = 'CONSOLIDADO GENERAL';
  genTitle.font = { bold: true, size: 12 };

  const genHeader = sheet.getRow(genStart + 1);
  genHeader.values = ['Categoría', 'Total Horas', 'Total a Pagar'];
  styleRow(genHeader, true);

  const r1 = sheet.addRow(['Agil', resAgil.h, resAgil.m]);
  r1.getCell(3).numFmt = '"S/ "#,##0.00';
  styleRow(r1);

  const r2 = sheet.addRow(['Proyectos', resProy.h, resProy.m]);
  r2.getCell(3).numFmt = '"S/ "#,##0.00';
  styleRow(r2);

  const total = sheet.addRow(['TOTAL GENERAL', resAgil.h + resProy.h, resAgil.m + resProy.m]);
  total.font = { bold: true, size: 11 };
  total.getCell(3).numFmt = '"S/ "#,##0.00';
  styleRow(total);
}
function styleRow(row: ExcelJS.Row, isHeader: boolean = false) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };
    
    if (isHeader) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAF8' } // Gris muy claro para cabeceras
      };
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
    } else {
      cell.alignment = { horizontal: 'left', indent: 1 };
    }
  });
}