import ExcelJS from 'exceljs'
import { supabase } from '@/modules/shared/infra/supabase'
import type {
  RegistroFormData,
  TareaFilters,
  TareaFormData,
  TareaPeriodoListItem,
  RegistroDetalleItem
} from '../interfaces/tareo.interfaces'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos auxiliares para reportes multi-mes
// ─────────────────────────────────────────────────────────────────────────────
export interface PeriodoLabel {
  id: number
  anio: number
  mes: number
  label: string // ej. "2025-04"
}

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
    throw new Error('Las horas deben ser mayores a 0 (se permiten decimales, ej: 0.25, 0.50, 0.75)')
  }

  if (Number(payload.horas) > 12) {
    throw new Error('Las horas no pueden superar 12 en un solo registro (se permiten decimales, ej: 0.25, 0.50, 0.75)')
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

// Helper to fetch agrupador area mapping dynamically from database
async function getAgrupadorAreaMap(): Promise<Map<number, string>> {
  try {
    const { data } = await supabase
      .from('tareo_agrupador')
      .select('id, area:tareo_area(nombre)')
      .eq('activo', true)

    const map = new Map<number, string>()
    if (data) {
      data.forEach((item: any) => {
        const areaName = item.area?.nombre || ''
        map.set(Number(item.id), areaName)
      })
    }
    return map
  } catch {
    return new Map<number, string>()
  }
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
    // Separación de datos para detalle y resumen basada en catálogo dinámico de áreas
    const areaMap = await getAgrupadorAreaMap();
    const isAgil = (agrupadorId: number) => {
      const areaName = areaMap.get(Number(agrupadorId)) || '';
      return areaName.toLowerCase().trim() === 'agil';
    };

    const agilRegs = registros.filter(r => isAgil(r.agrupador_id));
    const proyRegs = registros.filter(r => !isAgil(r.agrupador_id));

    const agilTareas = tareasPeriodo.filter(t => isAgil(t.agrupador_id));
    const proyTareas = tareasPeriodo.filter(t => !isAgil(t.agrupador_id));

    // Hojas de detalle
    createDetailSheet(workbook, 'Agil', agilRegs, periodoLabel);
    createDetailSheet(workbook, 'Proyectos', proyRegs, periodoLabel);

    // Hoja de resumen con el nuevo formato
    createSummarySheet(workbook, agilTareas, proyTareas, costoHora);
  }

  // Hojas adicionales siempre presentes en el reporte estándar
  createAgrupadorSummarySheet(workbook, tareasPeriodo, costoHora, periodoLabel);
  createTeamSheet(workbook, registros, costoHora, periodoLabel);
  createResourceSheet(workbook, registros, costoHora, periodoLabel);

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

  const addNestedTable = (title: string, tareas: TareaPeriodoListItem[], startRow: number) => {
    // 1. Agrupar por Agrupador -> Proyecto
    type GroupedHierarchy = Record<string, {
      proyectos: Record<string, number>;
      totalH: number;
    }>;

    const grouped = tareas.reduce((acc, t) => {
      const agrupador = t.agrupador_nombre || 'Sin Agrupador';
      const proyecto = t.proyecto_nombre || 'Sin Proyecto';
      const horas = Number(t.horas_consumidas_periodo || 0);
      
      if (!acc[agrupador]) {
        acc[agrupador] = { proyectos: {}, totalH: 0 };
      }
      
      acc[agrupador].proyectos[proyecto] = (acc[agrupador].proyectos[proyecto] || 0) + horas;
      acc[agrupador].totalH += horas;
      
      return acc;
    }, {} as GroupedHierarchy);

    // Título de la tabla
    const titleCell = sheet.getCell(`A${startRow}`);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };

    // Cabecera
    const header = sheet.getRow(startRow + 1);
    header.values = ['Agrupador / Proyecto', 'Horas', 'Monto a pagar'];
    styleRow(header, true);

    let currentRow = startRow + 2;
    let totalH = 0;

    Object.entries(grouped).forEach(([agrupador, groupData]) => {
      if (groupData.totalH === 0) return;

      // Fila de Encabezado de Agrupador (Fondo celeste suave, texto azul)
      const agrupRow = sheet.addRow([`AGRUPADOR: ${agrupador}`, '', '']);
      agrupRow.getCell(1).font = { bold: true, color: { argb: 'FF1E3A8A' } }; // Azul oscuro
      agrupRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7FF' } }; // Fondo celeste
      styleRow(agrupRow);
      currentRow++;

      // Proyectos bajo este Agrupador
      Object.entries(groupData.proyectos).forEach(([proyecto, h]) => {
        if (h === 0) return;
        const row = sheet.addRow([`   ${proyecto}`, h, h * costoHora]);
        row.getCell(2).numFmt = '#,##0.00';
        row.getCell(3).numFmt = '"S/ "#,##0.00';
        styleRow(row);
        currentRow++;
      });

      // Sub Total por Agrupador
      const subRow = sheet.addRow([`   Sub Total ${agrupador}`, groupData.totalH, groupData.totalH * costoHora]);
      subRow.font = { bold: true, italic: true };
      subRow.getCell(2).numFmt = '#,##0.00';
      subRow.getCell(3).numFmt = '"S/ "#,##0.00';
      styleRow(subRow);
      currentRow++;

      totalH += groupData.totalH;
    });

    // Fila del subtotal general de este área
    const subtotal = sheet.addRow([`TOTAL ${title}`, totalH, totalH * costoHora]);
    subtotal.font = { bold: true };
    subtotal.getCell(2).numFmt = '#,##0.00';
    subtotal.getCell(3).numFmt = '"S/ "#,##0.00';
    styleRow(subtotal);
    currentRow++;

    return { h: totalH, m: totalH * costoHora, next: currentRow + 3 };
  };

  // 1. RESUMEN AGIL (Agrupado por Agrupador -> Proyecto)
  const resAgil = addNestedTable('RESUMEN AGIL', agilTareas, 1);

  // 2. RESUMEN PROYECTOS (Agrupado por Agrupador -> Proyecto)
  const resProy = addNestedTable('RESUMEN PROYECTOS', proyectosTareas, resAgil.next);

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

