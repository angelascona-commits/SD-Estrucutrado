import type { ReactNode } from 'react'
import AppShell from '@/modules/shared/components/app-shell/AppShell'
import { getSession } from '@/modules/shared/utils/session'

interface Props {
  children: ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  const session = await getSession()

  const usuario = session
    ? {
        nombre: session.nombre,
        rol: session.rol,
      }
    : null

  return <AppShell usuario={usuario}>{children}</AppShell>
}