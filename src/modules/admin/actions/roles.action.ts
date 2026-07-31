'use server'

import { revalidatePath } from 'next/cache'
import {
  getAllUsuariosPermisos,
  actualizarPermisosUsuario,
  actualizarBulkPermisosUsuarios,
  getDominiosPermitidosParaUsuario,
} from '../services/roles.service'
import type { UsuarioPermiso, DomainItem } from '../interfaces/roles.interfaces'

export async function getUsuariosPermisosAction(): Promise<UsuarioPermiso[]> {
  return await getAllUsuariosPermisos()
}

export async function updateUsuarioPermisosAction(
  userId: number,
  dominiosPermitidos: string[]
): Promise<{ success: boolean; error?: string }> {
  const result = await actualizarPermisosUsuario(userId, dominiosPermitidos)
  if (result.success) {
    revalidatePath('/', 'layout')
  }
  return result
}

export async function updateBulkUsuariosPermisosAction(
  updates: { userId: number; dominiosPermitidos: string[] }[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const result = await actualizarBulkPermisosUsuarios(updates)
  if (result.success) {
    revalidatePath('/', 'layout')
  }
  return result
}

export async function updateRolPermisosAction(
  userIdOrRol: any,
  dominiosPermitidos: string[]
): Promise<{ success: boolean; error?: string }> {
  const userId = typeof userIdOrRol === 'number' ? userIdOrRol : Number(userIdOrRol) || 1
  return await updateUsuarioPermisosAction(userId, dominiosPermitidos)
}

export async function getDominiosUsuarioAction(
  rol: string,
  userId?: number,
  userDomains?: string[]
): Promise<DomainItem[]> {
  return await getDominiosPermitidosParaUsuario(userId, rol, userDomains)
}

export async function getRolPermisosAction() {
  return await getAllUsuariosPermisos()
}
