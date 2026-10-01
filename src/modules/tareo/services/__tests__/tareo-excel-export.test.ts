import { describe, it, expect } from 'vitest'
import { generateTareoExcel } from '../tareo.service'
import type { TareaPeriodoListItem, RegistroDetalleItem } from '../../interfaces/tareo.interfaces'

describe('generateTareoExcel', () => {
  const mockTareas: TareaPeriodoListItem[] = [
    {
      tarea_periodo_id: 101,
      tarea_id: 1,
      tarea_nombre: 'Desarrollo Feature Grande',
      team_id: 1,
      team_nombre: 'Core Team',
      solicitante_id: 1,
      solicitante_nombre: 'Juan Pérez',
      horas_maximas_estimadas: 100,
      proyecto_id: 1,
      proyecto_nombre: 'Plataforma SGEM',
      agrupador_id: 1,
      agrupador_nombre: 'Desarrollo',
      estado_id: 1,
      estado_nombre: 'En Progreso',
      activo: true,
      periodo_id: 10,
      periodo_anio: 2026,
      periodo_mes: 9,
      periodo_cerrado: false,
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 80, // > 50h
      horas_consumidas_periodo: 55, // > 50h
      horas_disponibles_periodo: 25,
      horas_totales_acumuladas: 55,
      comentario_periodo: 'Tarea de alta demanda',
      comentario_dm: null,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-18T00:00:00Z'
    },
    {
      tarea_periodo_id: 102,
      tarea_id: 2,
      tarea_nombre: 'Ajuste de Bug Menor',
      team_id: 1,
      team_nombre: 'Core Team',
      solicitante_id: 1,
      solicitante_nombre: 'Juan Pérez',
      horas_maximas_estimadas: 20,
      proyecto_id: 1,
      proyecto_nombre: 'Plataforma SGEM',
      agrupador_id: 1,
      agrupador_nombre: 'Desarrollo',
      estado_id: 2,
      estado_nombre: 'Completado',
      activo: true,
      periodo_id: 10,
      periodo_anio: 2026,
      periodo_mes: 9,
      periodo_cerrado: false,
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 10, // <= 50h
      horas_consumidas_periodo: 8,  // <= 50h
      horas_disponibles_periodo: 2,
      horas_totales_acumuladas: 8,
      comentario_periodo: 'Bug solucionado',
      comentario_dm: null,
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-18T00:00:00Z'
    }
  ]

  const mockRegistros: RegistroDetalleItem[] = [
    {
      id: 501,
      fecha: '2026-09-10',
      horas: 30,
      comentario: 'Avance Backend',
      created_at: '2026-09-10T10:00:00Z',
      updated_at: '2026-09-10T10:00:00Z',
      tarea_periodo_id: 101,
      tarea_id: 1,
      tarea_nombre: 'Desarrollo Feature Grande',
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 80,
      horas_consumidas_periodo: 55,
      horas_disponibles_periodo: 25,
      horas_totales_acumuladas: 55,
      estado_tarea: 'En Progreso',
      trabajador_id: 5,
      trabajador_nombre: 'Carlos Dev',
      team_id: 1,
      team_nombre: 'Core Team',
      solicitante_id: 1,
      solicitante_nombre: 'Juan Pérez',
      solicitante_horas_maximas_estimadas: 100,
      proyecto_id: 1,
      proyecto_nombre: 'Plataforma SGEM',
      agrupador_id: 1,
      agrupador_nombre: 'Desarrollo',
      periodo_id: 10,
      anio: 2026,
      mes: 9,
      cerrado: false
    },
    {
      id: 502,
      fecha: '2026-09-11',
      horas: 25,
      comentario: 'Avance Frontend',
      created_at: '2026-09-11T10:00:00Z',
      updated_at: '2026-09-11T10:00:00Z',
      tarea_periodo_id: 101,
      tarea_id: 1,
      tarea_nombre: 'Desarrollo Feature Grande',
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 80,
      horas_consumidas_periodo: 55,
      horas_disponibles_periodo: 25,
      horas_totales_acumuladas: 55,
      estado_tarea: 'En Progreso',
      trabajador_id: 6,
      trabajador_nombre: 'Ana Designer',
      team_id: 1,
      team_nombre: 'Core Team',
      solicitante_id: 1,
      solicitante_nombre: 'Juan Pérez',
      solicitante_horas_maximas_estimadas: 100,
      proyecto_id: 1,
      proyecto_nombre: 'Plataforma SGEM',
      agrupador_id: 1,
      agrupador_nombre: 'Desarrollo',
      periodo_id: 10,
      anio: 2026,
      mes: 9,
      cerrado: false
    },
    {
      id: 503,
      fecha: '2026-09-12',
      horas: 8,
      comentario: 'Fix CSS issue',
      created_at: '2026-09-12T10:00:00Z',
      updated_at: '2026-09-12T10:00:00Z',
      tarea_periodo_id: 102,
      tarea_id: 2,
      tarea_nombre: 'Ajuste de Bug Menor',
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 10,
      horas_consumidas_periodo: 8,
      horas_disponibles_periodo: 2,
      horas_totales_acumuladas: 8,
      estado_tarea: 'Completado',
      trabajador_id: 5,
      trabajador_nombre: 'Carlos Dev',
      team_id: 1,
      team_nombre: 'Core Team',
      solicitante_id: 1,
      solicitante_nombre: 'Juan Pérez',
      solicitante_horas_maximas_estimadas: 100,
      proyecto_id: 1,
      proyecto_nombre: 'Plataforma SGEM',
      agrupador_id: 1,
      agrupador_nombre: 'Desarrollo',
      periodo_id: 10,
      anio: 2026,
      mes: 9,
      cerrado: false
    }
  ]

  it('genera reporte en modo agrupado en una sola hoja por defecto', async () => {
    const workbook = await generateTareoExcel(
      mockTareas,
      mockRegistros,
      '2026-09',
      65,
      false,
      { layout: 'agrupado_unica_hoja' }
    )

    const sheetNames = workbook.worksheets.map(ws => ws.name)
    expect(sheetNames).toContain('Detalle por Tarea')
    expect(sheetNames).toContain('Resumen Filtrado')
    expect(sheetNames).toContain('Resumen por Agrupador')
    expect(sheetNames).toContain('Resumen por Equipo')
    expect(sheetNames).toContain('Resumen por Recurso')

    const detalleSheet = workbook.getWorksheet('Detalle por Tarea')
    expect(detalleSheet).toBeDefined()
    expect(detalleSheet?.rowCount).toBeGreaterThan(3)
  })

  it('filtra correctamente tareas de más de 50 horas (tareas largas)', async () => {
    const workbook = await generateTareoExcel(
      mockTareas,
      mockRegistros,
      '2026-09',
      65,
      true,
      { duracionFiltro: 'mas_50h', layout: 'agrupado_unica_hoja' }
    )

    const detalleSheet = workbook.getWorksheet('Detalle por Tarea')
    expect(detalleSheet).toBeDefined()

    // Solo debe incluir la tarea de 80h/55h (tarea_id 1), no la de 10h (tarea_id 2)
    const rowValues = detalleSheet?.getSheetValues() || []
    const stringified = JSON.stringify(rowValues)
    expect(stringified).toContain('Desarrollo Feature Grande')
    expect(stringified).not.toContain('Ajuste de Bug Menor')
  })

  it('filtra correctamente tareas de hasta 50 horas (tareas estándar)', async () => {
    const workbook = await generateTareoExcel(
      mockTareas,
      mockRegistros,
      '2026-09',
      65,
      true,
      { duracionFiltro: 'hasta_50h', layout: 'agrupado_unica_hoja' }
    )

    const detalleSheet = workbook.getWorksheet('Detalle por Tarea')
    const rowValues = detalleSheet?.getSheetValues() || []
    const stringified = JSON.stringify(rowValues)
    expect(stringified).toContain('Ajuste de Bug Menor')
    expect(stringified).not.toContain('Desarrollo Feature Grande')
  })

  it('genera hojas independientes por tarea cuando layout es hojas_por_tarea', async () => {
    const workbook = await generateTareoExcel(
      mockTareas,
      mockRegistros,
      '2026-09',
      65,
      true,
      { layout: 'hojas_por_tarea' }
    )

    const sheetNames = workbook.worksheets.map(ws => ws.name)
    expect(sheetNames.some(name => name.startsWith('T1_'))).toBe(true)
    expect(sheetNames.some(name => name.startsWith('T2_'))).toBe(true)
  })

  it('permite exportar reporte independiente de una sola tarea específica', async () => {
    const workbook = await generateTareoExcel(
      mockTareas,
      mockRegistros,
      '2026-09',
      65,
      true,
      { tareaId: 1, layout: 'agrupado_unica_hoja' }
    )

    const detalleSheet = workbook.getWorksheet('Detalle por Tarea')
    const stringified = JSON.stringify(detalleSheet?.getSheetValues())
    expect(stringified).toContain('Desarrollo Feature Grande')
    expect(stringified).not.toContain('Ajuste de Bug Menor')
  })

  it('genera formato Protecta Oficial con Resumen-2, Resumen por Agrupador y detalle con comentarios', async () => {
    const workbook = await generateTareoExcel(
      mockTareas,
      mockRegistros,
      '2026-09',
      51.5,
      false,
      { layout: 'protecta_oficial' }
    )

    const sheetNames = workbook.worksheets.map(ws => ws.name)
    expect(sheetNames).toContain('Resumen-2')
    expect(sheetNames).toContain('Resumen por Agrupador')
    expect(sheetNames).toContain('Agil')
    expect(sheetNames).toContain('Resumen por Equipo')
    expect(sheetNames).toContain('Resumen por Recurso')

    // Verificar Resumen-2
    const resumen2Sheet = workbook.getWorksheet('Resumen-2')
    expect(resumen2Sheet).toBeDefined()
    const r2Values = JSON.stringify(resumen2Sheet?.getSheetValues())
    expect(r2Values).toContain('Objetivo')
    expect(r2Values).toContain('Funcionalidad')
    expect(r2Values).toContain('TOTAL GENERAL')

    // Verificar hoja Agil
    const agilSheet = workbook.getWorksheet('Agil')
    expect(agilSheet).toBeDefined()
    expect(agilSheet?.autoFilter).toBeDefined()
    expect(agilSheet?.views?.[0]?.state).toBe('frozen')

    // Verificar columnas en la fila 1 de Agil
    const headerRowValues = agilSheet?.getRow(1).values as string[]
    expect(headerRowValues).toContain('Task Name')
    expect(headerRowValues).toContain('Week (drop down)')
    expect(headerRowValues).toContain('Assignee')
    expect(headerRowValues).toContain('Horas Estimadas')
    expect(headerRowValues).toContain('Comentario PS')
    expect(headerRowValues).toContain('Comentario DM')
  })
})

