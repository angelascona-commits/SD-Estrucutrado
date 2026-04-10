'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import styles from './ArchivadosModal.module.css'
import { TicketTableRow } from '@/modules/service-desk/interfaces/ticket.interfaces'

interface Props {
  isOpen: boolean
  tickets: TicketTableRow[]
}

export default function ArchivadosModal({ isOpen, tickets }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (!isOpen) return null

  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('archivados')
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const handleOpenTicket = (id: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('archivados')
    params.set('editId', String(id))
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Tickets archivados</h2>
            <p className={styles.subtitle}>
              Tickets excluidos del dashboard y de reportes futuros.
            </p>
          </div>

          <button type="button" className={styles.closeButton} onClick={closeModal}>
            ×
          </button>
        </div>

        <div className={styles.body}>
          {tickets.length === 0 ? (
            <div className={styles.emptyState}>
              No hay tickets archivados para mostrar.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>SD</th>
                    <th>Estado</th>
                    <th>Descripción</th>
                    <th>Aplicación</th>
                    <th>Designado</th>
                    <th>F. Asignación</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className={styles.sdCell}>SD-{ticket.numero_ticket}</td>
                      <td>{ticket.estado}</td>
                      <td className={styles.descCell} title={ticket.descripcion}>
                        {ticket.descripcion}
                      </td>
                      <td>{ticket.aplicacion}</td>
                      <td>{ticket.designado_a}</td>
                      <td>{ticket.fecha_asignacion}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => handleOpenTicket(ticket.id)}
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.secondaryButton} onClick={closeModal}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}