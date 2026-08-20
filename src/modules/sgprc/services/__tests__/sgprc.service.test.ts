import { describe, it, expect } from 'vitest'
import { validateSolicitudPayload } from '../sgprc.service'
import type { SolicitudFormData } from '../../interfaces/sgprc.interfaces'

describe('SGPRC Service - Validaciones de Solicitud', () => {
  const validPayload: SolicitudFormData = {
    proyectista_id: 1,
    descripcion_negocio: 'Sistema de analítica en tiempo real',
    sustento_tecnico: 'Se requiere arquitectura serverless en AWS',
    componentes: [
      {
        servicio_requerido: 'AWS Lambda',
        entorno: 'Producción',
        configuracion_detalles: 'Runtime Node.js 20, 1024MB RAM',
      },
    ],
  }

  it('debe validar que proyectista_id sea obligatorio', () => {
    expect(() => validateSolicitudPayload({ ...validPayload, proyectista_id: 0 })).toThrow(
      'El proyectista solicitante es obligatorio'
    )
  })

  it('debe validar que la descripción del negocio no esté vacía', () => {
    expect(() => validateSolicitudPayload({ ...validPayload, descripcion_negocio: '  ' })).toThrow(
      'La descripción del negocio es obligatoria'
    )
  })

  it('debe exigir al menos un componente cloud', () => {
    expect(() => validateSolicitudPayload({ ...validPayload, componentes: [] })).toThrow(
      'Debe agregar al menos un componente cloud'
    )
  })

  it('debe validar los detalles del componente cloud', () => {
    expect(() =>
      validateSolicitudPayload({
        ...validPayload,
        componentes: [{ servicio_requerido: '', entorno: 'Desarrollo', configuracion_detalles: 'Detalle' }],
      })
    ).toThrow('El servicio cloud requerido es obligatorio')
  })
})
