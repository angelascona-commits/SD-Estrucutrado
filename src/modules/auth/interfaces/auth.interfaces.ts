// Entidad de dominio — refleja la tabla `usuarios`
export interface User {
  id: number
  nombre: string
  email: string
  rol: string
  activo: boolean
  horario_laboral: string
}

// Input del formulario de login
export interface LoginInput {
  email: string
  password: string
}

// Payload que se almacena en la cookie de sesión
export interface SessionPayload {
  userId: number
  email: string
  nombre: string
  rol: string
}

// Resultado que devuelve el servicio de autenticación
export type AuthResult =
  | { success: true; user: SessionPayload }
  | { success: false; error: string }

// Estado que maneja el Server Action (compatible con useFormState)
export interface LoginActionState {
  error?: string
  success?: boolean
}