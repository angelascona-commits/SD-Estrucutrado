import {
  CATALOGO_DOMINIOS,
  fetchAllUsuariosPermisos,
  fetchUsuarioPermisosById,
  saveUsuarioPermisos,
  saveBulkUsuariosPermisos,
  fetchRolPermisoByRol,
} from '../repository/roles.repository'
import type { DomainItem, UsuarioPermiso } from '../interfaces/roles.interfaces'

export async function getAllUsuariosPermisos(): Promise<UsuarioPermiso[]> {
  return await fetchAllUsuariosPermisos()
}

export async function actualizarPermisosUsuario(
  userId: number,
  dominiosPermitidos: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'El ID de usuario es obligatorio.' }
  }

  const dominiosFinales = dominiosPermitidos.length > 0 ? dominiosPermitidos : ['/service-desk']
  const success = await saveUsuarioPermisos(userId, dominiosFinales)

  if (!success) {
    return { success: false, error: 'No se pudo guardar la configuración de permisos del usuario.' }
  }

  return { success: true }
}

export async function actualizarBulkPermisosUsuarios(
  updates: { userId: number; dominiosPermitidos: string[] }[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { success: false, count: 0, error: 'No hay cambios para guardar.' }
  }

  const sanitizedUpdates = updates.map((u) => ({
    userId: u.userId,
    dominiosPermitidos: u.dominiosPermitidos.length > 0 ? u.dominiosPermitidos : ['/service-desk'],
  }))

  const success = await saveBulkUsuariosPermisos(sanitizedUpdates)
  if (!success) {
    return { success: false, count: 0, error: 'Ocurrió un error al guardar masivamente los permisos.' }
  }

  return { success: true, count: sanitizedUpdates.length }
}

export async function getDominiosPermitidosParaUsuario(
  userId?: number,
  rol?: string,
  userDomains?: string[]
): Promise<DomainItem[]> {
  if (Array.isArray(userDomains) && userDomains.length > 0) {
    return CATALOGO_DOMINIOS.filter((d) => userDomains.includes(d.href))
  }

  if (userId) {
    const usuarioPermiso = await fetchUsuarioPermisosById(userId)
    if (usuarioPermiso && usuarioPermiso.dominiosPermitidos.length > 0) {
      return CATALOGO_DOMINIOS.filter((d) => usuarioPermiso.dominiosPermitidos.includes(d.href))
    }
  }

  const rolPermiso = await fetchRolPermisoByRol(rol || 'AGENTE')
  if (rolPermiso) {
    return CATALOGO_DOMINIOS.filter((d) => rolPermiso.dominiosPermitidos.includes(d.href))
  }

  return CATALOGO_DOMINIOS.filter((d) => d.href === '/service-desk')
}

export async function isDomainAllowedForRole(rol: string, pathname: string): Promise<boolean> {
  const dominios = await getDominiosPermitidosParaUsuario(undefined, rol)
  return dominios.some((d) => pathname === d.href || pathname.startsWith(`${d.href}/`))
}

export async function getDominiosPermitidosParaRol(rol: string): Promise<DomainItem[]> {
  return await getDominiosPermitidosParaUsuario(undefined, rol)
}

export async function actualizarPermisosRol(
  rol: string,
  dominiosPermitidos: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!rol) {
    return { success: false, error: 'El nombre del rol es obligatorio.' }
  }
  return { success: true }
}
