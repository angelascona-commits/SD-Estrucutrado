'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Swal from 'sweetalert2'
import {
  FileSpreadsheet,
  Save,
  Download,
  Search,
  X,
  Filter,
  RotateCcw,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { saveExternalCommentsAction, exportPublicReportExcelAction } from '../actions/tareo.action'
import styles from '../styles/public-report.module.css'

interface Props {
  token: string
  registros: any[]
  tareasPeriodo?: any[]
  feedback: any[]
  linkId: string
  costoHora?: number
  periodo?: {
    id: number
    anio: number
    mes: number
    fecha_inicio?: string
    fecha_fin?: string
    cerrado?: boolean
  } | null
  periodos?: Array<{ id: number; anio: number; mes: number; cerrado: boolean }>
  agrupadores?: Array<{ id: number; nombre: string; area?: { nombre: string } }>
  initialFilters?: {
    solicitanteId?: number
    trabajadorId?: number
    agrupadorId?: number
    proyectoId?: number
    teamId?: number
    duracionFiltro?: string
    tareaId?: number
  }
}

type ComentarioEstadoFiltro = 'todos' | 'con_ps' | 'con_dm' | 'pendientes_dm' | 'sin_comentarios'

export default function PublicReportTable({
  token,
  registros,
  feedback,
  linkId,
  costoHora = 65,
  periodo,
  initialFilters = {}
}: Props) {
  const [saving, setSaving] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({})

  // Ocultar cualquier token o id en la barra de direcciones y mostrar únicamente /reporte/mes-anio
  useEffect(() => {
    if (typeof window !== 'undefined' && periodo?.mes && periodo?.anio) {
      const MESES_NOMBRES = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ]
      const mesNombre = MESES_NOMBRES[periodo.mes - 1] || 'periodo'
      const slug = `${mesNombre}-${periodo.anio}`
      const currentParams = new URLSearchParams(window.location.search)
      currentParams.delete('id')
      currentParams.delete('token')
      currentParams.delete('ref')
      currentParams.delete('doc')
      currentParams.delete('costo')
      const qs = currentParams.toString()
      const newPath = `/reporte/${slug}${qs ? `?${qs}` : ''}`
      if (window.location.pathname + window.location.search !== newPath) {
        window.history.replaceState(null, '', newPath)
      }
    }
  }, [periodo])

  // ─── 1. ESTADOS DE FILTROS ───────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedComentarioEstado, setSelectedComentarioEstado] = useState<ComentarioEstadoFiltro>('todos')
  const [selectedDuracion, setSelectedDuracion] = useState<'todas' | 'mas_50h' | 'hasta_50h'>(
    (initialFilters.duracionFiltro as any) || 'todas'
  )
  const [selectedPry, setSelectedPry] = useState(
    initialFilters.proyectoId
      ? registros.find((r) => r.proyecto_id === initialFilters.proyectoId)?.proyecto_nombre || ''
      : ''
  )
  const [selectedSolicitante, setSelectedSolicitante] = useState(
    initialFilters.solicitanteId
      ? registros.find((r) => r.solicitante_id === initialFilters.solicitanteId)?.solicitante_nombre || ''
      : ''
  )
  const [selectedTeam, setSelectedTeam] = useState(
    initialFilters.teamId
      ? registros.find((r) => r.team_id === initialFilters.teamId)?.team_nombre || ''
      : ''
  )
  const [selectedAgrupador, setSelectedAgrupador] = useState(
    initialFilters.agrupadorId
      ? registros.find((r) => r.agrupador_id === initialFilters.agrupadorId)?.agrupador_nombre || ''
      : ''
  )

  // ─── 2. COMENTARIOS PROTECTA (PS) Y DEV (DM) ─────────────────────────────
  const [comentariosPS, setComentariosPS] = useState<{
    tareas: Record<number, string>
    registros: Record<number, string>
  }>(() => {
    const state = { tareas: {} as Record<number, string>, registros: {} as Record<number, string> }

    // Fallback con datos base de tareas y registros
    registros.forEach((r) => {
      if (r.tarea_periodo_id && r.comentario_periodo && !state.tareas[r.tarea_periodo_id]) {
        state.tareas[r.tarea_periodo_id] = r.comentario_periodo
      }
      if (r.id && r.comentario && !state.registros[r.id]) {
        state.registros[r.id] = r.comentario
      }
    })

    // Feedback externo (máxima prioridad)
    feedback.forEach((f) => {
      if (f.referencia_tipo === 'TAREA' && f.comentario_protecta !== undefined && f.comentario_protecta !== null) {
        state.tareas[f.referencia_id] = f.comentario_protecta
      }
      if (f.referencia_tipo === 'REGISTRO' && f.comentario_protecta !== undefined && f.comentario_protecta !== null) {
        state.registros[f.referencia_id] = f.comentario_protecta
      }
    })
    return state
  })

  const [comentariosDM, setComentariosDM] = useState<{
    tareas: Record<number, string>
    registros: Record<number, string>
  }>(() => {
    const state = { tareas: {} as Record<number, string>, registros: {} as Record<number, string> }

    // Fallback con datos base de tareas
    registros.forEach((r) => {
      if (r.tarea_periodo_id && r.comentario_dm && !state.tareas[r.tarea_periodo_id]) {
        state.tareas[r.tarea_periodo_id] = r.comentario_dm
      }
    })

    // Feedback externo (máxima prioridad)
    feedback.forEach((f) => {
      if (f.referencia_tipo === 'TAREA' && f.comentario_dev !== undefined && f.comentario_dev !== null) {
        state.tareas[f.referencia_id] = f.comentario_dev
      }
      if (f.referencia_tipo === 'REGISTRO' && f.comentario_dev !== undefined && f.comentario_dev !== null) {
        state.registros[f.referencia_id] = f.comentario_dev
      }
    })
    return state
  })

  const [savedHash, setSavedHash] = useState<Record<string, { ps: string; dm: string }>>(() => {
    const map: Record<string, { ps: string; dm: string }> = {}

    registros.forEach((r) => {
      if (r.tarea_periodo_id && !map[`TAREA-${r.tarea_periodo_id}`]) {
        map[`TAREA-${r.tarea_periodo_id}`] = {
          ps: r.comentario_periodo || '',
          dm: r.comentario_dm || ''
        }
      }
      if (r.id && !map[`REGISTRO-${r.id}`]) {
        map[`REGISTRO-${r.id}`] = {
          ps: r.comentario || '',
          dm: ''
        }
      }
    })

    feedback.forEach((f) => {
      const key = `${f.referencia_tipo}-${f.referencia_id}`
      map[key] = {
        ps: f.comentario_protecta !== undefined && f.comentario_protecta !== null ? f.comentario_protecta : (map[key]?.ps || ''),
        dm: f.comentario_dev !== undefined && f.comentario_dev !== null ? f.comentario_dev : (map[key]?.dm || '')
      }
    })
    return map
  })

  const pendingChangesCount = useMemo(() => {
    let count = 0
    Object.entries(comentariosPS.tareas).forEach(([id, txt]) => {
      if ((txt || '') !== (savedHash[`TAREA-${id}`]?.ps || '')) count++
    })
    Object.entries(comentariosPS.registros).forEach(([id, txt]) => {
      if ((txt || '') !== (savedHash[`REGISTRO-${id}`]?.ps || '')) count++
    })
    Object.entries(comentariosDM.tareas).forEach(([id, txt]) => {
      if ((txt || '') !== (savedHash[`TAREA-${id}`]?.dm || '')) count++
    })
    Object.entries(comentariosDM.registros).forEach(([id, txt]) => {
      if ((txt || '') !== (savedHash[`REGISTRO-${id}`]?.dm || '')) count++
    })
    return count
  }, [comentariosPS, comentariosDM, savedHash])

  // ─── 3. OPCIONES DE FILTROS ──────────────────────────────────────────────
  const opciones = useMemo(() => {
    const pry = new Set<string>()
    const sol = new Set<string>()
    const tea = new Set<string>()
    const agr = new Set<string>()

    registros.forEach((r) => {
      if (r.proyecto_nombre) pry.add(r.proyecto_nombre)
      if (r.solicitante_nombre) sol.add(r.solicitante_nombre)
      if (r.team_nombre) tea.add(r.team_nombre)
      if (r.agrupador_nombre) agr.add(r.agrupador_nombre)
    })

    return {
      proyectos: Array.from(pry).sort(),
      solicitantes: Array.from(sol).sort(),
      teams: Array.from(tea).sort(),
      agrupadores: Array.from(agr).sort()
    }
  }, [registros])

  // ─── 4. LÓGICA DE FILTRADO Y AGRUPACIÓN POR TAREA ────────────────────────
  const { filasExcel, tareasResumen, countsEstadoComentarios, totalTareasBase, totalHorasBase } = useMemo(() => {
    const grupos: Record<number, any> = {}

    registros.forEach((reg) => {
      const tId = reg.tarea_periodo_id
      if (!grupos[tId]) {
        const agName = reg.agrupador_nombre || ''
        const esAgil =
          reg.es_agil === true ||
          /ágil|agil|ongoing|mejora|evolutivo/i.test(agName) ||
          /ágil|agil|ongoing/i.test(reg.tarea_nombre || '')

        grupos[tId] = {
          esTarea: true,
          tarea_periodo_id: tId,
          tarea_nombre: reg.tarea_nombre,
          team_nombre: reg.team_nombre,
          solicitante_nombre: reg.solicitante_nombre,
          proyecto_nombre: reg.proyecto_nombre,
          agrupador_nombre: reg.agrupador_nombre,
          totalHoras: 0,
          esAgil,
          detalle: []
        }
      }
      grupos[tId].totalHoras += Number(reg.horas) || 0
      grupos[tId].detalle.push({
        esTarea: false,
        id: reg.id,
        tarea_periodo_id: tId,
        tarea_nombre: reg.tarea_nombre,
        descripcion: reg.descripcion,
        fecha: reg.fecha,
        horas: reg.horas,
        trabajador_nombre: reg.trabajador_nombre,
        team_nombre: reg.team_nombre,
        solicitante_nombre: reg.solicitante_nombre,
        proyecto_nombre: reg.proyecto_nombre,
        agrupador_nombre: reg.agrupador_nombre
      })
    })

    const todosGrupos = Object.values(grupos)
    const totalTareasBase = todosGrupos.length
    const totalHorasBase = todosGrupos.reduce((acc, g) => acc + g.totalHoras, 0)

    // Contadores para las pestañas de comentarios
    const countsEstado = {
      todos: totalTareasBase,
      con_ps: 0,
      con_dm: 0,
      pendientes_dm: 0,
      sin_comentarios: 0
    }

    todosGrupos.forEach((g: any) => {
      const taskPS = Boolean((comentariosPS.tareas[g.tarea_periodo_id] || '').trim())
      const taskDM = Boolean((comentariosDM.tareas[g.tarea_periodo_id] || '').trim())
      const anyDetPS = g.detalle.some((d: any) => Boolean((comentariosPS.registros[d.id] || '').trim()))
      const anyDetDM = g.detalle.some((d: any) => Boolean((comentariosDM.registros[d.id] || '').trim()))

      const hasPS = taskPS || anyDetPS
      const hasDM = taskDM || anyDetDM

      if (hasPS) countsEstado.con_ps++
      if (hasDM) countsEstado.con_dm++
      if (hasPS && !hasDM) countsEstado.pendientes_dm++
      if (!hasPS && !hasDM) countsEstado.sin_comentarios++
    })

    // Aplicar filtros
    const searchLower = searchTerm.toLowerCase().trim()

    const gruposFiltrados = todosGrupos.filter((g: any) => {
      if (selectedPry && g.proyecto_nombre !== selectedPry) return false
      if (selectedSolicitante && g.solicitante_nombre !== selectedSolicitante) return false
      if (selectedTeam && g.team_nombre !== selectedTeam) return false
      if (selectedAgrupador && g.agrupador_nombre !== selectedAgrupador) return false

      if (selectedDuracion === 'mas_50h' && g.totalHoras <= 50) return false
      if (selectedDuracion === 'hasta_50h' && g.totalHoras > 50) return false

      // Filtro por Estado de Comentarios
      if (selectedComentarioEstado !== 'todos') {
        const taskPS = Boolean((comentariosPS.tareas[g.tarea_periodo_id] || '').trim())
        const taskDM = Boolean((comentariosDM.tareas[g.tarea_periodo_id] || '').trim())
        const anyDetPS = g.detalle.some((d: any) => Boolean((comentariosPS.registros[d.id] || '').trim()))
        const anyDetDM = g.detalle.some((d: any) => Boolean((comentariosDM.registros[d.id] || '').trim()))

        const hasPS = taskPS || anyDetPS
        const hasDM = taskDM || anyDetDM

        if (selectedComentarioEstado === 'con_ps' && !hasPS) return false
        if (selectedComentarioEstado === 'con_dm' && !hasDM) return false
        if (selectedComentarioEstado === 'pendientes_dm' && !(hasPS && !hasDM)) return false
        if (selectedComentarioEstado === 'sin_comentarios' && (hasPS || hasDM)) return false
      }

      if (searchLower) {
        const matchTarea = g.tarea_nombre?.toLowerCase().includes(searchLower)
        const matchPry = g.proyecto_nombre?.toLowerCase().includes(searchLower)
        const matchTeam = g.team_nombre?.toLowerCase().includes(searchLower)
        const matchSol = g.solicitante_nombre?.toLowerCase().includes(searchLower)
        const matchAgr = g.agrupador_nombre?.toLowerCase().includes(searchLower)
        const matchDet = g.detalle.some(
          (d: any) =>
            d.descripcion?.toLowerCase().includes(searchLower) ||
            d.trabajador_nombre?.toLowerCase().includes(searchLower)
        )
        if (!matchTarea && !matchPry && !matchTeam && !matchSol && !matchAgr && !matchDet) return false
      }

      return true
    })

    // Lista plana para la tabla de detalle
    const listaPlana: any[] = []
    gruposFiltrados.forEach((g: any) => {
      listaPlana.push(g)
      const isExpanded = expandedTasks[g.tarea_periodo_id] !== false
      if (isExpanded) {
        g.detalle.forEach((det: any) => listaPlana.push(det))
      }
    })

    return {
      filasExcel: listaPlana,
      tareasResumen: gruposFiltrados,
      countsEstadoComentarios: countsEstado,
      totalTareasBase,
      totalHorasBase
    }
  }, [
    registros,
    searchTerm,
    selectedDuracion,
    selectedPry,
    selectedSolicitante,
    selectedTeam,
    selectedAgrupador,
    selectedComentarioEstado,
    expandedTasks,
    comentariosPS,
    comentariosDM
  ])

  const totalHorasFiltradas = useMemo(() => {
    return tareasResumen.reduce((acc: number, t: any) => acc + t.totalHoras, 0)
  }, [tareasResumen])

  const totalRegistrosFiltrados = useMemo(() => {
    return tareasResumen.reduce((acc: number, t: any) => acc + (t.detalle?.length || 0), 0)
  }, [tareasResumen])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchTerm) count++
    if (selectedDuracion !== 'todas') count++
    if (selectedPry) count++
    if (selectedSolicitante) count++
    if (selectedTeam) count++
    if (selectedAgrupador) count++
    if (selectedComentarioEstado !== 'todos') count++
    return count
  }, [searchTerm, selectedDuracion, selectedPry, selectedSolicitante, selectedTeam, selectedAgrupador, selectedComentarioEstado])

  const limpiarFiltros = () => {
    setSearchTerm('')
    setSelectedDuracion('todas')
    setSelectedPry('')
    setSelectedSolicitante('')
    setSelectedTeam('')
    setSelectedAgrupador('')
    setSelectedComentarioEstado('todos')
  }

  const handleChange = (
    origen: 'ps' | 'dm',
    tipo: 'tareas' | 'registros',
    id: number,
    valor: string
  ) => {
    if (origen === 'ps') {
      setComentariosPS((prev) => ({
        ...prev,
        [tipo]: {
          ...prev[tipo],
          [id]: valor
        }
      }))
    } else {
      setComentariosDM((prev) => ({
        ...prev,
        [tipo]: {
          ...prev[tipo],
          [id]: valor
        }
      }))
    }
  }

  const toggleTask = (tareaPeriodoId: number) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [tareaPeriodoId]: prev[tareaPeriodoId] === false ? true : false
    }))
  }

  const toggleAll = () => {
    const allExpanded = tareasResumen.every((t: any) => expandedTasks[t.tarea_periodo_id] !== false)
    const next: Record<number, boolean> = {}
    tareasResumen.forEach((t: any) => {
      next[t.tarea_periodo_id] = !allExpanded
    })
    setExpandedTasks(next)
  }

  // Guardar Observaciones y Comentarios
  const handleSave = async () => {
    setSaving(true)
    try {
      const commentsMap: Record<
        string,
        {
          tipo: 'TAREA' | 'REGISTRO'
          id: number
          comentario_protecta: string
          comentario_dev: string
        }
      > = {}

      // Tareas modificadas
      Object.entries(comentariosPS.tareas).forEach(([idStr, psTxt]) => {
        const id = Number(idStr)
        const dmTxt = comentariosDM.tareas[id] || ''
        const init = savedHash[`TAREA-${id}`] || { ps: '', dm: '' }
        if ((psTxt || '') !== init.ps || (dmTxt || '') !== init.dm) {
          commentsMap[`TAREA-${id}`] = {
            tipo: 'TAREA',
            id,
            comentario_protecta: psTxt || '',
            comentario_dev: dmTxt || ''
          }
        }
      })

      Object.entries(comentariosDM.tareas).forEach(([idStr, dmTxt]) => {
        const id = Number(idStr)
        const psTxt = comentariosPS.tareas[id] || ''
        const init = savedHash[`TAREA-${id}`] || { ps: '', dm: '' }
        if ((psTxt || '') !== init.ps || (dmTxt || '') !== init.dm) {
          commentsMap[`TAREA-${id}`] = {
            tipo: 'TAREA',
            id,
            comentario_protecta: psTxt || '',
            comentario_dev: dmTxt || ''
          }
        }
      })

      // Registros modificados
      Object.entries(comentariosPS.registros).forEach(([idStr, psTxt]) => {
        const id = Number(idStr)
        const dmTxt = comentariosDM.registros[id] || ''
        const init = savedHash[`REGISTRO-${id}`] || { ps: '', dm: '' }
        if ((psTxt || '') !== init.ps || (dmTxt || '') !== init.dm) {
          commentsMap[`REGISTRO-${id}`] = {
            tipo: 'REGISTRO',
            id,
            comentario_protecta: psTxt || '',
            comentario_dev: dmTxt || ''
          }
        }
      })

      Object.entries(comentariosDM.registros).forEach(([idStr, dmTxt]) => {
        const id = Number(idStr)
        const psTxt = comentariosPS.registros[id] || ''
        const init = savedHash[`REGISTRO-${id}`] || { ps: '', dm: '' }
        if ((psTxt || '') !== init.ps || (dmTxt || '') !== init.dm) {
          commentsMap[`REGISTRO-${id}`] = {
            tipo: 'REGISTRO',
            id,
            comentario_protecta: psTxt || '',
            comentario_dev: dmTxt || ''
          }
        }
      })

      const commentsArray = Object.values(commentsMap)

      if (commentsArray.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin cambios',
          text: 'No hay comentarios nuevos o modificados para guardar.',
          confirmButtonColor: '#0f3d3e',
          timer: 2000,
          showConfirmButton: false
        })
        setSaving(false)
        return
      }

      const res = await saveExternalCommentsAction(commentsArray)
      if (res.success) {
        setSavedHash((prev) => {
          const next = { ...prev }
          commentsArray.forEach((c) => {
            next[`${c.tipo}-${c.id}`] = {
              ps: c.comentario_protecta,
              dm: c.comentario_dev
            }
          })
          return next
        })

        Swal.fire({
          icon: 'success',
          title: '¡Comentarios guardados!',
          text: 'Todos los comentarios han sido registrados y sincronizados exitosamente.',
          confirmButtonColor: '#0f3d3e',
          timer: 2200,
          showConfirmButton: false
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: res.error || 'Ocurrió un inconveniente al guardar los comentarios.',
          confirmButtonColor: '#0f3d3e'
        })
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error de red',
        text: 'No se pudo conectar con el servidor para guardar los comentarios.',
        confirmButtonColor: '#0f3d3e'
      })
    } finally {
      setSaving(false)
    }
  }

  // Descarga del Excel oficial
  const handleDownloadExcel = async () => {
    setExportingExcel(true)
    try {
      const res = await exportPublicReportExcelAction(token || linkId, costoHora, periodo?.id)
      if (res.success && res.data) {
        const byteCharacters = atob(res.data.base64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = res.data.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        Swal.fire({
          icon: 'success',
          title: 'Descarga iniciada',
          text: `El archivo ${res.data.fileName} se ha descargado correctamente.`,
          timer: 2500,
          showConfirmButton: false
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo generar el Excel',
          text: res.error || 'Ocurrió un error al compilar el archivo oficial.',
          confirmButtonColor: '#0f3d3e'
        })
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error de descarga',
        text: 'Ocurrió un error inesperado al procesar la descarga.',
        confirmButtonColor: '#0f3d3e'
      })
    } finally {
      setExportingExcel(false)
    }
  }

  const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const periodoLabel = periodo ? `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}` : 'Período Activo'
  const periodoNombre = periodo && periodo.mes && periodo.anio ? `${MESES[periodo.mes]} ${periodo.anio}` : periodoLabel

  return (
    <div className={styles.fullPageWrapper}>
      {/* ─── 1. HEADER SUPERIOR EJECUTIVO (SIN SIDEBAR LATERAL) ──────────── */}
      <header className={styles.topNavbar}>
        <div className={styles.navbarBrand}>
          <div className={styles.navbarLogoBox}>
            <FileSpreadsheet size={22} />
          </div>
          <div className={styles.navbarBrandTexts}>
            <h1 className={styles.navbarTitle}>
              Portal de Supervisión y Tareo
            </h1>
            <div className={styles.navbarSubtitle}>
              <span>Protecta Security</span>
              <span>•</span>
              <span className={styles.periodBadge}>{periodoNombre}</span>
            </div>
          </div>
        </div>

        {/* Acciones Principales */}
        <div className={styles.navbarActions}>
          <button
            type="button"
            className={styles.btnExcel}
            onClick={handleDownloadExcel}
            disabled={exportingExcel}
            title="Descargar libro Excel oficial"
          >
            <Download size={15} style={{ marginRight: '6px' }} />
            {exportingExcel ? 'Generando...' : 'Descargar Excel'}
          </button>

          <button
            type="button"
            className={styles.btnSave}
            onClick={handleSave}
            disabled={saving}
            title="Guardar observaciones y respuestas en la base de datos"
          >
            <Save size={15} style={{ marginRight: '6px' }} />
            {saving ? 'Guardando...' : 'Guardar Comentarios'}
            {pendingChangesCount > 0 && (
              <span className={styles.pendingBadge}>{pendingChangesCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* ─── CONTENIDO PRINCIPAL FULL-WIDTH ───────────────────────────────── */}
      <main className={styles.mainContainer}>
        {/* ─── 2. TARJETA DE FILTROS AVANZADOS E INTELIGENTES ───────────────── */}
        <section className={styles.filterCard}>
          <div className={styles.filterHeader}>
            <div className={styles.filterHeaderTitle}>
              <Filter size={16} color="#0f3d3e" />
              <span>Filtros y Búsqueda Inteligente</span>
              {activeFiltersCount > 0 && (
                <span className={styles.commentTabBadge} style={{ background: '#0f3d3e', color: '#ffffff' }}>
                  {activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                className={styles.btnClear}
                onClick={limpiarFiltros}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <RotateCcw size={13} />
                Restablecer Filtros
              </button>
            )}
          </div>

          {/* Fila 1: Buscador Global + Píldoras de Estado de Comentarios */}
          <div className={styles.filterRowSearch}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Buscar por tarea, colaborador, descripción, proyecto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className={styles.searchClearBtn}
                  onClick={() => setSearchTerm('')}
                  title="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Píldoras de Estado de Comentarios */}
            <div className={styles.commentTabsGroup}>
              <button
                type="button"
                className={`${styles.commentTabBtn} ${selectedComentarioEstado === 'todos' ? styles.commentTabBtnActive : ''}`}
                onClick={() => setSelectedComentarioEstado('todos')}
              >
                <span>Todas</span>
                <span className={styles.commentTabBadge}>{countsEstadoComentarios.todos}</span>
              </button>

              <button
                type="button"
                className={`${styles.commentTabBtn} ${selectedComentarioEstado === 'con_ps' ? styles.commentTabBtnActive : ''}`}
                onClick={() => setSelectedComentarioEstado('con_ps')}
                title="Filtrar tareas que tengan comentarios u observaciones de Protecta"
              >
                <MessageSquare size={13} />
                <span>Con Observación PS</span>
                <span className={styles.commentTabBadge}>{countsEstadoComentarios.con_ps}</span>
              </button>

              <button
                type="button"
                className={`${styles.commentTabBtn} ${selectedComentarioEstado === 'con_dm' ? styles.commentTabBtnActive : ''}`}
                onClick={() => setSelectedComentarioEstado('con_dm')}
                title="Filtrar tareas con respuesta de Dev (DM Software)"
              >
                <CheckCircle2 size={13} />
                <span>Con Respuesta Dev</span>
                <span className={styles.commentTabBadge}>{countsEstadoComentarios.con_dm}</span>
              </button>

              <button
                type="button"
                className={`${styles.commentTabBtn} ${selectedComentarioEstado === 'pendientes_dm' ? styles.commentTabBtnActive : ''}`}
                onClick={() => setSelectedComentarioEstado('pendientes_dm')}
                title="Tareas con observación Protecta pendientes de ser respondidas por Dev"
              >
                <AlertCircle size={13} color={selectedComentarioEstado === 'pendientes_dm' ? '#ffffff' : '#eab308'} />
                <span>Pendientes DM</span>
                <span className={styles.commentTabBadge} style={{ color: selectedComentarioEstado === 'pendientes_dm' ? '#ffffff' : '#ca8a04' }}>
                  {countsEstadoComentarios.pendientes_dm}
                </span>
              </button>

              <button
                type="button"
                className={`${styles.commentTabBtn} ${selectedComentarioEstado === 'sin_comentarios' ? styles.commentTabBtnActive : ''}`}
                onClick={() => setSelectedComentarioEstado('sin_comentarios')}
                title="Tareas que no tienen ningún comentario registrado"
              >
                <span>Sin Observaciones</span>
                <span className={styles.commentTabBadge}>{countsEstadoComentarios.sin_comentarios}</span>
              </button>
            </div>
          </div>

          {/* Fila 2: Selectores desplegables organizados */}
          <div className={styles.filterGrid}>
            <select
              className={`${styles.filterSelect} ${selectedDuracion !== 'todas' ? styles.filterSelectActive : ''}`}
              value={selectedDuracion}
              onChange={(e) => setSelectedDuracion(e.target.value as any)}
            >
              <option value="todas">Todas las duraciones</option>
              <option value="mas_50h">Tareas Largas (&gt; 50 hrs)</option>
              <option value="hasta_50h">Tareas Estándar (≤ 50 hrs)</option>
            </select>

            <select
              className={`${styles.filterSelect} ${selectedPry ? styles.filterSelectActive : ''}`}
              value={selectedPry}
              onChange={(e) => setSelectedPry(e.target.value)}
            >
              <option value="">Todos los proyectos</option>
              {opciones.proyectos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              className={`${styles.filterSelect} ${selectedSolicitante ? styles.filterSelectActive : ''}`}
              value={selectedSolicitante}
              onChange={(e) => setSelectedSolicitante(e.target.value)}
            >
              <option value="">Todos los solicitantes</option>
              {opciones.solicitantes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className={`${styles.filterSelect} ${selectedTeam ? styles.filterSelectActive : ''}`}
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">Todos los equipos</option>
              {opciones.teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              className={`${styles.filterSelect} ${selectedAgrupador ? styles.filterSelectActive : ''}`}
              value={selectedAgrupador}
              onChange={(e) => setSelectedAgrupador(e.target.value)}
            >
              <option value="">Todos los agrupadores</option>
              {opciones.agrupadores.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Fila 3: Resumen dinámico en vivo */}
          <div className={styles.filterSummaryRow}>
            <div>
              Mostrando <strong style={{ color: '#0f172a' }}>{tareasResumen.length}</strong> de {totalTareasBase} tareas
              {' '}·{' '}
              <strong style={{ color: '#0f172a' }}>{totalRegistrosFiltrados}</strong> de {registros.length} registros
              {' '}·{' '}
              <strong style={{ color: '#0f3d3e' }}>{totalHorasFiltradas.toFixed(2)} hrs</strong> acumuladas
            </div>
            <div>
              Período evaluado: <strong>{periodoNombre}</strong>
            </div>
          </div>
        </section>

        {/* ─── 3. TABLA DE DETALLE CON JERARQUÍA PADRE VS HIJOS ─────────────── */}
        <div className={styles.card} style={{ margin: 0 }}>
          <div className={styles.cardHeaderRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 className={styles.cardTitle}>Detalle de Actividades y Tareas</h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                ({tareasResumen.length} tareas · {filasExcel.length} filas desplegadas)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className={styles.btnToggleSub}
                onClick={toggleAll}
              >
                Expandir / Colapsar Todo
              </button>
              <button
                type="button"
                className={styles.btnSave}
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <Save size={14} style={{ marginRight: '5px' }} />
                {saving ? 'Guardando...' : 'Guardar Comentarios'}
                {pendingChangesCount > 0 && (
                  <span className={styles.pendingBadge}>{pendingChangesCount}</span>
                )}
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.excelTable}>
              <thead>
                <tr>
                  <th style={{ width: '300px' }}>Taskname</th>
                  <th style={{ width: '100px' }}>Fecha</th>
                  <th style={{ width: '140px' }}>Asignado</th>
                  <th style={{ width: '130px' }}>Solicitante</th>
                  <th style={{ width: '150px' }}>Pry - Protecta</th>
                  <th style={{ width: '140px' }}>Agrupador</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Horas tomadas</th>
                  <th style={{ width: '250px' }}>Comentario PS</th>
                  <th style={{ width: '250px' }}>Comentario DM</th>
                </tr>
              </thead>
              <tbody>
                {filasExcel.map((fila) => {
                  const refId = fila.esTarea ? fila.tarea_periodo_id : fila.id
                  const isExpanded = expandedTasks[fila.tarea_periodo_id] !== false

                  if (fila.esTarea) {
                    return (
                      <tr key={`tarea-${refId}`} className={styles.rowTask}>
                        {/* Taskname Padre */}
                        <td
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleTask(fila.tarea_periodo_id)}
                          title="Haz clic para expandir o contraer actividades"
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button
                              type="button"
                              className={styles.taskChevronBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleTask(fila.tarea_periodo_id)
                              }}
                              title={isExpanded ? 'Colapsar actividades' : 'Expandir actividades'}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <span className={styles.taskNameText}>
                              {fila.tarea_nombre}
                            </span>
                            {fila.esAgil ? (
                              <span className={styles.tagAgil}>Ágil</span>
                            ) : (
                              <span className={styles.tagProy}>Proy</span>
                            )}
                          </div>
                        </td>

                        {/* Fecha Padre */}
                        <td style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                          —
                        </td>

                        {/* Asignado Padre */}
                        <td style={{ color: '#0f172a', fontWeight: 700 }}>
                          {fila.team_nombre || '-'}
                        </td>

                        {/* Solicitante Padre */}
                        <td style={{ color: '#0f172a', fontWeight: 600 }}>
                          {fila.solicitante_nombre || '-'}
                        </td>

                        {/* Proyecto Padre */}
                        <td style={{ color: '#0f172a', fontWeight: 600 }}>
                          {fila.proyecto_nombre || '-'}
                        </td>

                        {/* Agrupador Padre */}
                        <td style={{ color: '#0f172a', fontWeight: 600 }}>
                          {fila.agrupador_nombre || '-'}
                        </td>

                        {/* Horas tomadas Padre */}
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.taskHoursBadge}>
                            {fila.totalHoras.toFixed(2)} hrs
                          </span>
                        </td>

                        {/* Comentario PS Padre */}
                        <td style={{ padding: '6px' }}>
                          <textarea
                            className={styles.textarea}
                            placeholder="Observación Protecta a la tarea general..."
                            value={comentariosPS.tareas[refId] || ''}
                            onChange={(e) => handleChange('ps', 'tareas', refId, e.target.value)}
                          />
                        </td>

                        {/* Comentario DM Padre */}
                        <td style={{ padding: '6px' }}>
                          <textarea
                            className={`${styles.textarea} ${styles.textareaDM}`}
                            placeholder="Respuesta Dev a la tarea general..."
                            value={comentariosDM.tareas[refId] || ''}
                            onChange={(e) => handleChange('dm', 'tareas', refId, e.target.value)}
                          />
                        </td>
                      </tr>
                    )
                  }

                  // ─── Fila Registro Hijo ─────────────────────────────────────
                  return (
                    <tr key={`registro-${refId}`} className={styles.rowRecord}>
                      {/* Descripción con sangría */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                          <span className={styles.recordIndent}>↳</span>
                          <span className={styles.recordDesc}>
                            {fila.descripcion || fila.tarea_nombre}
                          </span>
                        </div>
                      </td>

                      {/* Fecha formateada */}
                      <td>
                        <span className={styles.dateChip}>
                          <Calendar size={11} color="#64748b" />
                          {fila.fecha
                            ? new Date(fila.fecha + 'T12:00:00').toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })
                            : '-'}
                        </span>
                      </td>

                      {/* Colaborador individual asignado */}
                      <td>
                        <span className={styles.userChip}>
                          <User size={12} color="#0f3d3e" />
                          {fila.trabajador_nombre || fila.team_nombre || '-'}
                        </span>
                      </td>

                      {/* Solicitante */}
                      <td style={{ color: '#475569' }}>
                        {fila.solicitante_nombre || '-'}
                      </td>

                      {/* Proyecto */}
                      <td style={{ color: '#475569' }}>
                        {fila.proyecto_nombre || '-'}
                      </td>

                      {/* Agrupador */}
                      <td style={{ color: '#475569' }}>
                        {fila.agrupador_nombre || '-'}
                      </td>

                      {/* Horas tomadas */}
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                        {Number(fila.horas).toFixed(2)}
                      </td>

                      {/* Comentario PS Hijo */}
                      <td style={{ padding: '6px' }}>
                        <textarea
                          className={styles.textarea}
                          placeholder="Observación Protecta a este registro..."
                          value={comentariosPS.registros[refId] || ''}
                          onChange={(e) => handleChange('ps', 'registros', refId, e.target.value)}
                        />
                      </td>

                      {/* Comentario DM Hijo */}
                      <td style={{ padding: '6px' }}>
                        <textarea
                          className={`${styles.textarea} ${styles.textareaDM}`}
                          placeholder="Respuesta Dev a este registro..."
                          value={comentariosDM.registros[refId] || ''}
                          onChange={(e) => handleChange('dm', 'registros', refId, e.target.value)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ─── 4. BARRA FLOTANTE DE GUARDADO (SI HAY CAMBIOS PENDIENTES) ───── */}
      {pendingChangesCount > 0 && (
        <div className={styles.floatingSaveBar}>
          <div className={styles.floatingSaveContent}>
            <span className={styles.floatingPulse} />
            <span>
              Tienes <strong>{pendingChangesCount}</strong> {pendingChangesCount === 1 ? 'observación sin guardar' : 'observaciones sin guardar'}
            </span>
            <button
              type="button"
              className={styles.btnSaveFloating}
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar Cambios Ahora'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}