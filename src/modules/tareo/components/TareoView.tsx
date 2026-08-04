'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  fetchTareoCatalogsAction,
  getRegistroByIdAction,
  getResumenDiarioGeneralAction,
  getTareaByIdAction,
  listRegistrosByFechaAction,
  listTareasAction,
  saveRegistroAction,
  saveTareaAction,
  deleteRegistroAction,
  exportTareoAction,
  exportTareoConEquipoRecursoAction,
  exportTareoMultiMesAction,
  generatePublicLinkAction,
  getRegistrosByPeriodoAction
} from '../actions/tareo.action'
import type {
  RegistroDetalleItem,
  RegistroFormData,
  ResumenDiarioGeneralItem,
  TareaFormData,
  TareaPeriodoListItem,
  TareoCatalogs
} from '../interfaces/tareo.interfaces'
import styles from '../styles/tareo-view.module.css'
import RegistroTareoModal from './RegistroTareoModal'
import TareaModal from './TareaModal'
import TareoHeader from './TareoHeader'
import TareoDailyWidgets from './TareoDailyWidgets'
import TareoDailyTable from './TareoDailyTable'
import TareoDailyFilters, { type TareoDailyFilterState } from './TareoDailyFilters'

function getTodayValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function mapRegistroToFormData(registro: RegistroDetalleItem): RegistroFormData {
  return {
    id: registro.id,
    tarea_periodo_id: registro.tarea_periodo_id,
    fecha: registro.fecha,
    trabajador_id: registro.trabajador_id,
    horas: registro.horas,
    comentario: registro.comentario ?? ''
  }
}
function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function applyDailyFilters(
  registros: RegistroDetalleItem[],
  filters: TareoDailyFilterState
) {
  const search = normalizeText(filters.search)

  return registros.filter((item) => {
    if (
      Array.isArray(filters.tarea) &&
      filters.tarea.length > 0 &&
      !filters.tarea.includes(item.tarea_nombre)
    ) {
      return false
    }

    if (
      Array.isArray(filters.proyecto) &&
      filters.proyecto.length > 0 &&
      !filters.proyecto.includes(item.proyecto_nombre)
    ) {
      return false
    }

    if (
      Array.isArray(filters.agrupador) &&
      filters.agrupador.length > 0 &&
      !filters.agrupador.includes(item.agrupador_nombre)
    ) {
      return false
    }

    if (
      Array.isArray(filters.trabajador) &&
      filters.trabajador.length > 0 &&
      !filters.trabajador.includes(item.trabajador_nombre)
    ) {
      return false
    }

    if (
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
      String(item.horas_consumidas_periodo)
    ]

    return values.some((value) => normalizeText(value).includes(search))
  })
}

function mapTareaPeriodoToFormData(tarea: TareaPeriodoListItem): TareaFormData {
  return {
    id: tarea.tarea_periodo_id,
    periodo_id: tarea.periodo_id,
    nombre: tarea.tarea_nombre,
    proyecto_id: tarea.proyecto_id,
    team_id: tarea.team_id,
    solicitante_id: tarea.solicitante_id,
    estado_id: tarea.estado_id,
    horas_historicas_arrastre: tarea.horas_historicas_arrastre,
    horas_asignadas_periodo: tarea.horas_asignadas_periodo,
    comentario_periodo: tarea.comentario_periodo ?? '',
    comentario_dm: tarea.comentario_dm ?? '',
    activo: tarea.activo
  }
}