function createAgrupadorSummarySheet(
  workbook: ExcelJS.Workbook,
  tareasPeriodo: TareaPeriodoListItem[],
  costoHora: number,
  periodoLabel: string
) {
  const sheet = workbook.addWorksheet('Resumen por Agrupador');
  sheet.getColumn(1).width = 40; // Agrupador
  sheet.getColumn(2).width = 15; // Horas
  sheet.getColumn(3).width = 20; // Monto S/

  // Título
  const title = sheet.getCell('A1');
  title.value = `RESUMEN DE HORAS POR AGRUPADOR — PERÍODO ${periodoLabel}`;
  title.font = { bold: true, size: 13 };
  sheet.mergeCells('A1:C1');
  sheet.getRow(1).alignment = { horizontal: 'center' };

  // Cabecera
  const header = sheet.getRow(2);
  header.values = ['Agrupador', 'Horas Totales', 'Monto a pagar (S/.)'];
  styleRow(header, true);

  // Agrupar por Agrupador
  const grouped = tareasPeriodo.reduce((acc, t) => {
    const name = t.agrupador_nombre || 'Sin Agrupador';
    const horas = Number(t.horas_consumidas_periodo || 0);
    acc[name] = (acc[name] || 0) + horas;
    return acc;
  }, {} as Record<string, number>);

  let grandTotal = 0;

  // Insertar agrupadores ordenados por horas consumidas descendentemente
  Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, h]) => {
      if (h === 0) return;
      const row = sheet.addRow([name, h, h * costoHora]);
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '"S/ "#,##0.00';
      styleRow(row);
      grandTotal += h;
    });

  // Fila de Total General
  const totalRow = sheet.addRow(['TOTAL GENERAL', grandTotal, grandTotal * costoHora]);
  totalRow.font = { bold: true, size: 12 };
  totalRow.getCell(2).numFmt = '#,##0.00';
  totalRow.getCell(3).numFmt = '"S/ "#,##0.00';
  styleRow(totalRow);
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

