import { supabase } from '@/modules/shared/infra/supabase'

export interface RawUser {
  id: number
  nombre: string
  email: string
  password: string
  rol: string
  activo: boolean
  horario_laboral: string
  dominios_permitidos?: string[]
}

export async function findUserByEmail(email: string): Promise<RawUser | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, password, rol, activo, horario_laboral, dominios_permitidos')
    .eq('email', email)
    .single()

  if (error || !data) {
    // Si la columna dominios_permitidos aún no existe en Supabase, hacer fallback a consulta básica
    const { data: fallbackData } = await supabase
      .from('usuarios')
      .select('id, nombre, email, password, rol, activo, horario_laboral')
      .eq('email', email)
      .single()

    if (!fallbackData) return null
    return fallbackData as RawUser
  }

  return data as RawUser
}