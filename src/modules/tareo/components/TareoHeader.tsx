'use client'

import type { PeriodoItem } from '../interfaces/tareo.interfaces'
import styles from '../styles/tareo-header.module.css'

interface TareoHeaderProps {
  periodos: PeriodoItem[]
  selectedPeriodoId: number | null
  selectedFecha: string
  onPeriodoChange: (value: number | null) => void
  onFechaChange: (value: string) => void
  onNuevoRegistro: () => void
  onNuevaTarea: () => void
  onExport: () => void;
  onGenerateLink: () => void;
  isGeneratingLink: boolean;
  isExporting: boolean;
}

function buildPeriodoLabel(periodo: PeriodoItem) {
  const month = `${periodo.mes}`.padStart(2, '0')
  return `${periodo.anio}-${month}${periodo.cerrado ? ' · Cerrado' : ''}`
}

export default function TareoHeader({
  periodos,
  selectedPeriodoId,
  selectedFecha,
  onPeriodoChange,
  onFechaChange,
  onNuevoRegistro,
  onNuevaTarea,
  onExport,
  onGenerateLink,
  isGeneratingLink,
  isExporting
}: TareoHeaderProps) {
  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div>
          <h1 className={styles.title}>Tareo diario</h1>
          <p className={styles.subtitle}>Registro operativo diario de horas por tarea</p>
        </div>


        <div className={styles.actions}>
          <button
            type="button"
            onClick={onGenerateLink}
            className={styles.linkButton}
            disabled={isGeneratingLink}
          >
            {isGeneratingLink ? 'Creando Link...' : '🔗 Compartir Link'}
          </button>
          <button
            type="button"
            onClick={onExport}
            className={styles.excelButton}
            disabled={isExporting}
          >
            {isExporting ? 'Generando Excel...' : ' Exportar Reporte'}
          </button>
          <button type="button" onClick={onNuevaTarea} className={styles.secondaryButton}>
            Nueva tarea
          </button>

          <button type="button" onClick={onNuevoRegistro} className={styles.primaryButton}>
            Nuevo registro
          </button>
        </div>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.field}>
          <label className={styles.label}>Período</label>
          <select
            value={selectedPeriodoId ?? ''}
            onChange={(event) =>
              onPeriodoChange(event.target.value ? Number(event.target.value) : null)
            }
            className={styles.select}
          >
            <option value="">Seleccionar período</option>
            {periodos.map((periodo) => (
              <option key={periodo.id} value={periodo.id}>
                {buildPeriodoLabel(periodo)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Fecha</label>
          <input
            type="date"
            value={selectedFecha}
            onChange={(event) => onFechaChange(event.target.value)}
            className={styles.input}
          />
        </div>
      </div>
    </div>
  )
}