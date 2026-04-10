'use client';

import type { TicketTableRow } from '@/modules/service-desk/interfaces/ticket.interfaces';
import styles from '@/app/(dashboard)/service-desk/page.module.css';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface Props {
  tickets: TicketTableRow[];
}

export function TicketTable({ tickets }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleRowClick = (id: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('editId', id.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'abierto':
      case 'nuevo':
        return styles.statusOpen;
      case 'en progreso':
      case 'atendiendo':
        return styles.statusProgress;
      case 'resuelto':
      case 'cerrado':
        return styles.statusResolved;
      default:
        return styles.statusOpen;
    }
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.ticketTable}>
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>F. Asignación</th>
            <th>Estado</th>
            <th>Descripción</th>
            <th>Aplicación</th>
            <th>t.Asignación</th>
            <th>Tiempo Límite</th>
            <th>Resolución</th>
            <th>Designado A</th>
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>
                No hay tickets registrados.
              </td>
            </tr>
          ) : (
            tickets.map((t) => (
              <tr
                key={t.id}
                className={styles.ticketRow}
                onClick={() => handleRowClick(t.id)}
                style={{ cursor: 'pointer' }}
              >
                <td className={styles.tId}>{t.numero_ticket}</td>
                <td className={styles.tDate}>{t.fecha_asignacion}</td>
                <td>
                  <span className={`${styles.statusPill} ${getStatusClass(t.estado)}`}>
                    {t.estado}
                  </span>
                </td>
                <td className={styles.tDesc} title={t.descripcion}>{t.descripcion}</td>
                <td className={styles.tApp}>{t.aplicacion}</td>

                <td className={
                  t.tAreaAsignacionHoras !== null
                    ? (t.tAreaAsignacionExcede ? styles.textRed : styles.textGreen)
                    : ''
                }>
                  {t.tAreaAsignacionLabel}
                </td>

                <td className={
                  t.tiempoLimiteHoras !== null
                    ? (t.tiempoLimiteCumple ? styles.textGreen : styles.textRed)
                    : ''
                }>
                  {t.tiempoLimiteLabel}
                </td>

                <td>{t.resolucionLabel}</td>

                <td className={styles.tAssigned}>{t.designado_a}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
