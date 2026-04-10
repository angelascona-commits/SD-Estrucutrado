'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Search,
  Filter,
  XCircle,
  Calendar,
  User,
  Layout,
  Activity,
  Trash2,
  Plus,
  BarChart3,
} from 'lucide-react'
import styles from '@/app/(dashboard)/service-desk/page.module.css'
import { TicketFilterCatalogs } from '@/modules/service-desk/interfaces/ticket.interfaces'
import type {
  ReportGroupBy,
  ReportPreset,
} from '@/modules/service-desk/interfaces/report.interfaces'

interface Props {
  catalogs: TicketFilterCatalogs
  mode?: 'dashboard' | 'reportes'
}

const AVAILABLE_FILTERS = [
  { id: 'fAsig', label: 'F. Asignación', icon: <Calendar size={14} /> },
  { id: 'estado', label: 'Estado Aplicación', icon: <Activity size={14} /> },
  { id: 'app', label: 'Aplicación', icon: <Layout size={14} /> },
  { id: 'designado', label: 'Designado', icon: <User size={14} /> },
  { id: 'tAsig', label: 't.Asignación', icon: <Filter size={14} /> },
  { id: 'res', label: 'Resolución', icon: <Filter size={14} /> },
]

const REPORT_PRESETS: { value: ReportPreset; label: string }[] = [
  { value: 'custom', label: 'Rango manual' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'last_week', label: 'Semana pasada' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
]

const REPORT_GROUPS: { value: ReportGroupBy; label: string }[] = [
  { value: 'day', label: 'Diario' },
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensual' },
]

export function TicketFiltersBar({ catalogs, mode = 'dashboard' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const isReportsMode = mode === 'reportes'

  const [visibleFilters, setVisibleFilters] = useState<string[]>(() => {
    const active: string[] = []
    if (searchParams.get('fStart') || searchParams.get('fEnd')) active.push('fAsig')
    if (searchParams.get('estado')) active.push('estado')
    if (searchParams.get('aplicacion')) active.push('app')
    if (searchParams.get('designado')) active.push('designado')
    if (searchParams.get('tAsigMin') || searchParams.get('tAsigMax')) active.push('tAsig')
    if (searchParams.get('resMin') || searchParams.get('resMax')) active.push('res')
    return active
  })

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')

  const updateFilters = useCallback(
    (key: string, value: string | null, options?: { forceCustomPreset?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value) params.set(key, value)
      else params.delete(key)

      if (isReportsMode) {
        params.set('view', 'reportes')
        if (options?.forceCustomPreset) {
          params.set('preset', 'custom')
        }
      }

      params.set('page', '1')

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [isReportsMode, pathname, router, searchParams]
  )

  const updateMultipleFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })

      if (isReportsMode) {
        params.set('view', 'reportes')
      }

      params.set('page', '1')

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [isReportsMode, pathname, router, searchParams]
  )

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm !== (searchParams.get('q') || '')) {
        updateFilters('q', searchTerm)
      }
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, updateFilters, searchParams])

  const addFilter = (filterId: string) => {
    if (filterId && !visibleFilters.includes(filterId)) {
      setVisibleFilters([...visibleFilters, filterId])
    }
  }

  const removeFilter = (filterId: string) => {
    setVisibleFilters(visibleFilters.filter((id) => id !== filterId))

    if (filterId === 'fAsig') {
      updateMultipleFilters({
        fStart: null,
        fEnd: null,
        ...(isReportsMode ? { preset: 'custom' } : {}),
      })
    }

    if (filterId === 'estado') updateFilters('estado', null)
    if (filterId === 'app') updateFilters('aplicacion', null)
    if (filterId === 'designado') updateFilters('designado', null)

    if (filterId === 'tAsig') {
      updateMultipleFilters({ tAsigMin: null, tAsigMax: null })
    }

    if (filterId === 'res') {
      updateMultipleFilters({ resMin: null, resMax: null })
    }
  }

  const clearAll = () => {
    setSearchTerm('')
    setVisibleFilters([])

    const params = new URLSearchParams()
    if (isReportsMode) {
      params.set('view', 'reportes')
      params.set('preset', 'custom')
      params.set('groupBy', 'week')
    }

    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {
        scroll: false,
      })
    })
  }

  const selectedPreset = (searchParams.get('preset') as ReportPreset) || 'custom'
  const selectedGroupBy = (searchParams.get('groupBy') as ReportGroupBy) || 'week'

  const handlePresetChange = (preset: ReportPreset) => {
    updateMultipleFilters({
      preset,
      ...(preset !== 'custom' ? { fStart: null, fEnd: null } : {}),
    })
  }

  const handleGroupByChange = (groupBy: ReportGroupBy) => {
    updateFilters('groupBy', groupBy)
  }

  return (
    <div className={styles.dynamicFiltersContainer} style={{ opacity: isPending ? 0.7 : 1 }}>
      <div className={styles.permanentFilters}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={18} />
          <input
            type="text"
            className={styles.mainSearchInput}
            placeholder="Buscar por Ticket ID o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filterSelectorWrapper}>
          <div className={styles.filterSelectorInner}>
            <Plus className={styles.filterIcon} size={16} />
            <select
              className={styles.addFilterSelect}
              value=""
              onChange={(e) => addFilter(e.target.value)}
            >
              <option value="" disabled>
                + Agregar filtro...
              </option>
              {AVAILABLE_FILTERS.map((f) => (
                <option key={f.id} value={f.id} disabled={visibleFilters.includes(f.id)}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className={styles.btnClearFilters} onClick={clearAll}>
          <XCircle size={16} style={{ marginRight: '8px' }} />
          Limpiar Todo
        </button>
      </div>

      {isReportsMode && (
        <div className={styles.activeFiltersArea}>
          <div className={styles.activeFilterBox}>
            <div className={styles.filterBoxHeader}>
              <span>
                <Calendar size={12} /> Período
              </span>
            </div>
            <select
              className={styles.filterInputSm}
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value as ReportPreset)}
            >
              {REPORT_PRESETS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.activeFilterBox}>
            <div className={styles.filterBoxHeader}>
              <span>
                <BarChart3 size={12} /> Agrupar
              </span>
            </div>
            <select
              className={styles.filterInputSm}
              value={selectedGroupBy}
              onChange={(e) => handleGroupByChange(e.target.value as ReportGroupBy)}
            >
              {REPORT_GROUPS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {visibleFilters.length > 0 && (
        <div className={styles.activeFiltersArea}>
          {visibleFilters.includes('fAsig') && (
            <div className={styles.activeFilterBox}>
              <div className={styles.filterBoxHeader}>
                <span>
                  <Calendar size={12} /> F. Asignación
                </span>
                <button className={styles.removeFilterBtn} onClick={() => removeFilter('fAsig')}>
                  <Trash2 size={12} />
                </button>
              </div>
              <div className={styles.rangeGroupInputs}>
                <input
                  type="date"
                  className={styles.filterInputSm}
                  value={searchParams.get('fStart') || ''}
                  onChange={(e) => updateFilters('fStart', e.target.value, { forceCustomPreset: true })}
                />
                <span>-</span>
                <input
                  type="date"
                  className={styles.filterInputSm}
                  value={searchParams.get('fEnd') || ''}
                  onChange={(e) => updateFilters('fEnd', e.target.value, { forceCustomPreset: true })}
                />
              </div>
            </div>
          )}

          {visibleFilters.includes('estado') && (
            <div className={styles.activeFilterBox}>
              <div className={styles.filterBoxHeader}>
                <span>
                  <Activity size={12} /> Estado
                </span>
                <button className={styles.removeFilterBtn} onClick={() => removeFilter('estado')}>
                  <Trash2 size={12} />
                </button>
              </div>
              <select
                className={styles.filterInputSm}
                value={searchParams.get('estado') || ''}
                onChange={(e) => updateFilters('estado', e.target.value)}
              >
                <option value="">Todos</option>
                {catalogs.estados.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          )}

          {visibleFilters.includes('app') && (
            <div className={styles.activeFilterBox}>
              <div className={styles.filterBoxHeader}>
                <span>
                  <Layout size={12} /> Aplicación
                </span>
                <button className={styles.removeFilterBtn} onClick={() => removeFilter('app')}>
                  <Trash2 size={12} />
                </button>
              </div>
              <select
                className={styles.filterInputSm}
                value={searchParams.get('aplicacion') || ''}
                onChange={(e) => updateFilters('aplicacion', e.target.value)}
              >
                <option value="">Todas</option>
                {catalogs.aplicaciones.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}

          {visibleFilters.includes('designado') && (
            <div className={styles.activeFilterBox}>
              <div className={styles.filterBoxHeader}>
                <span>
                  <User size={12} /> Designado
                </span>
                <button
                  className={styles.removeFilterBtn}
                  onClick={() => removeFilter('designado')}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <select
                className={styles.filterInputSm}
                value={searchParams.get('designado') || ''}
                onChange={(e) => updateFilters('designado', e.target.value)}
              >
                <option value="">Todos</option>
                {catalogs.responsables.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {visibleFilters.includes('tAsig') && (
            <div className={styles.activeFilterBox}>
              <div className={styles.filterBoxHeader}>
                <span>t. Asignación (Días)</span>
                <button className={styles.removeFilterBtn} onClick={() => removeFilter('tAsig')}>
                  <Trash2 size={12} />
                </button>
              </div>
              <div className={styles.rangeGroupInputs}>
                <input
                  type="number"
                  placeholder="Min"
                  className={styles.filterInputSm}
                  value={searchParams.get('tAsigMin') || ''}
                  onChange={(e) => updateFilters('tAsigMin', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={styles.filterInputSm}
                  value={searchParams.get('tAsigMax') || ''}
                  onChange={(e) => updateFilters('tAsigMax', e.target.value)}
                />
              </div>
            </div>
          )}

          {visibleFilters.includes('res') && (
            <div className={styles.activeFilterBox}>
              <div className={styles.filterBoxHeader}>
                <span>Resolución (Días)</span>
                <button className={styles.removeFilterBtn} onClick={() => removeFilter('res')}>
                  <Trash2 size={12} />
                </button>
              </div>
              <div className={styles.rangeGroupInputs}>
                <input
                  type="number"
                  placeholder="Min"
                  className={styles.filterInputSm}
                  value={searchParams.get('resMin') || ''}
                  onChange={(e) => updateFilters('resMin', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={styles.filterInputSm}
                  value={searchParams.get('resMax') || ''}
                  onChange={(e) => updateFilters('resMax', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}