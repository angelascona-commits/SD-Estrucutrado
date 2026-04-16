'use client'

import { useMemo, useState } from 'react'
import type { RegistroDetalleItem } from '../interfaces/tareo.interfaces'
import styles from '../styles/tareo-daily-filters.module.css'

export interface TareoDailyFilterState {
  search: string
  tarea: string
  proyecto: string
  agrupador: string
  trabajador: string
  solicitante: string
}

interface TareoDailyFiltersProps {
  filters: TareoDailyFilterState
  onChange: (filters: TareoDailyFilterState) => void
  registros: RegistroDetalleItem[]
  totalVisible: number
  horasVisibles: number
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getUniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (value ?? '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))
}

function hasActiveFilters(filters: TareoDailyFilterState) {
  return Boolean(
    filters.search ||
      filters.tarea ||
      filters.proyecto ||
      filters.agrupador ||
      filters.trabajador ||
      filters.solicitante
  )
}

function applyFilters(
  registros: RegistroDetalleItem[],
  filters: TareoDailyFilterState,
  excludeField?: keyof TareoDailyFilterState
) {
  const search = excludeField === 'search' ? '' : normalizeText(filters.search)

  return registros.filter((item) => {
    if (excludeField !== 'tarea' && filters.tarea && item.tarea_nombre !== filters.tarea) {
      return false
    }

    if (
      excludeField !== 'proyecto' &&
      filters.proyecto &&
      item.proyecto_nombre !== filters.proyecto
    ) {
      return false
    }

    if (
      excludeField !== 'agrupador' &&
      filters.agrupador &&
      item.agrupador_nombre !== filters.agrupador
    ) {
      return false
    }

    if (
      excludeField !== 'trabajador' &&
      filters.trabajador &&
      item.trabajador_nombre !== filters.trabajador
    ) {
      return false
    }

    if (
      excludeField !== 'solicitante' &&
      filters.solicitante &&
      item.solicitante_nombre !== filters.solicitante
    ) {
      return false
    }

    if (!search) {
      return true
    }

    const values = [
      item.tarea_nombre,
      item.proyecto_nombre,
      item.agrupador_nombre,
      item.trabajador_nombre,
      item.solicitante_nombre,
      item.team_nombre ?? '',
      item.comentario ?? '',
      String(item.horas),
      String(item.horas_disponibles_periodo),
      String(item.horas_asignadas_periodo),
      String(item.horas_consumidas_periodo),
      String(item.horas_historicas_arrastre),
      String(item.horas_totales_acumuladas)
    ]

    return values.some((value) => normalizeText(value).includes(search))
  })
}

export default function TareoDailyFilters({
  filters,
  onChange,
  registros,
  totalVisible,
  horasVisibles
}: TareoDailyFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const tareas = useMemo(() => {
    return getUniqueValues(
      applyFilters(registros, filters, 'tarea').map((item) => item.tarea_nombre)
    )
  }, [registros, filters])

  const proyectos = useMemo(() => {
    return getUniqueValues(
      applyFilters(registros, filters, 'proyecto').map((item) => item.proyecto_nombre)
    )
  }, [registros, filters])

  const agrupadores = useMemo(() => {
    return getUniqueValues(
      applyFilters(registros, filters, 'agrupador').map((item) => item.agrupador_nombre)
    )
  }, [registros, filters])

  const trabajadores = useMemo(() => {
    return getUniqueValues(
      applyFilters(registros, filters, 'trabajador').map((item) => item.trabajador_nombre)
    )
  }, [registros, filters])

  const solicitantes = useMemo(() => {
    return getUniqueValues(
      applyFilters(registros, filters, 'solicitante').map((item) => item.solicitante_nombre)
    )
  }, [registros, filters])

  const activeFilters = hasActiveFilters(filters)

  const handleChange = <K extends keyof TareoDailyFilterState>(
    field: K,
    value: TareoDailyFilterState[K]
  ) => {
    onChange({
      ...filters,
      [field]: value
    })
  }

  const handleClear = () => {
    onChange({
      search: '',
      tarea: '',
      proyecto: '',
      agrupador: '',
      trabajador: '',
      solicitante: ''
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div>
          <h3 className={styles.title}>Filtros del día</h3>
          <p className={styles.subtitle}>
            Encuentra registros por tarea, proyecto, agrupador, trabajador o solicitante
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => setShowFilters((prev) => !prev)}
          >
            {showFilters ? 'Ocultar filtros' : 'Agregar filtros'}
          </button>

          {activeFilters && (
            <button type="button" className={styles.clearButton} onClick={handleClear}>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {activeFilters && !showFilters && (
        <div className={styles.activeFiltersRow}>
          {filters.search && <span className={styles.filterTag}>Búsqueda: {filters.search}</span>}
          {filters.tarea && <span className={styles.filterTag}>Tarea: {filters.tarea}</span>}
          {filters.proyecto && (
            <span className={styles.filterTag}>Proyecto: {filters.proyecto}</span>
          )}
          {filters.agrupador && (
            <span className={styles.filterTag}>Agrupador: {filters.agrupador}</span>
          )}
          {filters.trabajador && (
            <span className={styles.filterTag}>Trabajador: {filters.trabajador}</span>
          )}
          {filters.solicitante && (
            <span className={styles.filterTag}>Solicitante: {filters.solicitante}</span>
          )}
        </div>
      )}

      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.grid}>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Búsqueda general</label>
              <input
                type="text"
                value={filters.search}
                onChange={(event) => handleChange('search', event.target.value)}
                className={styles.input}
                placeholder="Buscar por tarea, proyecto, agrupador, trabajador, comentario..."
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tarea</label>
              <select
                value={filters.tarea}
                onChange={(event) => handleChange('tarea', event.target.value)}
                className={styles.select}
              >
                <option value="">Todas</option>
                {tareas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Proyecto</label>
              <select
                value={filters.proyecto}
                onChange={(event) => handleChange('proyecto', event.target.value)}
                className={styles.select}
              >
                <option value="">Todos</option>
                {proyectos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Agrupador</label>
              <select
                value={filters.agrupador}
                onChange={(event) => handleChange('agrupador', event.target.value)}
                className={styles.select}
              >
                <option value="">Todos</option>
                {agrupadores.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Trabajador</label>
              <select
                value={filters.trabajador}
                onChange={(event) => handleChange('trabajador', event.target.value)}
                className={styles.select}
              >
                <option value="">Todos</option>
                {trabajadores.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Solicitante</label>
              <select
                value={filters.solicitante}
                onChange={(event) => handleChange('solicitante', event.target.value)}
                className={styles.select}
              >
                <option value="">Todos</option>
                {solicitantes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Registros visibles</span>
          <span className={styles.summaryValue}>{totalVisible}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Horas visibles</span>
          <span className={styles.summaryValue}>{horasVisibles}</span>
        </div>
      </div>
    </div>
  )
}