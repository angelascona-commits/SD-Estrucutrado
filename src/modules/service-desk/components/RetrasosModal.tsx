'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import styles from './RetrasosModal.module.css'
import { DelayedTicketModalRow } from '@/modules/service-desk/interfaces/ticket.interfaces'

interface Props {
  isOpen: boolean
  tickets: DelayedTicketModalRow[]
}

function formatDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-PE', { timeZone: 'UTC' })
}

export default function RetrasosModal({ isOpen, tickets }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (!isOpen) return null

  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('retrasos')
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const handleOpenTicket = (id: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('retrasos')
    params.set('editId', String(id))
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Tickets con retraso</h2>
            <p className={styles.subtitle}>
              Ordenados del más actual al más antiguo según la fecha máxima de atención.
            </p>
          </div>

          <button type="button" className={styles.closeButton} onClick={closeModal}>
            ×
          </button>
        </div>

        <div className={styles.body}>
          {tickets.length === 0 ? (
            <div className={styles.emptyState}>
              No hay tickets retrasados para mostrar.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>SD</th>
                    <th>Descripción</th>
                    <th>Designado</th>
                    <th>Fecha máxima</th>
                    <th>Retraso</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className={styles.sdCell}>SD-{ticket.numero_ticket}</td>
                      <td className={styles.descCell} title={ticket.descripcion}>
                        {ticket.descripcion}
                      </td>
                      <td>{ticket.designado_a}</td>
                      <td>{formatDate(ticket.fecha_maxima_atencion)}</td>
                      <td>
                        <span className={styles.delayBadge}>
                          {ticket.retrasoDias} días
                        </span>
                      </td>
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