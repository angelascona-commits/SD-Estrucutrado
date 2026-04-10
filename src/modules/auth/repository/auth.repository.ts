import { supabase } from '@/modules/shared/infra/supabase'

// ─── CAPA DE ACCESO A DATOS ───────────────────────────────────────────────────
// Este archivo es el ÚNICO que tiene conocimiento de Supabase dentro del módulo
// de autenticación. Al cambiar de base de datos, solo se reemplaza este archivo.
// El resto del módulo (service, action, components) permanece intacto.
// ─────────────────────────────────────────────────────────────────────────────

export interface RawUser {
  id: number
  nombre: string
  email: string
  password: string
  rol: string
  activo: boolean
  horario_laboral: string
}

export async function findUserByEmail(email: string): Promise<RawUser | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, password, rol, activo, horario_laboral')
    .eq('email', email)
    .single()

  if (error || !data) return null
  return data as RawUser
}