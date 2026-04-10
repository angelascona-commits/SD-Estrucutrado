import { findUserByEmail } from '@/modules/auth/repository/auth.repository'
import type { LoginInput, AuthResult } from '@/modules/auth/interfaces/auth.interfaces'

// ─── LÓGICA DE NEGOCIO ────────────────────────────────────────────────────────
// Este servicio no sabe nada de Supabase ni de cookies.
// Solo ejecuta las reglas de negocio del dominio Auth.
// ─────────────────────────────────────────────────────────────────────────────

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await findUserByEmail(input.email)

  if (!user) {
    
    
    return { success: false, error: 'Credenciales incorrectas.' }
  }

  if (!user.activo) {
    return { success: false, error: 'El usuario está inactivo. Contacta al administrador.' }
  }

  if (user.password !== input.password) {
    return { success: false, error: 'Credenciales incorrectas.' }
  }

  return {
    success: true,
    user: {
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    },
  }
}