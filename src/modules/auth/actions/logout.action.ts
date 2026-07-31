'use server'

import { redirect } from 'next/navigation'
import { clearSession } from '@/modules/shared/utils/session'

export async function logoutAction(): Promise<void> {
  await clearSession()
  redirect('/login')
}
