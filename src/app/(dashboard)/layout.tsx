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
        userId: session.userId,
        nombre: session.nombre,
        rol: session.rol,
        dominiosPermitidos: session.dominiosPermitidos,
      }
    : null

  return <AppShell usuario={usuario}>{children}</AppShell>
}