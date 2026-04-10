import { redirect } from 'next/navigation'
import { getSession } from '@/modules/shared/utils/session'

// La raíz siempre redirige — el middleware se encarga del resto
export default async function RootPage() {
  const session = await getSession()
  redirect(session ? '/service-desk' : '/login')
}