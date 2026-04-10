import Link from 'next/link';
import { Bell } from 'lucide-react';
import { UrgentTicket } from '@/modules/service-desk/interfaces/ticket.interfaces';
import styles from '@/app/(dashboard)/service-desk/page.module.css';

interface Props {
  tickets: UrgentTicket[];
}

export function UrgentTicketsBanner({ tickets }: Props) {
  if (tickets.length === 0) return null; // No hay retrasos

  return (
    <div className={styles.urgentSection}>
      <div className={styles.urgentHeader}>
        <div className={styles.urgentTitle}>
          <Bell className={styles.urgentIcon} size={20} />
          <span>Alarma de Pendientes</span>
        </div>
        <Link href="?archivados=true" className={styles.urgentLink}>
          Ver todos los archivados
        </Link>
        <Link href="?retrasos=true" className={styles.urgentLink}>
          Ver todos los retrasos
        </Link>
        
      </div>

      <div className={styles.urgentCardsGrid}>
        {tickets.map((t) => (
          <div key={t.id} className={styles.urgentCard}>
            <div className={styles.urgentCardHeader}>
              <span className={styles.urgentId}>SD-{t.numero_ticket}</span>
              <span className={styles.urgentPill}>{t.retrasoDias} DÍAS DE RETRASO</span>
            </div>
            
            <p className={styles.urgentDesc} title={t.descripcion}>
              {t.descripcion}
            </p>
            
            <div className={styles.urgentCardFooter}>
              <span className={styles.urgentDesignado}>
                Designado: <strong>{t.designado_a}</strong>
              </span>
              <Link href={`?editId=${t.id}`} className={styles.urgentActionLink}>
                Gestionar &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
