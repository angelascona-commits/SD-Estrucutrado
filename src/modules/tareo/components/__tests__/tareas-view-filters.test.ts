import { describe, it, expect } from 'vitest'
import { normalizeText } from '../TareoDailyFilters'
import type { TareaPeriodoListItem } from '../../interfaces/tareo.interfaces'

describe('TareasView - Filtrado y Búsqueda en Catálogo de Tareas', () => {
  const mockTasks: TareaPeriodoListItem[] = [
    {
      tarea_periodo_id: 1,
      tarea_id: 101,
      tarea_nombre: 'Desarrollo API REST Core',
      team_id: 1,
      team_nombre: 'Backend Squad',
      solicitante_id: 10,
      solicitante_nombre: 'Finanzas Corporativas',
      horas_maximas_estimadas: null,
      proyecto_id: 20,
      proyecto_nombre: 'Sistema de Pagos',
      agrupador_id: 30,
      agrupador_nombre: 'Core Banking',
      estado_id: 1,
      estado_nombre: 'En Proceso',
      activo: true,
      periodo_id: 1,
      periodo_anio: 2026,
      periodo_mes: 9,
      periodo_cerrado: false,
      horas_historicas_arrastre: 5,
      horas_asignadas_periodo: 30,
      horas_consumidas_periodo: 10,
      horas_disponibles_periodo: 25,
      horas_totales_acumuladas: 15,
      comentario_periodo: 'Prioridad alta para el cierre trimestral',
      comentario_dm: 'Revisión técnica aprobada',
      created_at: '',
      updated_at: ''
    },
    {
      tarea_periodo_id: 2,
      tarea_id: 102,
      tarea_nombre: 'Rediseño de interfaz de usuario',
      team_id: 2,
      team_nombre: 'UX Team',
      solicitante_id: 11,
      solicitante_nombre: 'Operaciones',
      horas_maximas_estimadas: null,
      proyecto_id: 21,
      proyecto_nombre: 'Portal Web',
      agrupador_id: 31,
      agrupador_nombre: 'Canales Digitales',
      estado_id: 2,
      estado_nombre: 'Pendiente',
      activo: false,
      periodo_id: 1,
      periodo_anio: 2026,
      periodo_mes: 9,
      periodo_cerrado: false,
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 20,
      horas_consumidas_periodo: 20,
      horas_disponibles_periodo: 0,
      horas_totales_acumuladas: 20,
      comentario_periodo: 'En espera de feedback de diseño',
      comentario_dm: null,
      created_at: '',
      updated_at: ''
    },
    {
      tarea_periodo_id: 3,
      tarea_id: 103,
      tarea_nombre: 'Configuración inicial de servidores',
      team_id: 1,
      team_nombre: 'DevOps',
      solicitante_id: 10,
      solicitante_nombre: 'Infraestructura',
      horas_maximas_estimadas: null,
      proyecto_id: 22,
      proyecto_nombre: 'Cloud Migration',
      agrupador_id: 32,
      agrupador_nombre: 'DevOps Squad',
      estado_id: 1,
      estado_nombre: 'En Proceso',
      activo: true,
      periodo_id: 1,
      periodo_anio: 2026,
      periodo_mes: 9,
      periodo_cerrado: false,
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 60,
      horas_consumidas_periodo: 0,
      horas_disponibles_periodo: 60,
      horas_totales_acumuladas: 0,
      comentario_periodo: null,
      comentario_dm: null,
      created_at: '',
      updated_at: ''
    }
  ]

  function filterTasks(
    tasks: TareaPeriodoListItem[],
    showArchived: boolean,
    horasTomadasFilter: string,
    horasDisponiblesFilter: string,
    searchQuery: string
  ) {
    return tasks.filter(t => {
      if (showArchived ? t.activo : !t.activo) return false

      if (horasTomadasFilter && horasTomadasFilter !== 'Todas') {
        const tomadas = Number(t.horas_consumidas_periodo || 0)
        if (horasTomadasFilter === '0' && tomadas !== 0) return false
        if (horasTomadasFilter === 'mayor0' && tomadas <= 0) return false
        if (horasTomadasFilter === '0-10' && (tomadas <= 0 || tomadas > 10)) return false
        if (horasTomadasFilter === '10-25' && (tomadas <= 10 || tomadas > 25)) return false
        if (horasTomadasFilter === '25-50' && (tomadas <= 25 || tomadas > 50)) return false
        if (horasTomadasFilter === 'mas50' && tomadas <= 50) return false
      }

      if (horasDisponiblesFilter && horasDisponiblesFilter !== 'Todas') {
        const disponibles = Number(t.horas_disponibles_periodo || 0)
        if (horasDisponiblesFilter === 'ConHoras' && disponibles <= 0) return false
        if (horasDisponiblesFilter === 'SinHoras' && disponibles > 0) return false
        if (horasDisponiblesFilter === '0-10' && (disponibles <= 0 || disponibles > 10)) return false
        if (horasDisponiblesFilter === '10-25' && (disponibles <= 10 || disponibles > 25)) return false
        if (horasDisponiblesFilter === '25-50' && (disponibles <= 25 || disponibles > 50)) return false
        if (horasDisponiblesFilter === 'mas50' && disponibles <= 50) return false
      }

      if (searchQuery.trim()) {
        const q = normalizeText(searchQuery)
        const values = [
          t.tarea_nombre ?? '',
          t.proyecto_nombre ?? '',
          t.agrupador_nombre ?? '',
          t.solicitante_nombre ?? '',
          t.team_nombre ?? '',
          t.estado_nombre ?? '',
          t.comentario_periodo ?? '',
          t.comentario_dm ?? '',
          String(t.horas_asignadas_periodo ?? ''),
          String(t.horas_consumidas_periodo ?? ''),
          String(t.horas_disponibles_periodo ?? ''),
          String(t.horas_totales_acumuladas ?? '')
        ]
        if (!values.some(val => normalizeText(val).includes(q))) {
          return false
        }
      }

      return true
    })
  }

  it('debe filtrar tareas activas por coincidencia en el nombre', () => {
    const res = filterTasks(mockTasks, false, 'Todas', 'Todas', 'API REST')
    expect(res).toHaveLength(1)
    expect(res[0].tarea_nombre).toBe('Desarrollo API REST Core')
  })

  it('debe filtrar por intervalo de horas tomadas: sin consumo (0 h)', () => {
    const resSinConsumo = filterTasks(mockTasks, false, '0', 'Todas', '')
    expect(resSinConsumo).toHaveLength(1)
    expect(resSinConsumo[0].tarea_id).toBe(103)
  })

  it('debe filtrar por intervalo de horas tomadas: con consumo (> 0 h) e intervalos numéricos', () => {
    const resConConsumo = filterTasks(mockTasks, false, 'mayor0', 'Todas', '')
    expect(resConConsumo).toHaveLength(1)
    expect(resConConsumo[0].tarea_id).toBe(101)

    const resIntervalo0a10 = filterTasks(mockTasks, false, '0-10', 'Todas', '')
    expect(resIntervalo0a10).toHaveLength(1)
    expect(resIntervalo0a10[0].tarea_id).toBe(101)
  })

  it('debe filtrar por intervalo de horas disponibles: más de 50 h', () => {
    const resMas50 = filterTasks(mockTasks, false, 'Todas', 'mas50', '')
    expect(resMas50).toHaveLength(1)
    expect(resMas50[0].tarea_id).toBe(103)
    expect(resMas50[0].horas_disponibles_periodo).toBe(60)

    const res10a25 = filterTasks(mockTasks, false, 'Todas', '10-25', '')
    expect(res10a25).toHaveLength(1)
    expect(res10a25[0].tarea_id).toBe(101)
  })

  it('debe filtrar tareas inactivas/archivadas combinando búsqueda y horas disponibles agotadas', () => {
    const resArchivadaAgotada = filterTasks(mockTasks, true, 'Todas', 'SinHoras', 'interfaz')
    expect(resArchivadaAgotada).toHaveLength(1)
    expect(resArchivadaAgotada[0].tarea_id).toBe(102)
  })
})