// ─────────────────────────────────────────────────────────────────────────────
// HOJA: RESUMEN POR EQUIPO
// ─────────────────────────────────────────────────────────────────────────────
function createTeamSheet(
  workbook: ExcelJS.Workbook,
  registros: RegistroDetalleItem[],
  costoHora: number,
  periodoLabel: string
) {
  const sheet = workbook.addWorksheet('Resumen por Equipo');
  sheet.getColumn(1).width = 30; // Equipo
  sheet.getColumn(2).width = 50; // Recurso
  sheet.getColumn(3).width = 15; // Horas
  sheet.getColumn(4).width = 20; // Monto

  // Título
  const title = sheet.getCell('A1');
  title.value = `REPORTE POR EQUIPO — PERÍODO ${periodoLabel}`;
  title.font = { bold: true, size: 13 };
  sheet.mergeCells('A1:D1');
  sheet.getRow(1).alignment = { horizontal: 'center' };

  // Encabezado
  const header = sheet.getRow(2);
  header.values = ['Equipo', 'Recurso (Trabajador)', 'Horas', 'Monto (S/.)'];
  styleRow(header, true);

  // Agrupar por equipo → trabajador
  type EquipoData = { recursos: Record<string, number>; total: number };
  const byTeam: Record<string, EquipoData> = {};

  for (const r of registros) {
    const team = r.team_nombre || 'Sin Equipo';
    const recurso = r.trabajador_nombre;
    if (!byTeam[team]) byTeam[team] = { recursos: {}, total: 0 };
    byTeam[team].recursos[recurso] = (byTeam[team].recursos[recurso] || 0) + Number(r.horas);
    byTeam[team].total += Number(r.horas);
  }

  let grandTotal = 0;

  for (const [team, data] of Object.entries(byTeam).sort()) {
    // Fila de nombre de equipo (sin recurso)
    const teamRow = sheet.addRow([team, '', '', '']);
    teamRow.getCell(1).font = { bold: true, color: { argb: 'FF1d4ed8' } };
    teamRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdbeafe' } };

    for (const [recurso, horas] of Object.entries(data.recursos).sort()) {
      const row = sheet.addRow(['', recurso, horas, horas * costoHora]);
      row.getCell(3).numFmt = '#,##0.00';
      row.getCell(4).numFmt = '"S/ "#,##0.00';
      styleRow(row);
    }

    // Sub-total de equipo
    const subRow = sheet.addRow([`SUBTOTAL ${team}`, '', data.total, data.total * costoHora]);
    subRow.font = { bold: true };
    subRow.getCell(3).numFmt = '#,##0.00';
    subRow.getCell(4).numFmt = '"S/ "#,##0.00';
    styleRow(subRow);
    grandTotal += data.total;
  }

  // Total general
  const totalRow = sheet.addRow(['TOTAL GENERAL', '', grandTotal, grandTotal * costoHora]);
  totalRow.font = { bold: true, size: 12 };
  totalRow.getCell(3).numFmt = '#,##0.00';
  totalRow.getCell(4).numFmt = '"S/ "#,##0.00';
  styleRow(totalRow);
}

