import { findUserByEmail } from '@/modules/auth/repository/auth.repository'
import type { LoginInput, AuthResult } from '@/modules/auth/interfaces/auth.interfaces'

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
      dominiosPermitidos: user.dominios_permitidos,
    },
  }
}