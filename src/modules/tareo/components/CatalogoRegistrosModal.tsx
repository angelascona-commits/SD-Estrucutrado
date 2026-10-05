'use client'

import { useEffect, useMemo, useState } from 'react'
import { getRegistrosByCatalogItemAction } from '../actions/tareo.action'
import type { PeriodoItem, RegistroDetalleItem } from '../interfaces/tareo.interfaces'
import styles from '../styles/catalogo-registros-modal.module.css'

interface CatalogoRegistrosModalProps {
  isOpen: boolean
  onClose: () => void
  catalogType: 'trabajadores' | 'teams' | 'solicitantes' | 'areas' | 'agrupadores' | 'proyectos'
  item: { id: number; nombre: string; [key: string]: any } | null
  periodos: PeriodoItem[]
  defaultPeriodoId?: number | null
}

const typeLabels: Record<string, { label: string; badgeClass: string }> = {
  trabajadores: { label: 'Trabajador', badgeClass: styles.badgeTrabajador },
  teams: { label: 'Team', badgeClass: styles.badgeTeam },
  solicitantes: { label: 'Solicitante', badgeClass: styles.badgeSolicitante },
  areas: { label: 'Área', badgeClass: styles.badgeArea },
  agrupadores: { label: 'Agrupador', badgeClass: styles.badgeAgrupador },
  proyectos: { label: 'Proyecto', badgeClass: styles.badgeProyecto }
}

export default function CatalogoRegistrosModal({
  isOpen,
  onClose,
  catalogType,
  item,
  periodos,
  defaultPeriodoId
}: CatalogoRegistrosModalProps) {
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>('')
  const [registros, setRegistros] = useState<RegistroDetalleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Initialize selectedPeriodoId when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultPeriodoId) {
        setSelectedPeriodoId(String(defaultPeriodoId))
      } else if (periodos && periodos.length > 0) {
        setSelectedPeriodoId(String(periodos[0].id))
      } else {
        setSelectedPeriodoId('')
      }
      setSearch('')
      setError(null)
    }
  }, [isOpen, defaultPeriodoId, periodos, item?.id])

  // Fetch records
  useEffect(() => {
    if (!isOpen || !item?.id) return

    const loadRecords = async () => {
      setLoading(true)
      setError(null)
      const pId = selectedPeriodoId ? Number(selectedPeriodoId) : undefined
      const res = await getRegistrosByCatalogItemAction(catalogType, item.id, pId)
      if (res.success && res.data) {
        setRegistros(res.data)
      } else {
        setError(res.error ?? 'Error al cargar los registros')
        setRegistros([])
      }
      setLoading(false)
    }

    void loadRecords()
  }, [isOpen, item?.id, catalogType, selectedPeriodoId])

  // Filtered rows by search text
  const filteredRegistros = useMemo(() => {
    if (!search.trim()) return registros
    const q = search.toLowerCase().trim()
    return registros.filter((r) => {
      return (
        r.tarea_nombre?.toLowerCase().includes(q) ||
        r.trabajador_nombre?.toLowerCase().includes(q) ||
        r.proyecto_nombre?.toLowerCase().includes(q) ||
        r.agrupador_nombre?.toLowerCase().includes(q) ||
        r.solicitante_nombre?.toLowerCase().includes(q) ||
        r.fecha?.toLowerCase().includes(q) ||
        r.comentario?.toLowerCase().includes(q)
      )
    })
  }, [registros, search])

  // Metrics
  const totalHoras = useMemo(() => {
    const sum = filteredRegistros.reduce((acc, r) => acc + Number(r.horas || 0), 0)
    return Math.round(sum * 100) / 100
  }, [filteredRegistros])

  const totalTareasUnicas = useMemo(() => {
    return new Set(filteredRegistros.map((r) => r.tarea_id)).size
  }, [filteredRegistros])

  if (!isOpen || !item) return null

  const config = typeLabels[catalogType] || { label: catalogType, badgeClass: '' }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={`${styles.typeBadge} ${config.badgeClass}`}>
              {config.label}
            </span>
            <h2 className={styles.title}>{item.nombre}</h2>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Controls Bar */}
        <div className={styles.controlsBar}>
          <div className={styles.selectGroup}>
            <label htmlFor="periodoSelectModal" className={styles.selectLabel}>Período:</label>
            <select
              id="periodoSelectModal"
              className={styles.periodoSelect}
              value={selectedPeriodoId}
              onChange={(e) => setSelectedPeriodoId(e.target.value)}
            >
              <option value="">Todos los períodos</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.anio}-{String(p.mes).padStart(2, '0')} {p.cerrado ? '(Cerrado)' : ''}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por tarea, trabajador, proyecto, fecha, comentario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Metrics Bar */}
        <div className={styles.metricsBar}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Total Horas:</span>
            <span className={styles.metricValue}>{totalHoras.toFixed(2)} h</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Registros:</span>
            <span className={styles.metricValue}>{filteredRegistros.length}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Tareas Únicas:</span>
            <span className={styles.metricValue}>{totalTareasUnicas}</span>
          </div>
        </div>

        {/* Content Table */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              <span>Cargando registros asociados...</span>
            </div>
          ) : error ? (
            <div className={styles.emptyState}>{error}</div>
          ) : filteredRegistros.length === 0 ? (
            <div className={styles.emptyState}>
              <span>No se encontraron registros asociados para este período.</span>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Período</th>
                  <th>Tarea</th>
                  {catalogType !== 'trabajadores' && <th>Trabajador</th>}
                  {catalogType !== 'proyectos' && <th>Proyecto</th>}
                  {catalogType !== 'agrupadores' && <th>Agrupador</th>}
                  {catalogType !== 'solicitantes' && <th>Solicitante</th>}
                  <th style={{ textAlign: 'right' }}>Horas</th>
                  <th>Comentario</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistros.map((r) => {
                  const fechaPart = r.fecha ? r.fecha.split('-') : []
                  const regAnio = fechaPart[0] ? Number(fechaPart[0]) : null
                  const regMes = fechaPart[1] ? Number(fechaPart[1]) : null
                  const isMismatch = Boolean(
                    regAnio && regMes && r.anio && r.mes && (regAnio !== r.anio || regMes !== r.mes)
                  )

                  return (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{r.fecha}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={styles.periodoBadge}>
                          {r.anio ? `${r.anio}-${String(r.mes).padStart(2, '0')}` : '-'}
                        </span>
                        {isMismatch && (
                          <span
                            className={styles.mismatchAlert}
                            title="El período de la tarea no coincide con el mes de la fecha del registro"
                          >
                            ⚠️
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.tarea_nombre}</td>
                      {catalogType !== 'trabajadores' && <td>{r.trabajador_nombre}</td>}
                      {catalogType !== 'proyectos' && <td>{r.proyecto_nombre}</td>}
                      {catalogType !== 'agrupadores' && <td>{r.agrupador_nombre}</td>}
                      {catalogType !== 'solicitantes' && <td>{r.solicitante_nombre}</td>}
                      <td className={styles.hoursCell} style={{ textAlign: 'right' }}>
                        {Number(r.horas).toFixed(2)}
                      </td>
                      <td className={styles.commentCell}>
                        {r.comentario || <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