// ─────────────────────────────────────────────────────────────────────────────
// HOJA: RESUMEN POR RECURSO (TRABAJADOR)
// ─────────────────────────────────────────────────────────────────────────────
function createResourceSheet(
  workbook: ExcelJS.Workbook,
  registros: RegistroDetalleItem[],
  costoHora: number,
  periodoLabel: string
) {
  const sheet = workbook.addWorksheet('Resumen por Recurso');
  sheet.getColumn(1).width = 30; // Recurso
  sheet.getColumn(2).width = 50; // Tarea
  sheet.getColumn(3).width = 25; // Proyecto
  sheet.getColumn(4).width = 15; // Horas
  sheet.getColumn(5).width = 20; // Monto

  // Título
  const title = sheet.getCell('A1');
  title.value = `REPORTE POR RECURSO — PERÍODO ${periodoLabel}`;
  title.font = { bold: true, size: 13 };
  sheet.mergeCells('A1:E1');
  sheet.getRow(1).alignment = { horizontal: 'center' };

  const header = sheet.getRow(2);
  header.values = ['Recurso (Trabajador)', 'Tarea', 'Proyecto', 'Horas', 'Monto (S/.)'];
  styleRow(header, true);

  type RecursoData = { tareas: Array<{ nombre: string; proyecto: string; horas: number }>; total: number };
  const byRecurso: Record<string, RecursoData> = {};

  for (const r of registros) {
    const recurso = r.trabajador_nombre;
    if (!byRecurso[recurso]) byRecurso[recurso] = { tareas: [], total: 0 };
    const existing = byRecurso[recurso].tareas.find(t => t.nombre === r.tarea_nombre && t.proyecto === r.proyecto_nombre);
    if (existing) {
      existing.horas += Number(r.horas);
    } else {
      byRecurso[recurso].tareas.push({ nombre: r.tarea_nombre, proyecto: r.proyecto_nombre, horas: Number(r.horas) });
    }
    byRecurso[recurso].total += Number(r.horas);
  }

  let grandTotal = 0;

  for (const [recurso, data] of Object.entries(byRecurso).sort()) {
    const recursoRow = sheet.addRow([recurso, '', '', '', '']);
    recursoRow.getCell(1).font = { bold: true, color: { argb: 'FF065f46' } };
    recursoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFd1fae5' } };

    for (const tarea of data.tareas.sort((a, b) => b.horas - a.horas)) {
      const row = sheet.addRow(['', tarea.nombre, tarea.proyecto, tarea.horas, tarea.horas * costoHora]);
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(5).numFmt = '"S/ "#,##0.00';
      styleRow(row);
    }

    const subRow = sheet.addRow([`SUBTOTAL ${recurso}`, '', '', data.total, data.total * costoHora]);
    subRow.font = { bold: true };
    subRow.getCell(4).numFmt = '#,##0.00';
    subRow.getCell(5).numFmt = '"S/ "#,##0.00';
    styleRow(subRow);
    grandTotal += data.total;
  }

  const totalRow = sheet.addRow(['TOTAL GENERAL', '', '', grandTotal, grandTotal * costoHora]);
  totalRow.font = { bold: true, size: 12 };
  totalRow.getCell(4).numFmt = '#,##0.00';
  totalRow.getCell(5).numFmt = '"S/ "#,##0.00';
  styleRow(totalRow);
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERADOR DE EXCEL CON HOJAS ADICIONALES (EQUIPO + RECURSO)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateTareoExcelConEquipoRecurso(
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
    const areaMap = await getAgrupadorAreaMap();
    const isAgil = (agrupadorId: number) => {
      const areaName = areaMap.get(Number(agrupadorId)) || '';
      return areaName.toLowerCase().trim() === 'agil';
    };

    const agilRegs = registros.filter(r => isAgil(r.agrupador_id));
    const proyRegs = registros.filter(r => !agilRegs.includes(r));
    const agilTareas = tareasPeriodo.filter(t => isAgil(t.agrupador_id));
    const proyTareas = tareasPeriodo.filter(t => !isAgil(t.agrupador_id));

    createDetailSheet(workbook, 'Agil', agilRegs, periodoLabel);
    createDetailSheet(workbook, 'Proyectos', proyRegs, periodoLabel);
    createSummarySheet(workbook, agilTareas, proyTareas, costoHora);
  }

  // Hojas adicionales siempre presentes
  createAgrupadorSummarySheet(workbook, tareasPeriodo, costoHora, periodoLabel);
  createTeamSheet(workbook, registros, costoHora, periodoLabel);
  createResourceSheet(workbook, registros, costoHora, periodoLabel);

  return workbook;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE MULTI-MES: TOTALES + TENDENCIA
// ─────────────────────────────────────────────────────────────────────────────
// Helper to fetch chart from QuickChart.io and return it as base64 string
async function fetchChartImageBase64(config: any): Promise<string> {
  const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=800&h=400`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('QuickChart response not ok:', res.statusText);
      return '';
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (err) {
    console.error('Error fetching from QuickChart:', err);
    return '';
  }
}

// Curated beautiful colors for lines
const CHART_LINE_COLORS = [
  'rgb(37, 99, 235)',   // Blue
  'rgb(16, 185, 129)',  // Green
  'rgb(245, 158, 11)',  // Amber
  'rgb(139, 92, 246)',  // Purple
  'rgb(236, 72, 153)',  // Pink
  'rgb(20, 184, 166)',  // Teal
  'rgb(249, 115, 22)',  // Orange
  'rgb(107, 114, 128)'  // Gray
];

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE MULTI-MES: TOTALES + TENDENCIA
// ─────────────────────────────────────────────────────────────────────────────
export async function generateTareoMultiMesExcel(
  registrosPorPeriodo: Array<{ periodoId: number; label: string; anio: number; mes: number; registros: RegistroDetalleItem[] }>,
  costoHora: number
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  // Ordenar períodos cronológicamente
  const periodos = [...registrosPorPeriodo].sort((a, b) => {
    if (a.anio !== b.anio) return a.anio - b.anio;
    return a.mes - b.mes;
  });

  const periodLabels = periodos.map(p => `${MESES[p.mes - 1]} ${p.anio}`);

  // ── 1. HOJA: Totales por Mes (General) ──────────────────────────────────────
  const sheetTotal = workbook.addWorksheet('Totales por Mes');
  sheetTotal.getColumn(1).width = 20;
  periodos.forEach((_, i) => { sheetTotal.getColumn(i + 2).width = 15; });
  sheetTotal.getColumn(periodos.length + 2).width = 15;
  sheetTotal.getColumn(periodos.length + 3).width = 20;

  const totalTitle = sheetTotal.getCell('A1');
  totalTitle.value = 'TOTALES DE HORAS POR MES — GENERAL';
  totalTitle.font = { bold: true, size: 13 };
  sheetTotal.mergeCells(`A1:${String.fromCharCode(65 + periodos.length + 2)}1`);
  sheetTotal.getRow(1).alignment = { horizontal: 'center' };

  const totalHeader = sheetTotal.getRow(2);
  totalHeader.values = ['', ...periodLabels, 'TOTAL ACUM.', 'MONTO TOTAL (S/.)'];
  styleRow(totalHeader, true);

  // Fila de totales generales por mes
  const horasPorMes = periodos.map(p => p.registros.reduce((s, r) => s + Number(r.horas), 0));
  const totalAcum = horasPorMes.reduce((a, b) => a + b, 0);
  const horasRow = sheetTotal.addRow(['HORAS TOTALES', ...horasPorMes, totalAcum, totalAcum * costoHora]);
  horasRow.font = { bold: true };
  horasRow.getCell(periodos.length + 2).numFmt = '#,##0.00';
  horasRow.getCell(periodos.length + 3).numFmt = '"S/ "#,##0.00';
  styleRow(horasRow);

  // Separador
  sheetTotal.addRow([]);

  // ── 2. HOJA: Totales por Equipo × Mes ───────────────────────────────────────
  const sheetTeam = workbook.addWorksheet('Por Equipo × Mes');
  sheetTeam.getColumn(1).width = 30;
  periodos.forEach((_, i) => { sheetTeam.getColumn(i + 2).width = 14; });
  sheetTeam.getColumn(periodos.length + 2).width = 15;
  sheetTeam.getColumn(periodos.length + 3).width = 20;

  const teamTitle = sheetTeam.getCell('A1');
  teamTitle.value = 'HORAS POR EQUIPO × MES';
  teamTitle.font = { bold: true, size: 13 };
  sheetTeam.mergeCells(`A1:${String.fromCharCode(65 + periodos.length + 2)}1`);
  sheetTeam.getRow(1).alignment = { horizontal: 'center' };

  const teamHeader = sheetTeam.getRow(2);
  teamHeader.values = ['Equipo', ...periodLabels, 'TOTAL', 'MONTO (S/.)'];
  styleRow(teamHeader, true);

  // Recolectar todos los equipos
  const allTeams = new Set<string>();
  periodos.forEach(p => p.registros.forEach(r => allTeams.add(r.team_nombre || 'Sin Equipo')));
  const sortedTeams = Array.from(allTeams).sort();

  let teamGrandTotal = 0;
  const teamGrandByPeriod: number[] = periodos.map(() => 0);

  for (const team of sortedTeams) {
    const horasPorPeriodo = periodos.map(p =>
      p.registros.filter(r => (r.team_nombre || 'Sin Equipo') === team).reduce((s, r) => s + Number(r.horas), 0)
    );
    const teamTotal = horasPorPeriodo.reduce((a, b) => a + b, 0);
    horasPorPeriodo.forEach((h, i) => { teamGrandByPeriod[i] += h; });
    teamGrandTotal += teamTotal;

    const row = sheetTeam.addRow([team, ...horasPorPeriodo, teamTotal, teamTotal * costoHora]);
    horasPorPeriodo.forEach((_, i) => { row.getCell(i + 2).numFmt = '#,##0.00'; });
    row.getCell(periodos.length + 2).numFmt = '#,##0.00';
    row.getCell(periodos.length + 3).numFmt = '"S/ "#,##0.00';
    styleRow(row);
  }

  const teamTotalRow = sheetTeam.addRow(['TOTAL GENERAL', ...teamGrandByPeriod, teamGrandTotal, teamGrandTotal * costoHora]);
  teamTotalRow.font = { bold: true, size: 11 };
  teamGrandByPeriod.forEach((_, i) => { teamTotalRow.getCell(i + 2).numFmt = '#,##0.00'; });
  teamTotalRow.getCell(periodos.length + 2).numFmt = '#,##0.00';
  teamTotalRow.getCell(periodos.length + 3).numFmt = '"S/ "#,##0.00';
  styleRow(teamTotalRow);

  // ── 3. HOJA: Totales por Persona × Mes ──────────────────────────────────────
  const sheetPerson = workbook.addWorksheet('Por Persona × Mes');
  sheetPerson.getColumn(1).width = 30;
  periodos.forEach((_, i) => { sheetPerson.getColumn(i + 2).width = 14; });
  sheetPerson.getColumn(periodos.length + 2).width = 15;
  sheetPerson.getColumn(periodos.length + 3).width = 20;

  const personTitle = sheetPerson.getCell('A1');
  personTitle.value = 'HORAS POR PERSONA × MES';
  personTitle.font = { bold: true, size: 13 };
  sheetPerson.mergeCells(`A1:${String.fromCharCode(65 + periodos.length + 2)}1`);
  sheetPerson.getRow(1).alignment = { horizontal: 'center' };

  const personHeader = sheetPerson.getRow(2);
  personHeader.values = ['Persona (Trabajador)', ...periodLabels, 'TOTAL', 'MONTO (S/.)'];
  styleRow(personHeader, true);

  const allPersonas = new Set<string>();
  periodos.forEach(p => p.registros.forEach(r => allPersonas.add(r.trabajador_nombre)));
  const sortedPersonas = Array.from(allPersonas).sort();

  let personGrandTotal = 0;
  const personGrandByPeriod: number[] = periodos.map(() => 0);

  for (const persona of sortedPersonas) {
    const horasPorPeriodo = periodos.map(p =>
      p.registros.filter(r => r.trabajador_nombre === persona).reduce((s, r) => s + Number(r.horas), 0)
    );
    const personTotal = horasPorPeriodo.reduce((a, b) => a + b, 0);
    horasPorPeriodo.forEach((h, i) => { personGrandByPeriod[i] += h; });
    personGrandTotal += personTotal;

    const row = sheetPerson.addRow([persona, ...horasPorPeriodo, personTotal, personTotal * costoHora]);
    horasPorPeriodo.forEach((_, i) => { row.getCell(i + 2).numFmt = '#,##0.00'; });
    row.getCell(periodos.length + 2).numFmt = '#,##0.00';
    row.getCell(periodos.length + 3).numFmt = '"S/ "#,##0.00';
    styleRow(row);
  }

  const personTotalRow = sheetPerson.addRow(['TOTAL GENERAL', ...personGrandByPeriod, personGrandTotal, personGrandTotal * costoHora]);
  personTotalRow.font = { bold: true, size: 11 };
  personGrandByPeriod.forEach((_, i) => { personTotalRow.getCell(i + 2).numFmt = '#,##0.00'; });
  personTotalRow.getCell(periodos.length + 2).numFmt = '#,##0.00';
  personTotalRow.getCell(periodos.length + 3).numFmt = '"S/ "#,##0.00';
  styleRow(personTotalRow);

  // ── 4. HOJA: Datos de Tendencia ──────────────────────────────────────────────
  const sheetTrend = workbook.addWorksheet('Tendencia');
  sheetTrend.getColumn(1).width = 20;
  sheetTrend.getColumn(2).width = 15;
  sheetTrend.getColumn(3).width = 20;

  const trendTitle = sheetTrend.getCell('A1');
  trendTitle.value = 'LÍNEA DE TENDENCIA — HORAS TOTALES POR MES';
  trendTitle.font = { bold: true, size: 13 };
  sheetTrend.mergeCells('A1:C1');
  sheetTrend.getRow(1).alignment = { horizontal: 'center' };

  const trendHeader = sheetTrend.getRow(2);
  trendHeader.values = ['Mes / Período', 'Horas Totales', 'Monto (S/.)'];
  styleRow(trendHeader, true);

  // Datos fuente para el gráfico de tendencia
  periodos.forEach(p => {
    const horasTotales = p.registros.reduce((s, r) => s + Number(r.horas), 0);
    const row = sheetTrend.addRow([`${MESES[p.mes - 1]} ${p.anio}`, horasTotales, horasTotales * costoHora]);
    row.getCell(2).numFmt = '#,##0.00';
    row.getCell(3).numFmt = '"S/ "#,##0.00';
    styleRow(row);
  });

  // ── 5. GENERACIÓN Y ACOPLAMIENTO DE GRÁFICOS DINÁMICOS ──────────────────────
  // Generar gráficos en paralelo
  const barChartConfig = {
    type: 'bar',
    data: {
      labels: periodLabels,
      datasets: [{
        label: 'Horas Totales',
        data: horasPorMes,
        backgroundColor: 'rgba(37, 99, 235, 0.75)',
        borderColor: 'rgb(37, 99, 235)',
        borderWidth: 1.5
      }]
    },
    options: {
      title: { display: true, text: 'Horas Totales por Mes', fontSize: 16, fontColor: '#1f2937' },
      legend: { display: false },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true, fontColor: '#4b5563' } }],
        xAxes: [{ ticks: { fontColor: '#4b5563' } }]
      }
    }
  };

  const lineGeneralConfig = {
    type: 'line',
    data: {
      labels: periodLabels,
      datasets: [{
        label: 'Horas Totales',
        data: horasPorMes,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(239, 68, 68)'
      }]
    },
    options: {
      title: { display: true, text: 'Tendencia General de Horas por Mes', fontSize: 16, fontColor: '#1f2937' },
      legend: { display: false },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true, fontColor: '#4b5563' } }],
        xAxes: [{ ticks: { fontColor: '#4b5563' } }]
      }
    }
  };

  const teamDatasets = sortedTeams.map((team, idx) => {
    const data = periodos.map(p =>
      p.registros.filter(r => (r.team_nombre || 'Sin Equipo') === team).reduce((s, r) => s + Number(r.horas), 0)
    );
    return {
      label: team,
      data: data,
      borderColor: CHART_LINE_COLORS[idx % CHART_LINE_COLORS.length],
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      fill: false,
      tension: 0.4,
      pointRadius: 4
    };
  });

  const teamChartConfig = {
    type: 'line',
    data: {
      labels: periodLabels,
      datasets: teamDatasets
    },
    options: {
      title: { display: true, text: 'Tendencia de Horas por Equipo', fontSize: 16, fontColor: '#1f2937' },
      legend: { position: 'bottom', labels: { fontSize: 11, boxWidth: 12 } },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true, fontColor: '#4b5563' } }],
        xAxes: [{ ticks: { fontColor: '#4b5563' } }]
      }
    }
  };

  const personDatasets = sortedPersonas.map((persona, idx) => {
    const data = periodos.map(p =>
      p.registros.filter(r => r.trabajador_nombre === persona).reduce((s, r) => s + Number(r.horas), 0)
    );
    return {
      label: persona,
      data: data,
      borderColor: CHART_LINE_COLORS[idx % CHART_LINE_COLORS.length],
      backgroundColor: 'transparent',
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointRadius: 3
    };
  });

  const personChartConfig = {
    type: 'line',
    data: {
      labels: periodLabels,
      datasets: personDatasets
    },
    options: {
      title: { display: true, text: 'Tendencia de Horas por Persona', fontSize: 16, fontColor: '#1f2937' },
      legend: {
        display: personDatasets.length <= 15, // don't show if legend is too busy
        position: 'bottom',
        labels: { fontSize: 10, boxWidth: 8 }
      },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true, fontColor: '#4b5563' } }],
        xAxes: [{ ticks: { fontColor: '#4b5563' } }]
      }
    }
  };

  try {
    const [barBase64, lineGenBase64, teamBase64, personBase64] = await Promise.all([
      fetchChartImageBase64(barChartConfig),
      fetchChartImageBase64(lineGeneralConfig),
      fetchChartImageBase64(teamChartConfig),
      fetchChartImageBase64(personChartConfig)
    ]);

    // Insertar en Hoja de Totales
    if (barBase64) {
      const imgId = workbook.addImage({ base64: barBase64, extension: 'png' });
      sheetTotal.addImage(imgId, 'B5:K20');
    }
    if (lineGenBase64) {
      const imgId = workbook.addImage({ base64: lineGenBase64, extension: 'png' });
      sheetTotal.addImage(imgId, 'B22:K37');
    }

    // Insertar en Hoja de Equipos (debajo de la tabla)
    if (teamBase64) {
      const imgId = workbook.addImage({ base64: teamBase64, extension: 'png' });
      const lastRow = 3 + sortedTeams.length + 1;
      sheetTeam.addImage(imgId, `B${lastRow + 3}:K${lastRow + 18}`);
    }

    // Insertar en Hoja de Personas (debajo de la tabla)
    if (personBase64) {
      const imgId = workbook.addImage({ base64: personBase64, extension: 'png' });
      const lastRow = 3 + sortedPersonas.length + 1;
      sheetPerson.addImage(imgId, `B${lastRow + 3}:K${lastRow + 18}`);
    }
  } catch (err) {
    console.error('Error inserting charts into Excel sheets:', err);
  }

  return workbook;
}