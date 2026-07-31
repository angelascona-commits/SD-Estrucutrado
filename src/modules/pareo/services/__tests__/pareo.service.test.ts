import { describe, it, expect } from 'vitest'
import {
  limpiarTextoBase,
  extraerPalabrasClave,
  limpiarDireccion,
  coincidenciaSegura,
} from '../pareo.service'

describe('Pareo Service - Algoritmos de Conciliación y Limpieza', () => {
  it('debe limpiar texto base eliminando acentos, caracteres especiales y convirtiendo a mayúsculas', () => {
    expect(limpiarTextoBase('Clínica San José S.A.C.')).toBe('CLINICA SAN JOSE S A C')
    expect(limpiarTextoBase('')).toBe('')
  })

  it('debe extraer palabras clave removiendo sufijos societarios y palabras vacías', () => {
    expect(extraerPalabrasClave('Clínica San José S.A.C.')).toBe('SAN JOSE')
    expect(extraerPalabrasClave('Hospital Central SAC')).toBe('CENTRAL')
  })

  it('debe limpiar direcciones removiendo prefijos comunes (Av, Calle, Jr, Mz, Lt)', () => {
    expect(limpiarDireccion('Av. Las Flores Nro 123 Urb. Primavera')).toBe('LAS FLORES 123 PRIMAVERA')
  })

  it('debe evaluar coincidencia segura entre dos textos', () => {
    expect(coincidenciaSegura('SAN JOSE', 'CLINICA SAN JOSE')).toBe(true)
    expect(coincidenciaSegura('LIMA PERU', 'LIMA')).toBe(true)
    expect(coincidenciaSegura('SAN JOSE', 'SAN PEDRO')).toBe(false)
  })
})
