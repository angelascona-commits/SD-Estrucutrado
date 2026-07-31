import { describe, it, expect } from 'vitest'
import {
  validateTareaPayload,
  validateTareaUpdatePayload,
  normalizeTareaPayload,
  validateRegistroPayload,
} from '../tareo.service'
import type { TareaFormData, TareaPeriodoListItem, RegistroFormData } from '../../interfaces/tareo.interfaces'

describe('Tareo Service - Validaciones y Normalización', () => {
  const validTaskPayload: TareaFormData = {
    nombre: ' Tarea de Prueba ',
    periodo_id: 1,
    proyecto_id: 2,
    solicitante_id: 3,
    estado_id: 4,
    horas_historicas_arrastre: 10,
    horas_asignadas_periodo: 20,
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
      periodo_id: 1,
      horas_asignadas_periodo: 20,
      horas_consumidas_periodo: 15,
      horas_historicas_arrastre: 0,
      nombre_tarea: 'Tarea Actual',
      codigo_proyecto: 'PRJ-1',
      nombre_proyecto: 'Proyecto 1',
      solicitante: 'Cliente X',
      estado: 'En Proceso',
      activo: true,
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
    }

    expect(() => validateRegistroPayload({ ...validRegistroPayload, horas: 0 })).toThrow('Las horas deben ser mayores a 0')
  })
})
