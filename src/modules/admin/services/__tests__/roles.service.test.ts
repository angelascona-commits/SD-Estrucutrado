import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDominiosPermitidosParaRol,
  getDominiosPermitidosParaUsuario,
  getAllUsuariosPermisos,
  actualizarPermisosUsuario,
  actualizarPermisosRol,
  isDomainAllowedForRole,
} from '../roles.service'

describe('Admin Permisos Service - Permisos Directos por Usuario', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar dominios permitidos para un usuario con rol de administrador', async () => {
    const dominios = await getDominiosPermitidosParaRol('ADMINISTRADOR')
    expect(dominios.length).toBeGreaterThan(0)
    expect(dominios.some((d) => d.href === '/admin/permisos')).toBe(true)
  })

  it('debe retornar dominios restringidos para un rol cliente', async () => {
    const dominios = await getDominiosPermitidosParaRol('CLIENTE')
    expect(dominios.some((d) => d.href === '/admin/permisos')).toBe(false)
    expect(dominios.some((d) => d.href === '/service-desk')).toBe(true)
  })

  it('debe verificar si un dominio dado está permitido para un rol', async () => {
    const allowed = await isDomainAllowedForRole('ADMIN', '/service-desk')
    expect(allowed).toBe(true)
  })

  it('debe rechazar la actualización de usuario si el userId es 0 o inexistente', async () => {
    const result = await actualizarPermisosUsuario(0, ['/service-desk'])
    expect(result.success).toBe(false)
    expect(result.error).toBe('El ID de usuario es obligatorio.')
  })

  it('debe actualizar los dominios permitidos para un usuario específico correctamente', async () => {
    const updateResult = await actualizarPermisosUsuario(1, ['/service-desk', '/tareo', '/pareo'])
    expect(updateResult.success).toBe(true)

    const dominiosUsuario = await getDominiosPermitidosParaUsuario(1, 'AGENTE', ['/service-desk', '/tareo', '/pareo'])
    expect(dominiosUsuario.some((d) => d.href === '/pareo')).toBe(true)
  })
})
