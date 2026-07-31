import { supabase } from '@/modules/shared/infra/supabase'
import type { RolPermiso, DomainItem, UsuarioPermiso } from '../interfaces/roles.interfaces'

export const CATALOGO_DOMINIOS: DomainItem[] = [
  {
    key: 'service-desk',
    label: 'Service Desk',
    href: '/service-desk',
    icon: 'confirmation_number',
  },
  {
    key: 'tareo',
    label: 'Tareo',
    href: '/tareo',
    icon: 'schedule',
  },
  {
    key: 'pareo',
    label: 'Pareo',
    href: '/pareo',
    icon: 'join_inner',
  },
  {
    key: 'sgprc',
    label: 'Solicitudes',
    href: '/sgprc',
    icon: 'cloud',
  },
  {
    key: 'admin',
    label: 'Administración',
    href: '/admin/permisos',
    icon: 'admin_panel_settings',
  },
]

// Fallback por defecto si no hay usuarios en BD aún
let memoryUsuariosPermisos: UsuarioPermiso[] = [
  {
    userId: 1,
    nombre: 'Administrador Principal',
    email: 'admin@sgem.com',
    rol: 'ADMINISTRADOR',
    dominiosPermitidos: ['/service-desk', '/tareo', '/pareo', '/sgprc', '/admin/permisos'],
  },
]

export async function fetchAllUsuariosPermisos(): Promise<UsuarioPermiso[]> {
  try {
    let { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, dominios_permitidos')

    if (error || !data) {
      const { data: fallbackData } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol')

      data = fallbackData as any[]
    }

    if (!data || data.length === 0) {
      return memoryUsuariosPermisos
    }

    return data.map((item) => {
      const isUserAdmin = (item.rol || '').toUpperCase().includes('ADMIN')
      const defaultDomains = isUserAdmin
        ? ['/service-desk', '/tareo', '/pareo', '/sgprc', '/admin/permisos']
        : ['/service-desk', '/tareo']

      const dominios = Array.isArray(item.dominios_permitidos) && item.dominios_permitidos.length > 0
        ? item.dominios_permitidos
        : defaultDomains

      return {
        userId: item.id,
        nombre: item.nombre || 'Sin Nombre',
        email: item.email || 'Sin Email',
        rol: item.rol || 'AGENTE',
        dominiosPermitidos: dominios,
      }
    })
  } catch {
    return memoryUsuariosPermisos
  }
}

export async function fetchUsuarioPermisosById(userId: number): Promise<UsuarioPermiso | null> {
  const all = await fetchAllUsuariosPermisos()
  const found = all.find((item) => item.userId === userId)
  return found || null
}

export async function saveUsuarioPermisos(userId: number, dominiosPermitidos: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({ dominios_permitidos: dominiosPermitidos })
      .eq('id', userId)

    if (error) {
      console.warn('Update en Supabase no completado:', error.message)
    }
  } catch (err) {
    console.warn('Error al actualizar permisos de usuario en Supabase:', err)
  }

  const index = memoryUsuariosPermisos.findIndex((item) => item.userId === userId)
  if (index !== -1) {
    memoryUsuariosPermisos[index].dominiosPermitidos = dominiosPermitidos
  }

  return true
}

export async function saveBulkUsuariosPermisos(
  updates: { userId: number; dominiosPermitidos: string[] }[]
): Promise<boolean> {
  for (const update of updates) {
    await saveUsuarioPermisos(update.userId, update.dominiosPermitidos)
  }
  return true
}

export async function fetchRolPermisoByRol(rol: string): Promise<RolPermiso | null> {
  const normalizedRol = (rol || '').toUpperCase().trim()
  const isAdmin = normalizedRol.includes('ADMIN')

  return {
    rol: normalizedRol,
    nombreRol: rol,
    dominiosPermitidos: isAdmin
      ? ['/service-desk', '/tareo', '/pareo', '/sgprc', '/admin/permisos']
      : ['/service-desk', '/tareo'],
  }
}
