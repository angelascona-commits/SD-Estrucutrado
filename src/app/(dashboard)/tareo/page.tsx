import TareoView from '@/modules/tareo/components/TareoView'
import CatalogosView from '@/modules/tareo/components/views/CatalogosView'
import TareasView from '@/modules/tareo/components/views/TareasView'
import TareoViewHeader from '@/modules/tareo/components/views/TareoViewHeader'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ [key: string]: string | undefined }>
}

function buildViewLink(
  params: { [key: string]: string | undefined },
  view: 'dashboard' | 'catalogos' | 'tareas'
) {
  const urlParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (!value) return
    if (key === 'view') return
    urlParams.set(key, value)
  })

  urlParams.set('view', view)
  return `/tareo?${urlParams.toString()}`
}

export default async function TareoPage({ searchParams }: Props) {
  const params = await searchParams
  const viewParam = params?.view
  const currentView = viewParam === 'catalogos' || viewParam === 'tareas' ? viewParam : 'dashboard'

  return (
    <main className={styles.container}>
      <TareoViewHeader
        currentView={currentView}
        dashboardHref={buildViewLink(params, 'dashboard')}
        catalogosHref={buildViewLink(params, 'catalogos')}
        tareasHref={buildViewLink(params, 'tareas')}
      />

      {currentView === 'catalogos' ? (
        <CatalogosView />
      ) : currentView === 'tareas' ? (
        <TareasView />
      ) : (
        <TareoView />
      )}
    </main>
  )
}