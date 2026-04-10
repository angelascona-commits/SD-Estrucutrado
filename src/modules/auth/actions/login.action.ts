'use server'

import { redirect } from 'next/navigation'
import { loginUser } from '@/modules/auth/services/auth.service'
import { setSession } from '@/modules/shared/utils/session'
import type { LoginActionState } from '@/modules/auth/interfaces/auth.interfaces'

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = formData.get('email')?.toString().trim() ?? ''
  const password = formData.get('password')?.toString() ?? ''

  if (!email || !password) {
    return { error: 'Completa todos los campos.' }
  }

  if (!email.includes('@')) {
    return { error: 'Ingresa un correo electrónico válido.' }
  }

  const result = await loginUser({ email, password })

  if (!result.success) {
    return { error: result.error }
  }

  await setSession(result.user)

  redirect('/service-desk')
}