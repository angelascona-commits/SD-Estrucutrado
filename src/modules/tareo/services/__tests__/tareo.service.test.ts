import { describe, it, expect } from 'vitest'
import {
  validateTareaPayload,
  validateTareaUpdatePayload,
  normalizeTareaPayload,
  validateRegistroPayload,
  applyTareaFilters
} from '../tareo.service'
import type { TareaFormData, TareaPeriodoListItem, RegistroFormData } from '../../interfaces/tareo.interfaces'

describe('Tareo Service - Validaciones y Normalización', () => {
  const validTaskPayload: TareaFormData = {
    nombre: ' Tarea de Prueba ',
    periodo_id: 1,
    proyecto_id: 2,
    team_id: null,
    solicitante_id: 3,
    estado_id: 4,
    horas_historicas_arrastre: 10,
    horas_asignadas_periodo: 20,
    comentario_periodo: null,
    comentario_dm: null,
    activo: true,
  }

  it('debe validar que periodo_id sea obligatorio', () => {
    expect(() => validateTareaPayload({ ...validTaskPayload, periodo_id: 0 })).toThrow('El período es obligatorio')
  })

  it('debe validar que el nombre de la tarea no esté vacío', () => {
    expect(() => validateTareaPayload({ ...validTaskPayload, nombre: '   ' })).toThrow('El nombre de la tarea es obligatorio')
  })

  it('debe validar que las horas históricas no sean negativas', () => {
    expect(() => validateTareaPayload({ ...validTaskPayload, horas_historicas_arrastre: -5 })).toThrow('Las horas históricas no pueden ser menores a 0')
  })

  it('debe normalizar el payload recortando espacios y convirtiendo tipos a números', () => {
    const normalized = normalizeTareaPayload(validTaskPayload)
    expect(normalized.nombre).toBe('Tarea de Prueba')
    expect(normalized.periodo_id).toBe(1)
    expect(normalized.horas_historicas_arrastre).toBe(10)
  })

  it('debe impedir actualizar tareas si las horas asignadas son menores a las ya consumidas', () => {
    const currentTask: TareaPeriodoListItem = {
      tarea_periodo_id: 100,
      tarea_id: 1,
      tarea_nombre: 'Tarea Actual',
      team_id: null,
      team_nombre: null,
      solicitante_id: 3,
      solicitante_nombre: 'Cliente X',
      horas_maximas_estimadas: null,
      proyecto_id: 2,
      proyecto_nombre: 'Proyecto 1',
      agrupador_id: 1,
      agrupador_nombre: 'Agrupador 1',
      estado_id: 4,
      estado_nombre: 'En Proceso',
      activo: true,
      periodo_id: 1,
      periodo_anio: 2026,
      periodo_mes: 7,
      periodo_cerrado: false,
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 20,
      horas_consumidas_periodo: 15,
      horas_disponibles_periodo: 5,
      horas_totales_acumuladas: 15,
      comentario_periodo: null,
      comentario_dm: null,
      created_at: '',
      updated_at: '',
    }

    expect(() =>
      validateTareaUpdatePayload(
        { ...validTaskPayload, horas_asignadas_periodo: 10 },
        currentTask
      )
    ).toThrow('Las horas asignadas del período no pueden ser menores a las horas consumidas')
  })

  it('debe validar registros diarios de tareo', () => {
    const validRegistroPayload: RegistroFormData = {
      tarea_periodo_id: 1,
      fecha: '2026-07-30',
      trabajador_id: 5,
      horas: 8,
      comentario: null,
    }

    expect(() => validateRegistroPayload({ ...validRegistroPayload, horas: 0 })).toThrow('Las horas deben ser mayores a 0')
  })

  it('debe filtrar tareas por periodo_id correctamente', () => {
    const tareasMock: TareaPeriodoListItem[] = [
      {
        tarea_periodo_id: 1,
        tarea_id: 10,
        tarea_nombre: 'Tarea Periodo 1',
        team_id: null,
        team_nombre: null,
        solicitante_id: 1,
        solicitante_nombre: 'Sol',
        horas_maximas_estimadas: null,
        proyecto_id: 1,
        proyecto_nombre: 'P1',
        agrupador_id: 1,
        agrupador_nombre: 'A1',
        estado_id: 1,
        estado_nombre: 'Activo',
        activo: true,
        periodo_id: 1,
        periodo_anio: 2026,
        periodo_mes: 7,
        periodo_cerrado: false,
        horas_historicas_arrastre: 0,
        horas_asignadas_periodo: 10,
        horas_consumidas_periodo: 2,
        horas_disponibles_periodo: 8,
        horas_totales_acumuladas: 2,
        comentario_periodo: null,
        comentario_dm: null,
        created_at: '',
        updated_at: ''
      },
      {
        tarea_periodo_id: 2,
        tarea_id: 10,
        tarea_nombre: 'Tarea Periodo 2',
        team_id: null,
        team_nombre: null,
        solicitante_id: 1,
        solicitante_nombre: 'Sol',
        horas_maximas_estimadas: null,
        proyecto_id: 1,
        proyecto_nombre: 'P1',
        agrupador_id: 1,
        agrupador_nombre: 'A1',
        estado_id: 1,
        estado_nombre: 'Activo',
        activo: true,
        periodo_id: 2,
        periodo_anio: 2026,
        periodo_mes: 8,
        periodo_cerrado: false,
        horas_historicas_arrastre: 0,
        horas_asignadas_periodo: 10,
        horas_consumidas_periodo: 5,
        horas_disponibles_periodo: 5,
        horas_totales_acumuladas: 5,
        comentario_periodo: null,
        comentario_dm: null,
        created_at: '',
        updated_at: ''
      }
    ]

    const filtered = applyTareaFilters(tareasMock, { periodo_id: 2 })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].tarea_periodo_id).toBe(2)
    expect(filtered[0].periodo_mes).toBe(8)
  })
})
