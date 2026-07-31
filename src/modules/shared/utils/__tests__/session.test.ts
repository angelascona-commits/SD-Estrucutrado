import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSession, setSession, clearSession } from '../session'
import { cookies } from 'next/headers'

vi.mock('next/headers', () => {
  const store = new Map<string, any>()
  return {
    cookies: vi.fn(async () => ({
      get: (name: string) => store.get(name),
      set: (name: string, value: string, options: any) => store.set(name, { value, options }),
      delete: (name: string) => store.delete(name),
    })),
  }
})

describe('Session Utils - getSession, setSession, clearSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar null cuando no existe cookie de sesión', async () => {
    const session = await getSession()
    expect(session).toBeNull()
  })

  it('debe guardar y recuperar la sesión correctamente codificada en Base64', async () => {
    const mockUserPayload = {
      userId: 10,
      email: 'test@session.com',
      nombre: 'Test User',
      rol: 'SUPERVISOR',
    }

    await setSession(mockUserPayload)
    const session = await getSession()

    expect(session).not.toBeNull()
    expect(session?.userId).toBe(10)
    expect(session?.email).toBe('test@session.com')
    expect(session?.rol).toBe('SUPERVISOR')
  })

  it('debe eliminar la sesión en clearSession', async () => {
    const mockUserPayload = {
      userId: 10,
      email: 'test@session.com',
      nombre: 'Test User',
      rol: 'SUPERVISOR',
    }

    await setSession(mockUserPayload)
    await clearSession()

    const session = await getSession()
    expect(session).toBeNull()
  })
})
