import SGPRCView from '@/modules/sgprc/components/SGPRCView'
import CatalogosView from '@/modules/sgprc/components/views/CatalogosView'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function SGPRCPage({ searchParams }: Props) {
  const params = await searchParams
  const viewParam = params?.view
  const currentView = viewParam === 'catalogos' ? viewParam : 'dashboard'

  return (
    <main className={styles.container}>
      {currentView === 'catalogos' ? (
        <CatalogosView />
      ) : (
        <SGPRCView />
      )}
    </main>
  )
}
