'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import type { RegistroDetalleItem } from '../interfaces/tareo.interfaces'
import styles from '../styles/tareo-daily-filters.module.css'

export interface TareoDailyFilterState {
  search: string
  tarea: string[]
  proyecto: string[]
  agrupador: string[]
  trabajador: string[]
  solicitante: string[]
}

interface TareoDailyFiltersProps {
  filters: TareoDailyFilterState
  onChange: (filters: TareoDailyFilterState) => void
  registros: RegistroDetalleItem[]
  totalVisible: number
  horasVisibles: number
}

interface MultiSelectFieldProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholderAll: string
}

function MultiSelectField({ label, options, selected, onChange, placeholderAll }: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleOption = (option: string) => {
    const exists = selected.includes(option)
    if (exists) {
      onChange(selected.filter((item) => item !== option))
    } else {
      onChange([...selected, option])
    }
  }

  const handleSelectAll = () => {
    onChange([...options])
  }

  const handleClearAll = () => {
    onChange([])
  }

  const labelText = useMemo(() => {
    if (selected.length === 0) return placeholderAll
    if (selected.length === 1) return selected[0]
    return `${selected.length} seleccionados`
  }, [selected, placeholderAll])

  return (
    <div className={styles.multiSelectWrapper} ref={wrapperRef}>
      <button
        type="button"
        className={`${styles.multiSelectTrigger} ${open ? styles.multiSelectTriggerActive : ''}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.triggerText}>{labelText}</span>
        {selected.length > 1 && <span className={styles.chipCount}>{selected.length}</span>}
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#6b7280', marginLeft: '6px' }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className={styles.multiSelectPopover}>
          <div className={styles.popoverHeader}>
            <button type="button" className={styles.popoverAction} onClick={handleSelectAll}>
              Todos ({options.length})
            </button>
            {selected.length > 0 && (
              <button type="button" className={styles.popoverAction} onClick={handleClearAll}>
                Limpiar
              </button>
            )}
          </div>

          <div className={styles.popoverList}>
            {options.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: '13px', color: '#9ca3af' }}>No hay opciones</div>
            ) : (
              options.map((opt) => {
                const isSelected = selected.includes(opt)
                return (
                  <label
                    key={opt}
                    className={`${styles.popoverOption} ${isSelected ? styles.popoverOptionSelected : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleOption(opt)}
                      style={{ accentColor: '#ec5b13', cursor: 'pointer' }}
                    />
                    <span>{opt}</span>
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
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
      (Array.isArray(filters.tarea) && filters.tarea.length > 0) ||
      (Array.isArray(filters.proyecto) && filters.proyecto.length > 0) ||
      (Array.isArray(filters.agrupador) && filters.agrupador.length > 0) ||
      (Array.isArray(filters.trabajador) && filters.trabajador.length > 0) ||
      (Array.isArray(filters.solicitante) && filters.solicitante.length > 0)
  )
}

function applyFilters(
  registros: RegistroDetalleItem[],
  filters: TareoDailyFilterState,
  excludeField?: keyof TareoDailyFilterState
) {
  const search = excludeField === 'search' ? '' : normalizeText(filters.search)

  return registros.filter((item) => {
    if (
      excludeField !== 'tarea' &&
      Array.isArray(filters.tarea) &&
      filters.tarea.length > 0 &&
      !filters.tarea.includes(item.tarea_nombre)
    ) {
      return false
    }

    if (
      excludeField !== 'proyecto' &&
      Array.isArray(filters.proyecto) &&
      filters.proyecto.length > 0 &&
      !filters.proyecto.includes(item.proyecto_nombre)
    ) {
      return false
    }

    if (
      excludeField !== 'agrupador' &&
      Array.isArray(filters.agrupador) &&
      filters.agrupador.length > 0 &&
      !filters.agrupador.includes(item.agrupador_nombre)
    ) {
      return false
    }

    if (
      excludeField !== 'trabajador' &&
      Array.isArray(filters.trabajador) &&
      filters.trabajador.length > 0 &&
      !filters.trabajador.includes(item.trabajador_nombre)
    ) {
      return false
    }

    if (
      excludeField !== 'solicitante' &&
      Array.isArray(filters.solicitante) &&
      filters.solicitante.length > 0 &&
      !filters.solicitante.includes(item.solicitante_nombre)
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
      tarea: [],
      proyecto: [],
      agrupador: [],
      trabajador: [],
      solicitante: []
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
          {filters.tarea.length > 0 && (
            <span className={styles.filterTag}>Tareas: {filters.tarea.join(', ')}</span>
          )}
          {filters.proyecto.length > 0 && (
            <span className={styles.filterTag}>Proyectos: {filters.proyecto.join(', ')}</span>
          )}
          {filters.agrupador.length > 0 && (
            <span className={styles.filterTag}>Agrupadores: {filters.agrupador.join(', ')}</span>
          )}
          {filters.trabajador.length > 0 && (
            <span className={styles.filterTag}>Trabajadores: {filters.trabajador.join(', ')}</span>
          )}
          {filters.solicitante.length > 0 && (
            <span className={styles.filterTag}>Solicitantes: {filters.solicitante.join(', ')}</span>
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
              <MultiSelectField
                label="Tarea"
                options={tareas}
                selected={filters.tarea}
                onChange={(val) => handleChange('tarea', val)}
                placeholderAll="Todas"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Proyecto</label>
              <MultiSelectField
                label="Proyecto"
                options={proyectos}
                selected={filters.proyecto}
                onChange={(val) => handleChange('proyecto', val)}
                placeholderAll="Todos"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Agrupador</label>
              <MultiSelectField
                label="Agrupador"
                options={agrupadores}
                selected={filters.agrupador}
                onChange={(val) => handleChange('agrupador', val)}
                placeholderAll="Todos"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Trabajador</label>
              <MultiSelectField
                label="Trabajador"
                options={trabajadores}
                selected={filters.trabajador}
                onChange={(val) => handleChange('trabajador', val)}
                placeholderAll="Todos"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Solicitante</label>
              <MultiSelectField
                label="Solicitante"
                options={solicitantes}
                selected={filters.solicitante}
                onChange={(val) => handleChange('solicitante', val)}
                placeholderAll="Todos"
              />
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