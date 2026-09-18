import { describe, it, expect } from 'vitest'
import {
  applyFilters,
  hasActiveFilters,
  normalizeText,
  type TareoDailyFilterState
} from '../TareoDailyFilters'
import type { RegistroDetalleItem } from '../../interfaces/tareo.interfaces'

describe('Tareo Daily Filters - Filtrado por Descripción y Búsqueda', () => {
  const mockRegistros: RegistroDetalleItem[] = [
    {
      id: 1,
      fecha: '2026-09-17',
      horas: 4,
      comentario: 'Implementación de migración de base de datos PostgreSQL',
      created_at: '',
      updated_at: '',
      tarea_periodo_id: 101,
      tarea_id: 1,
      tarea_nombre: 'Migración Backend',
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 20,
      horas_consumidas_periodo: 4,
      horas_disponibles_periodo: 16,
      horas_totales_acumuladas: 4,
      estado_tarea: 'En Proceso',
      trabajador_id: 10,
      trabajador_nombre: 'Carlos Mendoza',
      team_id: 1,
      team_nombre: 'Equipo Core',
      solicitante_id: 5,
      solicitante_nombre: 'Banco Financiero',
      solicitante_horas_maximas_estimadas: null,
      proyecto_id: 20,
      proyecto_nombre: 'Portal Corporativo',
      agrupador_id: 30,
      agrupador_nombre: 'Transformación Digital',
      periodo_id: 1,
      anio: 2026,
      mes: 9,
      cerrado: false
    },
    {
      id: 2,
      fecha: '2026-09-17',
      horas: 2.5,
      comentario: 'Corrección de bugs en formulario de validación',
      created_at: '',
      updated_at: '',
      tarea_periodo_id: 102,
      tarea_id: 2,
      tarea_nombre: 'Fixes Frontend',
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 15,
      horas_consumidas_periodo: 2.5,
      horas_disponibles_periodo: 12.5,
      horas_totales_acumuladas: 2.5,
      estado_tarea: 'En Proceso',
      trabajador_id: 11,
      trabajador_nombre: 'Ana Rojas',
      team_id: 2,
      team_nombre: 'Frontend Team',
      solicitante_id: 6,
      solicitante_nombre: 'Compañía de Seguros',
      solicitante_horas_maximas_estimadas: null,
      proyecto_id: 21,
      proyecto_nombre: 'App Clientes',
      agrupador_id: 30,
      agrupador_nombre: 'Transformación Digital',
      periodo_id: 1,
      anio: 2026,
      mes: 9,
      cerrado: false
    },
    {
      id: 3,
      fecha: '2026-09-17',
      horas: 3,
      comentario: null,
      created_at: '',
      updated_at: '',
      tarea_periodo_id: 103,
      tarea_id: 3,
      tarea_nombre: 'Reunión de alineamiento y estimaciones',
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 10,
      horas_consumidas_periodo: 3,
      horas_disponibles_periodo: 7,
      horas_totales_acumuladas: 3,
      estado_tarea: 'Completada',
      trabajador_id: 10,
      trabajador_nombre: 'Carlos Mendoza',
      team_id: 1,
      team_nombre: 'Equipo Core',
      solicitante_id: 5,
      solicitante_nombre: 'Banco Financiero',
      solicitante_horas_maximas_estimadas: null,
      proyecto_id: 20,
      proyecto_nombre: 'Portal Corporativo',
      agrupador_id: 30,
      agrupador_nombre: 'Transformación Digital',
      periodo_id: 1,
      anio: 2026,
      mes: 9,
      cerrado: false
    }
  ]

  const defaultFilters: TareoDailyFilterState = {
    search: '',
    tarea: [],
    proyecto: [],
    agrupador: [],
    trabajador: [],
    solicitante: [],
    descripcion: ''
  }

  it('debe detectar filtros activos cuando solo se define descripcion', () => {
    expect(hasActiveFilters(defaultFilters)).toBe(false)
    expect(hasActiveFilters({ ...defaultFilters, descripcion: 'migracion' })).toBe(true)
  })

  it('debe filtrar registros por coincidencia exacta y parcial en la descripción/comentario', () => {
    const filters: TareoDailyFilterState = {
      ...defaultFilters,
      descripcion: 'migración'
    }

    const result = applyFilters(mockRegistros, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('debe ser insensible a mayúsculas y acentos al filtrar por descripción', () => {
    const filters: TareoDailyFilterState = {
      ...defaultFilters,
      descripcion: 'VALIDACION'
    }

    const result = applyFilters(mockRegistros, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })

  it('debe devolver todos los registros si la descripción está vacía', () => {
    const result = applyFilters(mockRegistros, defaultFilters)
    expect(result).toHaveLength(3)
  })

  it('debe combinar el filtro de descripción con otros filtros (e.g. trabajador)', () => {
    const filters: TareoDailyFilterState = {
      ...defaultFilters,
      trabajador: ['Carlos Mendoza'],
      descripcion: 'migracion'
    }

    const result = applyFilters(mockRegistros, filters)
    expect(result).toHaveLength(1)
    expect(result[0].trabajador_nombre).toBe('Carlos Mendoza')

    const noMatchFilters: TareoDailyFilterState = {
      ...defaultFilters,
      trabajador: ['Ana Rojas'],
      descripcion: 'migracion'
    }

    const noMatchResult = applyFilters(mockRegistros, noMatchFilters)
    expect(noMatchResult).toHaveLength(0)
  })

  it('debe permitir búsqueda general que coincida con el comentario/descripción', () => {
    const filters: TareoDailyFilterState = {
      ...defaultFilters,
      search: 'formulario'
    }

    const result = applyFilters(mockRegistros, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
  })

  it('debe excluir el campo de descripción cuando se pasa excludeField="descripcion"', () => {
    const filters: TareoDailyFilterState = {
      ...defaultFilters,
      descripcion: 'migracion'
    }

    const result = applyFilters(mockRegistros, filters, 'descripcion')
    expect(result).toHaveLength(3)
  })
})
