import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loginUser } from '../auth.service'
import * as authRepository from '../../repository/auth.repository'

vi.mock('../../repository/auth.repository')

describe('Auth Service - loginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar error si el usuario no existe en la base de datos', async () => {
    vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValue(null)

    const result = await loginUser({ email: 'noexiste@test.com', password: '123' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Credenciales incorrectas.')
    }
  })

  it('debe retornar error si el usuario está inactivo', async () => {
    vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValue({
      id: 1,
      nombre: 'Usuario Inactivo',
      email: 'inactivo@test.com',
      password: '123',
      rol: 'AGENTE',
      activo: false,
      horario_laboral: '08:00 - 17:00',
    })

    const result = await loginUser({ email: 'inactivo@test.com', password: '123' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('inactivo')
    }
  })

  it('debe retornar error si la contraseña es incorrecta', async () => {
    vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValue({
      id: 1,
      nombre: 'Usuario Activo',
      email: 'activo@test.com',
      password: 'passwordCorrecta',
      rol: 'AGENTE',
      activo: true,
      horario_laboral: '08:00 - 17:00',
    })

    const result = await loginUser({ email: 'activo@test.com', password: 'passwordIncorrecta' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Credenciales incorrectas.')
    }
  })

  it('debe retornar éxito y el payload del usuario cuando las credenciales son válidas', async () => {
    vi.spyOn(authRepository, 'findUserByEmail').mockResolvedValue({
      id: 99,
      nombre: 'Juan Pérez',
      email: 'juan@test.com',
      password: 'secretPassword',
      rol: 'ADMIN',
      activo: true,
      horario_laboral: '08:00 - 17:00',
    })

    const result = await loginUser({ email: 'juan@test.com', password: 'secretPassword' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.user).toEqual({
        userId: 99,
        email: 'juan@test.com',
        nombre: 'Juan Pérez',
        rol: 'ADMIN',
      })
    }
  })
})
