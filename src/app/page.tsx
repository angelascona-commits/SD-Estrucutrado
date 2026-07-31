import { redirect } from 'next/navigation'
import { getSession } from '@/modules/shared/utils/session'
import { getDominiosPermitidosParaUsuario } from '@/modules/admin/services/roles.service'

export default async function RootPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const dominios = await getDominiosPermitidosParaUsuario(
    session.userId,
    session.rol,
    session.dominiosPermitidos
  )

  const rutaInicial = dominios[0]?.href || '/tareo'
  redirect(rutaInicial)
}