export default function TareoView() {
  const [catalogs, setCatalogs] = useState<TareoCatalogs | null>(null)
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(null)
  const [selectedFecha, setSelectedFecha] = useState<string>(getTodayValue())
  const [registros, setRegistros] = useState<RegistroDetalleItem[]>([])
  const [resumenGeneral, setResumenGeneral] = useState<ResumenDiarioGeneralItem[]>([])
  const [tareasPeriodo, setTareasPeriodo] = useState<TareaPeriodoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [registroModalOpen, setRegistroModalOpen] = useState(false)
  const [tareaModalOpen, setTareaModalOpen] = useState(false)
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroFormData | null>(null)
  const [selectedTarea, setSelectedTarea] = useState<TareaFormData | null>(null)
  const [dailyFilters, setDailyFilters] = useState<TareoDailyFilterState>({
    search: '',
    tarea: [],
    proyecto: [],
    agrupador: [],
    trabajador: [],
    solicitante: []
  })
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportCosto, setExportCosto] = useState('65')
  const [exportFilters, setExportFilters] = useState({ periodo_id: '', solicitante_id: '', trabajador_id: '', agrupador_id: '', proyecto_id: '', team_id: '' })
  // Tipo de reporte: 'standard' | 'equipo_recurso' | 'multi_mes'
  const [exportTipoReporte, setExportTipoReporte] = useState<'standard' | 'equipo_recurso' | 'multi_mes'>('standard')
  // Multi-mes: selección múltiple de períodos
  const [multiMesPeriodoIds, setMultiMesPeriodoIds] = useState<number[]>([])

  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkFilters, setLinkFilters] = useState({ periodo_id: '', costo_hora: '65', solicitante_id: '', trabajador_id: '', agrupador_id: '', proyecto_id: '', team_id: '' })
  const [generatedLinkData, setGeneratedLinkData] = useState<{ isOpen: boolean, link: string }>({ isOpen: false, link: '' })
  const [registrosExport, setRegistrosExport] = useState<RegistroDetalleItem[]>([])
  const [loadingExportData, setLoadingExportData] = useState(false)

  useEffect(() => {
    const fetchRegistros = async (pId: number) => {
      setLoadingExportData(true)
      const res = await getRegistrosByPeriodoAction(pId)
      if (res.success && res.data) {
        setRegistrosExport(res.data)
      } else {
        setRegistrosExport([])
      }
      setLoadingExportData(false)
    }

    if ((exportModalOpen && exportFilters.periodo_id) || (linkModalOpen && linkFilters.periodo_id)) {
      const activePeriodoId = exportModalOpen ? exportFilters.periodo_id : linkFilters.periodo_id;
      if (activePeriodoId) fetchRegistros(Number(activePeriodoId));
    }
  }, [exportModalOpen, linkModalOpen, exportFilters.periodo_id, linkFilters.periodo_id])

  const getDynamicOptions = (currentFilters: any) => {
    const filterBy = (excludeKey: string) => {
      return registrosExport.filter(r => {
        if (excludeKey !== 'agrupador_id' && currentFilters.agrupador_id && r.agrupador_id !== Number(currentFilters.agrupador_id)) return false;
        if (excludeKey !== 'proyecto_id' && currentFilters.proyecto_id && r.proyecto_id !== Number(currentFilters.proyecto_id)) return false;
        if (excludeKey !== 'solicitante_id' && currentFilters.solicitante_id && r.solicitante_id !== Number(currentFilters.solicitante_id)) return false;
        if (excludeKey !== 'trabajador_id' && currentFilters.trabajador_id && r.trabajador_id !== Number(currentFilters.trabajador_id)) return false;
        if (excludeKey !== 'team_id' && currentFilters.team_id && r.team_id !== Number(currentFilters.team_id)) return false;
        return true;
      })
    }

    const availableAgrupadoresIds = new Set(filterBy('agrupador_id').map(r => r.agrupador_id))
    const availableProyectosIds = new Set(filterBy('proyecto_id').map(r => r.proyecto_id))
    const availableSolicitantesIds = new Set(filterBy('solicitante_id').map(r => r.solicitante_id))
    const availableTrabajadoresIds = new Set(filterBy('trabajador_id').map(r => r.trabajador_id))
    const availableTeamsIds = new Set(filterBy('team_id').map(r => r.team_id))

    return {
      agrupadores: availableAgrupadoresIds.size > 0 ? catalogs?.agrupadores?.filter(a => availableAgrupadoresIds.has(a.id)) || [] : catalogs?.agrupadores || [],
      proyectos: availableProyectosIds.size > 0 ? catalogs?.proyectos?.filter(p => availableProyectosIds.has(p.id)) || [] : catalogs?.proyectos || [],
      solicitantes: availableSolicitantesIds.size > 0 ? catalogs?.solicitantes?.filter(s => availableSolicitantesIds.has(s.id)) || [] : catalogs?.solicitantes || [],
      trabajadores: availableTrabajadoresIds.size > 0 ? catalogs?.trabajadores?.filter(t => availableTrabajadoresIds.has(t.id)) || [] : catalogs?.trabajadores || [],
      teams: availableTeamsIds.size > 0 ? catalogs?.teams?.filter(t => availableTeamsIds.has(t.id)) || [] : catalogs?.teams || [],
    }
  }

  const exportOptions = getDynamicOptions(exportFilters)
  const linkOptions = getDynamicOptions(linkFilters)

  const loadCatalogs = async () => {
    setLoading(true)
    setError(null)

    const response = await fetchTareoCatalogsAction()

    if (!response.success || !response.data) {
      setError(response.error ?? 'No se pudieron cargar los catálogos')
      setLoading(false)
      return
    }

    setCatalogs(response.data)

    if (!selectedPeriodoId && response.data.periodos.length > 0) {
      setSelectedPeriodoId(response.data.periodos[0].id)
    }

    setLoading(false)
  }
  const [generatingLink, setGeneratingLink] = useState(false)
  const loadTareasPeriodo = async (periodoId?: number | null) => {
    const response = await listTareasAction(
      periodoId
        ? {
          periodo_id: periodoId
        }
        : undefined
    )

    if (!response.success) {
      setError(response.error ?? 'No se pudieron cargar las tareas')
      setTareasPeriodo([])
      return
    }

    setTareasPeriodo(response.data ?? [])
  }
  const handleGenerateLink = () => {
    if (!selectedPeriodoId) {
      setError('Selecciona un período antes de generar el enlace.')
      return
    }
    setLinkFilters(prev => ({ ...prev, costo_hora: '65', periodo_id: selectedPeriodoId.toString() }))
    setLinkModalOpen(true)
  }

  const confirmGenerateLink = async () => {
    setGeneratingLink(true)
    setError(null)

    const targetPeriodoId = linkFilters.periodo_id ? Number(linkFilters.periodo_id) : selectedPeriodoId!
    const response = await generatePublicLinkAction(
      targetPeriodoId,
      linkFilters.solicitante_id ? Number(linkFilters.solicitante_id) : undefined,
      linkFilters.trabajador_id ? Number(linkFilters.trabajador_id) : undefined,
      linkFilters.costo_hora ? Number(linkFilters.costo_hora) : undefined,
      linkFilters.agrupador_id ? Number(linkFilters.agrupador_id) : undefined,
      linkFilters.proyecto_id ? Number(linkFilters.proyecto_id) : undefined,
      linkFilters.team_id ? Number(linkFilters.team_id) : undefined
    )

    if (response.success && response.data) {
      const link = response.data

      // Intentar copiar al portapapeles automáticamente
      try {
        await navigator.clipboard.writeText(link)
      } catch (err) {
        // Ignoramos el error, el modal permitirá copiarlo
      }
      setGeneratedLinkData({ isOpen: true, link })
    } else {
      setError(response.error ?? 'Ocurrió un error al generar el enlace mágico.')
    }

    setGeneratingLink(false)
    setLinkModalOpen(false)
  }
  const loadData = async (fecha: string, periodoId?: number | null) => {
    setLoadingData(true)
    setError(null)

    const [registrosResponse, resumenResponse] = await Promise.all([
      listRegistrosByFechaAction(fecha),
      getResumenDiarioGeneralAction(periodoId ?? undefined)
    ])

    if (!registrosResponse.success) {
      setError(registrosResponse.error ?? 'No se pudieron cargar los registros')
      setRegistros([])
    } else {
      setRegistros(registrosResponse.data ?? [])
    }

    if (!resumenResponse.success) {
      setError(resumenResponse.error ?? 'No se pudo cargar el resumen general')
      setResumenGeneral([])
    } else {
      setResumenGeneral(resumenResponse.data ?? [])
    }

    await loadTareasPeriodo(periodoId)

    setLoadingData(false)
  }

  useEffect(() => {
    void loadCatalogs()
  }, [])

  useEffect(() => {
    if (!selectedFecha) {
      return
    }

    void loadData(selectedFecha, selectedPeriodoId)
  }, [selectedFecha, selectedPeriodoId])

  const resumenDia = useMemo(() => {
    return resumenGeneral.find((item) => item.fecha === selectedFecha) ?? null
  }, [resumenGeneral, selectedFecha])

  const registrosFiltrados = useMemo(() => {
    return applyDailyFilters(registros, dailyFilters)
  }, [registros, dailyFilters])

  const totalHorasDia = useMemo(() => {
    return registrosFiltrados.reduce((acc, item) => acc + Number(item.horas ?? 0), 0)
  }, [registrosFiltrados])

  const totalTrabajadoresDia = useMemo(() => {
    return new Set(registrosFiltrados.map((item) => item.trabajador_id)).size
  }, [registrosFiltrados])

  const totalRegistrosDia = registrosFiltrados.length

  const horasVisibles = totalHorasDia

  const totalAcumuladoMes = useMemo(() => {
    const hasFilter = Boolean(
      dailyFilters.search ||
        (Array.isArray(dailyFilters.tarea) && dailyFilters.tarea.length > 0) ||
        (Array.isArray(dailyFilters.proyecto) && dailyFilters.proyecto.length > 0) ||
        (Array.isArray(dailyFilters.agrupador) && dailyFilters.agrupador.length > 0) ||
        (Array.isArray(dailyFilters.trabajador) && dailyFilters.trabajador.length > 0) ||
        (Array.isArray(dailyFilters.solicitante) && dailyFilters.solicitante.length > 0)
    )

    if (!hasFilter) {
      return resumenGeneral.reduce((acc, item) => acc + Number(item.horas_dia ?? 0), 0)
    }

    const matchingTareas = tareasPeriodo.filter((t) => {
      if (
        Array.isArray(dailyFilters.tarea) &&
        dailyFilters.tarea.length > 0 &&
        !dailyFilters.tarea.includes(t.tarea_nombre)
      ) {
        return false
      }

      if (
        Array.isArray(dailyFilters.proyecto) &&
        dailyFilters.proyecto.length > 0 &&
        !dailyFilters.proyecto.includes(t.proyecto_nombre)
      ) {
        return false
      }

      if (
        Array.isArray(dailyFilters.agrupador) &&
        dailyFilters.agrupador.length > 0 &&
        !dailyFilters.agrupador.includes(t.agrupador_nombre)
      ) {
        return false
      }

      if (
        Array.isArray(dailyFilters.solicitante) &&
        dailyFilters.solicitante.length > 0 &&
        !dailyFilters.solicitante.includes(t.solicitante_nombre)
      ) {
        return false
      }

      if (dailyFilters.search) {
        const s = dailyFilters.search.toLowerCase()
        const text = `${t.tarea_nombre} ${t.proyecto_nombre} ${t.agrupador_nombre} ${t.solicitante_nombre}`.toLowerCase()
        if (!text.includes(s)) return false
      }

      return true
    })

    return matchingTareas.reduce((acc, item) => acc + Number(item.horas_consumidas_periodo ?? 0), 0)
  }, [dailyFilters, resumenGeneral, tareasPeriodo])

  const handleOpenNuevoRegistro = () => {
    setSelectedRegistro(null)
    setRegistroModalOpen(true)
  }

  const handleOpenNuevaTarea = () => {
    if (!selectedPeriodoId) {
      setError('Selecciona un período antes de crear una tarea')
      return
    }

    setSelectedTarea({
      periodo_id: selectedPeriodoId,
      nombre: '',
      proyecto_id: 0,
      team_id: null,
      solicitante_id: 0,
      estado_id: 0,
      horas_historicas_arrastre: 0,
      horas_asignadas_periodo: 0,
      comentario_periodo: '',
      comentario_dm: '',
      activo: true
    })
    setTareaModalOpen(true)
  }

  const handleEditRegistro = async (registro: RegistroDetalleItem) => {
    const response = await getRegistroByIdAction(registro.id)

    if (!response.success || !response.data) {
      setError(response.error ?? 'No se pudo cargar el registro')
      return
    }

    setSelectedRegistro(mapRegistroToFormData(response.data))
    setRegistroModalOpen(true)
  }

  const handleEditTareaPeriodo = async (tareaPeriodo: TareaPeriodoListItem) => {
    const response = await getTareaByIdAction(tareaPeriodo.tarea_periodo_id)

    if (!response.success || !response.data) {
      setError(response.error ?? 'No se pudo cargar la tarea')
      return
    }

    setSelectedTarea(mapTareaPeriodoToFormData(response.data))
    setTareaModalOpen(true)
  }

  const handleDeleteRegistro = async (registro: RegistroDetalleItem) => {
    const confirmed = window.confirm(
      `¿Deseas eliminar el registro de ${registro.trabajador_nombre} para la tarea "${registro.tarea_nombre}"?`
    )

    if (!confirmed) {
      return
    }

    const response = await deleteRegistroAction(registro.id)

    if (!response.success) {
      setError(response.error ?? 'No se pudo eliminar el registro')
      return
    }

    await loadData(selectedFecha, selectedPeriodoId)
  }

  const handleSaveRegistro = async (payload: RegistroFormData, isEditing: boolean) => {
    const response = await saveRegistroAction(payload, isEditing)

    if (!response.success) {
      throw new Error(response.error ?? 'No se pudo guardar el registro')
    }

    await loadData(selectedFecha, selectedPeriodoId)
  }

  const handleSaveTarea = async (payload: TareaFormData, isEditing: boolean) => {
    const response = await saveTareaAction(payload, isEditing)

    if (!response.success) {
      throw new Error(response.error ?? 'No se pudo guardar la tarea')
    }

    await loadTareasPeriodo(selectedPeriodoId)

    // Devuelve el ID para que TareaModal pueda guardar el registro rápido
    return response.data ?? undefined
  }
  const handleExportExcel = async () => {
    if (!selectedPeriodoId) {
      setError('Selecciona un período para exportar')
      return
    }
    setExportFilters(prev => ({ ...prev, periodo_id: selectedPeriodoId.toString() }))
    setExportTipoReporte('standard')
    setMultiMesPeriodoIds(selectedPeriodoId ? [selectedPeriodoId] : [])
    setExportModalOpen(true)
  }

  const triggerDownload = (base64: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const confirmExport = async () => {
    const costoHora = parseFloat(exportCosto)
    if (isNaN(costoHora) || costoHora <= 0) {
      setError('El costo por hora debe ser mayor a 0.')
      return
    }

    setExporting(true)
    setError(null)

    try {
      // ── Reporte Multi-Mes ──────────────────────────────────────────────────
      if (exportTipoReporte === 'multi_mes') {
        if (multiMesPeriodoIds.length === 0) {
          setError('Selecciona al menos un período para el reporte multi-mes.')
          setExporting(false)
          return
        }
        const response = await exportTareoMultiMesAction(multiMesPeriodoIds, costoHora)
        if (response.success && response.data) {
          triggerDownload(response.data.base64, response.data.fileName)
          setExportModalOpen(false)
        } else {
          setError(response.error ?? 'Error al generar el reporte multi-mes')
        }
        return
      }

      // ── Reporte Equipo + Recurso ──────────────────────────────────────────
      const targetPeriodoId = exportFilters.periodo_id ? Number(exportFilters.periodo_id) : selectedPeriodoId!

      if (exportTipoReporte === 'equipo_recurso') {
        const response = await exportTareoConEquipoRecursoAction(
          targetPeriodoId,
          costoHora,
          exportFilters.solicitante_id ? Number(exportFilters.solicitante_id) : undefined,
          exportFilters.trabajador_id ? Number(exportFilters.trabajador_id) : undefined,
          exportFilters.agrupador_id ? Number(exportFilters.agrupador_id) : undefined,
          exportFilters.proyecto_id ? Number(exportFilters.proyecto_id) : undefined,
          exportFilters.team_id ? Number(exportFilters.team_id) : undefined
        )
        if (response.success && response.data) {
          triggerDownload(response.data.base64, response.data.fileName)
          setExportModalOpen(false)
        } else {
          setError(response.error ?? 'Error al generar el reporte por equipo/recurso')
        }
        return
      }

      // ── Reporte Standard ──────────────────────────────────────────────────
      const response = await exportTareoAction(
        targetPeriodoId,
        costoHora,
        exportFilters.solicitante_id ? Number(exportFilters.solicitante_id) : undefined,
        exportFilters.trabajador_id ? Number(exportFilters.trabajador_id) : undefined,
        exportFilters.agrupador_id ? Number(exportFilters.agrupador_id) : undefined,
        exportFilters.proyecto_id ? Number(exportFilters.proyecto_id) : undefined,
        exportFilters.team_id ? Number(exportFilters.team_id) : undefined
      )

      if (response.success && response.data) {
        triggerDownload(response.data.base64, response.data.fileName)
        setExportModalOpen(false)
      } else {
        setError(response.error ?? 'Error al generar el reporte')
      }
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <span>Cargando información de tareo...</span>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {exportModalOpen && (() => {
        const TIPO_TABS = [
          { id: 'standard', label: 'Detalle', desc: 'Detalle de Tareas, Resumen, Equipo y Recurso' },
          { id: 'multi_mes', label: 'Graficas', desc: 'Totales y tendencia histórica con gráficas' },
        ] as const

        const tabStyle = (active: boolean): React.CSSProperties => ({
          flex: 1,
          padding: '10px 8px',
          borderRadius: '10px',
          border: active ? '2px solid #2563eb' : '1.5px solid #e5e7eb',
          background: active ? '#eff6ff' : '#f9fafb',
          color: active ? '#1d4ed8' : '#6b7280',
          fontWeight: active ? 700 : 500,
          fontSize: '13px',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.18s',
        })

        const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' }
        const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: '13px', color: '#374151' }
        const selectStyle: React.CSSProperties = { width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '14px' }

        const isMono = exportTipoReporte === 'standard' || exportTipoReporte === 'equipo_recurso'

        return (
          <div className={styles.modalOverlay}>
            <div className={styles.modalLarge}>

              {/* Título */}
              <h3 className={styles.title}>Exportar Reporte</h3>
              <p className={styles.subtitle} style={{ marginBottom: '20px' }}>Selecciona el tipo de reporte y configura los parámetros.</p>

              {/* Tabs de tipo de reporte */}
              <div className={styles.tabGroup}>
                {TIPO_TABS.map(tab => {
                  const isActive = exportTipoReporte === tab.id
                  return (
                    <button key={tab.id} type="button" className={isActive ? styles.tabBtnActive : styles.tabBtnInactive}
                      onClick={() => setExportTipoReporte(tab.id)}>
                      <div>{tab.label}</div>
                      <div className={styles.tabDesc}>{tab.desc}</div>
                    </button>
                  )
                })}
              </div>

              {/* Costo hora — siempre visible */}
              <div className={styles.field}>
                <label className={styles.label}>Costo por Hora (S/.)</label>
                <input type="number" value={exportCosto} onChange={e => setExportCosto(e.target.value)}
                  className={styles.input} style={{ width: '200px' }} />
              </div>

              {/* ── MULTI-MES ── */}
              {exportTipoReporte === 'multi_mes' && (
                <div>
                  <label className={styles.label} style={{ display: 'block', marginBottom: '10px' }}>
                    Períodos a incluir <span style={{ color: '#9ca3af', fontWeight: 400 }}>(selecciona uno o más)</span>
                  </label>
                  <div className={styles.gridThree}>
                    {catalogs?.periodos?.map(p => {
                      const label = `${String(p.mes).padStart(2, '0')}/${p.anio}${p.cerrado ? ' ✓' : ''}`
                      const checked = multiMesPeriodoIds.includes(p.id)
                      return (
                        <label key={p.id} className={checked ? styles.periodCheckboxLabelChecked : styles.periodCheckboxLabel}>
                          <input type="checkbox" checked={checked}
                            onChange={e => setMultiMesPeriodoIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                            className={styles.periodCheckbox} />
                          {label}
                        </label>
                      )
                    })}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#6b7280' }}>
                    {multiMesPeriodoIds.length === 0
                      ? '⚠️ Selecciona al menos un período'
                      : `✅ ${multiMesPeriodoIds.length} período(s) seleccionado(s)`}
                  </div>

                </div>
              )}

              {isMono && (
                <div className={styles.gridTwo}>
                  <div className={styles.field}>
                    <label className={styles.label}>Período</label>
                    <select value={exportFilters.periodo_id}
                      onChange={e => setExportFilters({ ...exportFilters, periodo_id: e.target.value })}
                      className={styles.input}>
                      {catalogs?.periodos?.map(p => (
                        <option key={p.id} value={p.id}>{String(p.mes).padStart(2, '0')}/{p.anio}{p.cerrado ? ' · Cerrado' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Proyecto <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Opcional)</span></label>
                    <select value={exportFilters.proyecto_id} disabled={loadingExportData}
                      onChange={e => setExportFilters({ ...exportFilters, proyecto_id: e.target.value })}
                      className={styles.input}>
                      <option value="">Todos los proyectos</option>
                      {exportOptions.proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Agrupador <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Opcional)</span></label>
                    <select value={exportFilters.agrupador_id} disabled={loadingExportData}
                      onChange={e => setExportFilters({ ...exportFilters, agrupador_id: e.target.value })}
                      className={styles.input}>
                      <option value="">Todos los agrupadores</option>
                      {exportOptions.agrupadores.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Solicitante <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Opcional)</span></label>
                    <select value={exportFilters.solicitante_id} disabled={loadingExportData}
                      onChange={e => setExportFilters({ ...exportFilters, solicitante_id: e.target.value })}
                      className={styles.input}>
                      <option value="">Todos los solicitantes</option>
                      {exportOptions.solicitantes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Equipo <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Opcional)</span></label>
                    <select value={exportFilters.team_id} disabled={loadingExportData}
                      onChange={e => setExportFilters({ ...exportFilters, team_id: e.target.value })}
                      className={styles.input}>
                      <option value="">Todos los equipos</option>
                      {exportOptions.teams.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Recurso <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Opcional)</span></label>
                    <select value={exportFilters.trabajador_id} disabled={loadingExportData}
                      onChange={e => setExportFilters({ ...exportFilters, trabajador_id: e.target.value })}
                      className={styles.input}>
                      <option value="">Todos los recursos</option>
                      {exportOptions.trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className={styles.actions} style={{ justifyContent: 'flex-end', marginTop: '28px' }}>
                <button type="button" className={styles.secondaryButton} onClick={() => setExportModalOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className={styles.primaryButton} onClick={confirmExport}
                  disabled={exporting || (exportTipoReporte === 'multi_mes' && multiMesPeriodoIds.length === 0)}>
                  {exporting ? 'Generando...' : ' Descargar Excel'}
                </button>
              </div>

            </div>
          </div>
        )
      })()}


      {linkModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalMedium}>
            <h3 className={styles.title}>Generar Link de Reporte</h3>
            <p className={styles.subtitle} style={{ marginBottom: '24px' }}>
              Seleccione los filtros para el reporte externo interactivo si lo desea.
            </p>

            <div className={styles.gridTwo} style={{ marginBottom: '24px' }}>
              <div className={styles.field}>
                <label className={styles.label}>Costo por Hora (S/.)</label>
                <input
                  type="number"
                  value={linkFilters.costo_hora}
                  onChange={(e) => setLinkFilters({ ...linkFilters, costo_hora: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Período</label>
                <select
                  value={linkFilters.periodo_id}
                  onChange={(e) => setLinkFilters({ ...linkFilters, periodo_id: e.target.value })}
                  className={styles.input}
                >
                  {catalogs?.periodos?.map((p) => {
                    const month = `${p.mes}`.padStart(2, '0')
                    const label = `${p.anio}-${month}${p.cerrado ? ' · Cerrado' : ''}`
                    return (
                      <option key={p.id} value={p.id}>{label}</option>
                    )
                  })}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Proyecto (Opcional)</label>
                <select
                  value={linkFilters.proyecto_id}
                  onChange={(e) => setLinkFilters({ ...linkFilters, proyecto_id: e.target.value })}
                  className={styles.input}
                  disabled={loadingExportData}
                >
                  <option value="">Todos los proyectos</option>
                  {linkOptions.proyectos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Agrupador (Opcional)</label>
                <select
                  value={linkFilters.agrupador_id}
                  onChange={(e) => setLinkFilters({ ...linkFilters, agrupador_id: e.target.value })}
                  className={styles.input}
                  disabled={loadingExportData}
                >
                  <option value="">Todos los agrupadores</option>
                  {linkOptions.agrupadores.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Solicitante (Opcional)</label>
                <select
                  value={linkFilters.solicitante_id}
                  onChange={(e) => setLinkFilters({ ...linkFilters, solicitante_id: e.target.value })}
                  className={styles.input}
                  disabled={loadingExportData}
                >
                  <option value="">Todos los solicitantes</option>
                  {linkOptions.solicitantes.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Equipo (Opcional)</label>
                <select
                  value={linkFilters.team_id}
                  onChange={(e) => setLinkFilters({ ...linkFilters, team_id: e.target.value })}
                  className={styles.input}
                  disabled={loadingExportData}
                >
                  <option value="">Todos los equipos</option>
                  {linkOptions.teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.label}>Recurso (Opcional)</label>
                <select
                  value={linkFilters.trabajador_id}
                  onChange={(e) => setLinkFilters({ ...linkFilters, trabajador_id: e.target.value })}
                  className={styles.input}
                  disabled={loadingExportData}
                >
                  <option value="">Todos los recursos</option>
                  {linkOptions.trabajadores.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
              <button type="button" className={styles.secondaryButton} onClick={() => setLinkModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.primaryButton} onClick={confirmGenerateLink} disabled={generatingLink}>
                {generatingLink ? 'Generando...' : 'Crear Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {generatedLinkData.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalSuccess}>
            <div className={styles.iconSuccessCircle}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 className={styles.title} style={{ marginBottom: '12px' }}>¡Enlace Generado!</h3>
            <p className={styles.subtitle} style={{ marginBottom: '24px' }}>
              El enlace mágico ha sido generado y copiado al portapapeles. Ya puedes compartirlo con el cliente.
            </p>

            <div className={styles.linkInputGroup}>
              <input
                readOnly
                value={generatedLinkData.link}
                className={styles.linkInput}
              />
            </div>

            <div className={styles.actions} style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(generatedLinkData.link);
                    alert("Copiado nuevamente");
                  } catch (e) { }
                }}
              >
                Copiar Enlace
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                style={{ padding: '0 24px' }}
                onClick={() => setGeneratedLinkData({ isOpen: false, link: '' })}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      <TareoHeader
        periodos={catalogs?.periodos ?? []}
        selectedPeriodoId={selectedPeriodoId}
        selectedFecha={selectedFecha}
        onPeriodoChange={setSelectedPeriodoId}
        onFechaChange={setSelectedFecha}
        onNuevoRegistro={handleOpenNuevoRegistro}
        onNuevaTarea={handleOpenNuevaTarea}
        onExport={handleExportExcel}
        isExporting={exporting}
        onGenerateLink={handleGenerateLink}
        isGeneratingLink={generatingLink}
      />

      {error && <div className={styles.errorBox}>{error}</div>}

      <TareoDailyWidgets
        totalHorasDia={totalHorasDia}
        totalAcumuladoMes={totalAcumuladoMes}
        totalRegistrosDia={totalRegistrosDia}
        totalTrabajadoresDia={totalTrabajadoresDia}
      />
      <TareoDailyFilters
        filters={dailyFilters}
        onChange={setDailyFilters}
        registros={registros}
        totalVisible={registrosFiltrados.length}
        horasVisibles={horasVisibles}
      />

      <TareoDailyTable
        registros={registrosFiltrados}
        loading={loadingData}
        onEdit={handleEditRegistro}
        onDelete={handleDeleteRegistro}
        onEditTask={handleEditTareaPeriodo}
      />

      <RegistroTareoModal
        isOpen={registroModalOpen}
        onClose={() => {
          setRegistroModalOpen(false)
          setSelectedRegistro(null)
        }}
        onSave={handleSaveRegistro}
        registro={selectedRegistro}
        tareasPeriodo={tareasPeriodo}
        trabajadores={catalogs?.trabajadores ?? []}
        fechaInicial={selectedFecha}
      />

      <TareaModal
        isOpen={tareaModalOpen}
        onClose={() => {
          setTareaModalOpen(false)
          setSelectedTarea(null)
          void loadData(selectedFecha, selectedPeriodoId)
        }}
        onSave={handleSaveTarea}
        tarea={selectedTarea}
        periodos={catalogs?.periodos ?? []}
        proyectos={catalogs?.proyectos ?? []}
        agrupadores={catalogs?.agrupadores ?? []}
        solicitantes={catalogs?.solicitantes ?? []}
        teams={catalogs?.teams ?? []}
        estadosTarea={catalogs?.estadosTarea ?? []}
        trabajadores={catalogs?.trabajadores ?? []}
        onCatalogsChange={loadCatalogs}
        initialFecha={selectedFecha}
      />
    </div>
  )

}