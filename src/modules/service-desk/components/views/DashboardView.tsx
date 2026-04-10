import Link from 'next/link'
import { TicketTable } from '@/modules/service-desk/components/TicketTable'
import { UrgentTicketsBanner } from '@/modules/service-desk/components/UrgentTicketsBanner'
import { TicketFiltersBar } from '@/modules/service-desk/components/TicketFiltersBar'
import type {
  TicketFilterCatalogs,
  TicketTableRow,
  UrgentTicket,
} from '@/modules/service-desk/interfaces/ticket.interfaces'
import styles from './DashboardView.module.css'

interface Props {
  tickets: TicketTableRow[]
  totalPages: number
  currentPage: number
  catalogs: TicketFilterCatalogs
  urgentTickets: UrgentTicket[]
  getPaginationLink: (newPage: number) => string
}

export default function DashboardView({
  tickets,
  totalPages,
  currentPage,
  catalogs,
  urgentTickets,
  getPaginationLink,
}: Props) {
  return (
    <section className={styles.pageSection}>
      <UrgentTicketsBanner tickets={urgentTickets} />
      <TicketFiltersBar catalogs={catalogs} />
      <TicketTable tickets={tickets} />

      <div className={styles.paginationArea}>
        {totalPages > 1 && (
          <div className={styles.paginationConfig}>
            {currentPage > 1 ? (
              <Link href={getPaginationLink(currentPage - 1)} className={styles.btnPagination}>
                Anterior
              </Link>
            ) : (
              <button disabled className={styles.btnPagination}>
                Anterior
              </button>
            )}

            <span className={styles.pageText}>
              Página {currentPage} de {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Link href={getPaginationLink(currentPage + 1)} className={styles.btnPagination}>
                Siguiente
              </Link>
            ) : (
              <button disabled className={styles.btnPagination}>
                Siguiente
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}