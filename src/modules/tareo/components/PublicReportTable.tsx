'use client'

import React, { useState, useMemo } from 'react'
import Swal from 'sweetalert2'
import {
  LayoutDashboard,
  BarChart3,
  FileSpreadsheet,
  Users,
  FolderDown,
  Save,
  Download,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen
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

type TabType = 'resumen' | 'graficos' | 'detalle' | 'equipos' | 'descargas'

export default function PublicReportTable({
  token,
  registros,
  feedback,
  linkId,
  costoHora = 65,
  periodo,
  initialFilters = {}
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('resumen')
  const [saving, setSaving] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({})
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // ─── 1. ESTADOS DE FILTROS ───────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
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
    feedback.forEach((f) => {
      if (f.referencia_tipo === 'TAREA') state.tareas[f.referencia_id] = f.comentario_protecta || ''
      if (f.referencia_tipo === 'REGISTRO') state.registros[f.referencia_id] = f.comentario_protecta || ''
    })
    return state
  })

  const initialComentariosHash = useMemo(() => {
    const map: Record<string, string> = {}
    feedback.forEach((f) => {
      map[`${f.referencia_tipo}-${f.referencia_id}`] = f.comentario_protecta || ''
    })
    return map
  }, [feedback])

  const pendingChangesCount = useMemo(() => {
    let count = 0
    Object.entries(comentariosPS.tareas).forEach(([id, txt]) => {
      if ((txt || '') !== (initialComentariosHash[`TAREA-${id}`] || '')) count++
    })
    Object.entries(comentariosPS.registros).forEach(([id, txt]) => {
      if ((txt || '') !== (initialComentariosHash[`REGISTRO-${id}`] || '')) count++
    })
    return count
  }, [comentariosPS, initialComentariosHash])

  const comentariosDM = useMemo(() => {
    const map: Record<string, string> = {}
    feedback.forEach((f) => {
      if (f.comentario_dev) map[`${f.referencia_tipo}-${f.referencia_id}`] = f.comentario_dev
    })
    return map
  }, [feedback])

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
  const { filasExcel, tareasResumen, registrosFiltrados } = useMemo(() => {
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

    // Aplicar filtros
    const searchLower = searchTerm.toLowerCase()
    const todosRegistros: any[] = []

    const gruposFiltrados = Object.values(grupos).filter((g: any) => {
      if (selectedPry && g.proyecto_nombre !== selectedPry) return false
      if (selectedSolicitante && g.solicitante_nombre !== selectedSolicitante) return false
      if (selectedTeam && g.team_nombre !== selectedTeam) return false
      if (selectedAgrupador && g.agrupador_nombre !== selectedAgrupador) return false

      if (selectedDuracion === 'mas_50h' && g.totalHoras <= 50) return false
      if (selectedDuracion === 'hasta_50h' && g.totalHoras > 50) return false

      if (searchTerm) {
        const coincideTarea = g.tarea_nombre?.toLowerCase().includes(searchLower)
        const coincideDetalle = g.detalle.some(
          (d: any) =>
            d.descripcion?.toLowerCase().includes(searchLower) ||
            d.trabajador_nombre?.toLowerCase().includes(searchLower)
        )
        if (!coincideTarea && !coincideDetalle) return false
      }

      g.detalle.forEach((det: any) => todosRegistros.push(det))
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
      registrosFiltrados: todosRegistros
    }
  }, [registros, searchTerm, selectedDuracion, selectedPry, selectedSolicitante, selectedTeam, selectedAgrupador, expandedTasks])

  // ─── 5. ESTADÍSTICAS EJECUTIVAS ──────────────────────────────────────────
  const statsAgilVsProy = useMemo(() => {
    let horasAgil = 0
    let horasProyectos = 0

    tareasResumen.forEach((t: any) => {
      if (t.esAgil) {
        horasAgil += t.totalHoras
      } else {
        horasProyectos += t.totalHoras
      }
    })

    const total = horasAgil + horasProyectos
    const pctAgil = total > 0 ? (horasAgil / total) * 100 : 0
    const pctProyectos = total > 0 ? (horasProyectos / total) * 100 : 0

    return {
      horasAgil,
      horasProyectos,
      montoAgil: horasAgil * costoHora,
      montoProyectos: horasProyectos * costoHora,
      pctAgil,
      pctProyectos
    }
  }, [tareasResumen, costoHora])

  const statsAgrupadores = useMemo(() => {
    const mapa: Record<string, { horas: number; count: number }> = {}
    let totalH = 0

    tareasResumen.forEach((t: any) => {
      const nombre = t.agrupador_nombre || 'Sin Agrupador'
      if (!mapa[nombre]) mapa[nombre] = { horas: 0, count: 0 }
      mapa[nombre].horas += t.totalHoras
      mapa[nombre].count += 1
      totalH += t.totalHoras
    })

    return Object.entries(mapa)
      .map(([nombre, item]) => ({
        nombre,
        horas: item.horas,
        tareasCount: item.count,
        porcentaje: totalH > 0 ? (item.horas / totalH) * 100 : 0
      }))
      .sort((a, b) => b.horas - a.horas)
  }, [tareasResumen])

  // Desglose por Equipos
  const statsEquipos = useMemo(() => {
    const mapa: Record<string, { horas: number; tareas: Set<number> }> = {}
    let totalH = 0

    registrosFiltrados.forEach((r) => {
      const team = r.team_nombre || 'Sin Equipo'
      if (!mapa[team]) mapa[team] = { horas: 0, tareas: new Set<number>() }
      mapa[team].horas += Number(r.horas) || 0
      mapa[team].tareas.add(r.tarea_periodo_id)
      totalH += Number(r.horas) || 0
    })

    return Object.entries(mapa)
      .map(([team, val]) => ({
        team,
        horas: val.horas,
        tareasCount: val.tareas.size,
        monto: val.horas * costoHora,
        porcentaje: totalH > 0 ? (val.horas / totalH) * 100 : 0
      }))
      .sort((a, b) => b.horas - a.horas)
  }, [registrosFiltrados, costoHora])

  // Desglose por Colaborador/Recurso
  const statsRecursos = useMemo(() => {
    const mapa: Record<string, { team: string; horas: number; logsCount: number }> = {}

    registrosFiltrados.forEach((r) => {
      const nombre = r.trabajador_nombre || 'No asignado'
      if (!mapa[nombre]) {
        mapa[nombre] = {
          team: r.team_nombre || 'General',
          horas: 0,
          logsCount: 0
        }
      }
      mapa[nombre].horas += Number(r.horas) || 0
      mapa[nombre].logsCount += 1
    })

    return Object.entries(mapa)
      .map(([nombre, val]) => ({
        nombre,
        team: val.team,
        horas: val.horas,
        logsCount: val.logsCount,
        monto: val.horas * costoHora
      }))
      .sort((a, b) => b.horas - a.horas)
  }, [registrosFiltrados, costoHora])

  const totalHorasGeneral = useMemo(() => {
    return tareasResumen.reduce((acc: number, t: any) => acc + t.totalHoras, 0)
  }, [tareasResumen])

  // ─── 6. ESTADÍSTICAS PARA GRÁFICOS Y VISUALIZACIÓN EJECUTIVA ─────────────
  const statsDiarias = useMemo(() => {
    const mapaDias: Record<number, number> = {}
    registrosFiltrados.forEach((r) => {
      if (r.fecha) {
        const parts = String(r.fecha).split('T')[0].split('-')
        if (parts.length >= 3) {
          const dia = parseInt(parts[2], 10)
          if (!isNaN(dia) && dia >= 1 && dia <= 31) {
            mapaDias[dia] = (mapaDias[dia] || 0) + (Number(r.horas) || 0)
          }
        }
      }
    })

    const diasPresentes = Object.keys(mapaDias).map(Number).sort((a, b) => a - b)
    if (diasPresentes.length === 0) return []

    const minDia = Math.min(1, diasPresentes[0])
    const maxDia = Math.max(diasPresentes[diasPresentes.length - 1], 28)
    const res: Array<{ dia: number; horas: number; monto: number }> = []
    for (let d = minDia; d <= maxDia; d++) {
      const h = mapaDias[d] || 0
      res.push({ dia: d, horas: h, monto: h * costoHora })
    }
    return res
  }, [registrosFiltrados, costoHora])

  const maxHorasDia = useMemo(() => {
    if (statsDiarias.length === 0) return 1
    return Math.max(...statsDiarias.map(d => d.horas), 1)
  }, [statsDiarias])

  const promedioHorasDia = useMemo(() => {
    const diasConHoras = statsDiarias.filter(d => d.horas > 0)
    if (diasConHoras.length === 0) return 0
    const suma = diasConHoras.reduce((acc, d) => acc + d.horas, 0)
    return suma / diasConHoras.length
  }, [statsDiarias])

  const topTareas = useMemo(() => {
    return [...tareasResumen]
      .sort((a, b) => b.totalHoras - a.totalHoras)
      .slice(0, 8)
  }, [tareasResumen])

  const maxHorasTopTarea = useMemo(() => {
    if (topTareas.length === 0) return 1
    return topTareas[0].totalHoras || 1
  }, [topTareas])

  const maxHorasRecurso = useMemo(() => {
    if (statsRecursos.length === 0) return 1
    return statsRecursos[0].horas || 1
  }, [statsRecursos])

  const hasActiveFilters = Boolean(
    searchTerm || selectedDuracion !== 'todas' || selectedPry || selectedSolicitante || selectedTeam || selectedAgrupador
  )

  const limpiarFiltros = () => {
    setSearchTerm('')
    setSelectedDuracion('todas')
    setSelectedPry('')
    setSelectedSolicitante('')
    setSelectedTeam('')
    setSelectedAgrupador('')
  }

  const handleChange = (tipo: 'tareas' | 'registros', id: number, valor: string) => {
    setComentariosPS((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        [id]: valor
      }
    }))
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

  // Guardar Observaciones
  const handleSave = async () => {
    setSaving(true)
    try {
      const commentsArray: Array<{
        tipo: 'TAREA' | 'REGISTRO'
        id: number
        comentario_protecta: string
      }> = []

      Object.entries(comentariosPS.tareas).forEach(([id, txt]) => {
        if (txt !== undefined) {
          commentsArray.push({
            tipo: 'TAREA',
            id: Number(id),
            comentario_protecta: txt
          })
        }
      })

      Object.entries(comentariosPS.registros).forEach(([id, txt]) => {
        if (txt !== undefined) {
          commentsArray.push({
            tipo: 'REGISTRO',
            id: Number(id),
            comentario_protecta: txt
          })
        }
      })

      const res = await saveExternalCommentsAction(commentsArray)
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Observaciones guardadas!',
          text: 'Tus observaciones han sido registradas y notificadas al equipo de desarrollo.',
          confirmButtonColor: '#0f3d3e'
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: res.error || 'Ocurrió un inconveniente al guardar las observaciones.',
          confirmButtonColor: '#0f3d3e'
        })
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error de red',
        text: 'No se pudo conectar con el servidor para guardar las observaciones.',
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
    <div className={styles.layoutWrapper}>
      {/* Barra superior para móviles con botón toggle */}
      <div className={styles.mobileTopBar}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Resumen de Tareo</span>
          <span style={{ fontSize: '12px', color: '#0f3d3e', marginLeft: '8px', fontWeight: 600 }}>{periodoNombre}</span>
        </div>
        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        >
          {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          <span>{mobileSidebarOpen ? 'Cerrar' : 'Vistas'}</span>
        </button>
      </div>

      {/* Backdrop para Drawer móvil */}
      {mobileSidebarOpen && (
        <div
          className={styles.sidebarDrawerOverlay}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ─── SIDEBAR DE NAVEGACIÓN (COLAPSABLE / OCULTABLE) ───────────────── */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''} ${mobileSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarHeaderTop}>
            <div className={styles.headerTitles}>
              <div className={styles.resumenTitle}>Resumen de Tareo</div>
              <div className={styles.resumenPeriodo}>{periodoNombre}</div>
            </div>

            <button
              type="button"
              className={styles.toggleCollapseBtn}
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {!isCollapsed && <span className={styles.sidebarNavLabel}>Vistas</span>}

          <button
            type="button"
            className={`${styles.sidebarNavBtn} ${activeTab === 'resumen' ? styles.sidebarNavBtnActive : ''}`}
            onClick={() => {
              setActiveTab('resumen')
              setMobileSidebarOpen(false)
            }}
            title="Resumen & KPIs"
          >
            <div className={styles.navIconSlot}>
              <LayoutDashboard size={18} />
            </div>
            <span className={styles.navLabelText}>Resumen & KPIs</span>
          </button>

          <button
            type="button"
            className={`${styles.sidebarNavBtn} ${activeTab === 'graficos' ? styles.sidebarNavBtnActive : ''}`}
            onClick={() => {
              setActiveTab('graficos')
              setMobileSidebarOpen(false)
            }}
            title="Gráficos & Métricas"
          >
            <div className={styles.navIconSlot}>
              <BarChart3 size={18} />
            </div>
            <span className={styles.navLabelText}>Gráficos & Métricas</span>
          </button>

          <button
            type="button"
            className={`${styles.sidebarNavBtn} ${activeTab === 'detalle' ? styles.sidebarNavBtnActive : ''}`}
            onClick={() => {
              setActiveTab('detalle')
              setMobileSidebarOpen(false)
            }}
            title={`Detalle de Tareas (${tareasResumen.length})`}
          >
            <div className={styles.navIconSlot}>
              <FileSpreadsheet size={18} />
            </div>
            <span className={styles.navLabelText}>Detalle de Tareas</span>
            <span className={styles.sidebarNavBadge}>{tareasResumen.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.sidebarNavBtn} ${activeTab === 'equipos' ? styles.sidebarNavBtnActive : ''}`}
            onClick={() => {
              setActiveTab('equipos')
              setMobileSidebarOpen(false)
            }}
            title={`Equipos & Recursos (${statsRecursos.length})`}
          >
            <div className={styles.navIconSlot}>
              <Users size={18} />
            </div>
            <span className={styles.navLabelText}>Equipos & Recursos</span>
            <span className={styles.sidebarNavBadge}>{statsRecursos.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.sidebarNavBtn} ${activeTab === 'descargas' ? styles.sidebarNavBtnActive : ''}`}
            onClick={() => {
              setActiveTab('descargas')
              setMobileSidebarOpen(false)
            }}
            title="Bóveda de Archivos"
          >
            <div className={styles.navIconSlot}>
              <FolderDown size={18} />
            </div>
            <span className={styles.navLabelText}>Bóveda de Archivos</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.btnSave}
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', justifyContent: 'center' }}
            title="Guardar Observaciones"
          >
            <div className={styles.navIconSlot}>
              <Save size={16} />
            </div>
            <span className={styles.footerBtnText}>
              {saving ? 'Guardando...' : 'Guardar Observaciones'}
            </span>
            {pendingChangesCount > 0 && (
              <span className={styles.pendingBadge}>{pendingChangesCount}</span>
            )}
          </button>

          <button
            type="button"
            className={styles.btnExcel}
            onClick={handleDownloadExcel}
            disabled={exportingExcel}
            style={{ width: '100%', justifyContent: 'center' }}
            title="Descargar Excel"
          >
            <div className={styles.navIconSlot}>
              <Download size={16} />
            </div>
            <span className={styles.footerBtnText}>
              {exportingExcel ? 'Generando...' : 'Descargar Excel'}
            </span>
          </button>
        </div>
      </aside>

      {/* ─── CONTENIDO PRINCIPAL DE LA VISTA ───────────────────────────────── */}
      <div className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isCollapsed && (
              <button
                type="button"
                className={styles.toggleCollapseBtn}
                onClick={() => setIsCollapsed(false)}
                title="Mostrar menú lateral"
              >
                <PanelLeftOpen size={18} />
              </button>
            )}
            <h1 className={styles.pageTitle}>
              {activeTab === 'resumen' && 'Resumen & Indicadores Ejecutivos'}
              {activeTab === 'graficos' && 'Gráficos & Visualización de Datos'}
              {activeTab === 'detalle' && 'Detalle de Tareas & Registros de Actividad'}
              {activeTab === 'equipos' && 'Distribución por Equipos & Recursos'}
              {activeTab === 'descargas' && 'Bóveda de Archivos ("Drive")'}
            </h1>
          </div>
          <p className={styles.pageDesc}>
            {activeTab === 'resumen' && `Consolidado de horas, liquidación y distribución entre Línea Ágil y Proyectos Tradicionales. (Período: ${periodoNombre} · Tarifa S/. ${costoHora.toFixed(2)}/h)`}
            {activeTab === 'graficos' && `Visualizaciones interactivas de ritmo cronológico diario, distribución presupuestaria y cargas operativas. (Período: ${periodoNombre})`}
            {activeTab === 'detalle' && `Revise el log de actividades y registre sus observaciones en la columna "Observaciones Protecta". (Período: ${periodoNombre} · Tarifa S/. ${costoHora.toFixed(2)}/h)`}
            {activeTab === 'equipos' && `Participación porcentual y consolidado de horas por cada equipo técnico y colaborador. (Período: ${periodoNombre})`}
            {activeTab === 'descargas' && 'Descarga directa del libro contable oficial de Excel (.xlsx) con todas las hojas y formatos estandarizados.'}
          </p>
        </div>

      {/* ─── VISTA 1: RESUMEN & KPIS EJECUTIVOS ───────────────────────────────── */}
      {activeTab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Fila de Tarjetas KPI */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Horas Registradas</div>
              <div className={styles.kpiValue}>{totalHorasGeneral.toFixed(2)} hrs</div>
              <div className={styles.kpiSub}>Total consumido en período</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Inversión / Liquidación</div>
              <div className={styles.kpiValue}>
                S/. {(totalHorasGeneral * costoHora).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={styles.kpiSub}>Tarifa S/. {costoHora.toFixed(2)} / hora</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Tareas Activas</div>
              <div className={styles.kpiValue}>{tareasResumen.length}</div>
              <div className={styles.kpiSub}>Requerimientos evaluados</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Colaboradores</div>
              <div className={styles.kpiValue}>{statsRecursos.length}</div>
              <div className={styles.kpiSub}>Equipo operativo asignado</div>
            </div>
          </div>

          {/* Resumen Oficial Protecta (Ágil vs Proyectos) */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: '12px' }}>
              Resumen Ejecutivo Protecta (Ágil vs Proyectos Tradicionales)
            </h2>
            <div className={styles.executiveMetricsRow} style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <div className={styles.metricBox}>
                <div className={styles.metricBoxTitle}>Línea Ágil</div>
                <div className={styles.metricBoxValue}>{statsAgilVsProy.horasAgil.toFixed(2)} hrs</div>
                <div className={styles.metricBoxSub}>
                  S/. {statsAgilVsProy.montoAgil.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({statsAgilVsProy.pctAgil.toFixed(1)}% del total)
                </div>
              </div>

              <div className={styles.metricBox}>
                <div className={styles.metricBoxTitle}>Proyectos Tradicionales</div>
                <div className={styles.metricBoxValue}>{statsAgilVsProy.horasProyectos.toFixed(2)} hrs</div>
                <div className={styles.metricBoxSub}>
                  S/. {statsAgilVsProy.montoProyectos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({statsAgilVsProy.pctProyectos.toFixed(1)}% del total)
                </div>
              </div>
            </div>
          </div>

          {/* Tabla Resumen de Horas y Costos (Exacta de Imagen 3) */}
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>Resumen de Horas y Costos por Tarea</h2>
              <button
                type="button"
                className={styles.btnExcel}
                onClick={handleDownloadExcel}
                disabled={exportingExcel}
              >
                {exportingExcel ? 'Generando...' : 'Descargar Excel'}
              </button>
            </div>

            <div className={styles.tableWrapper} style={{ maxHeight: '420px' }}>
              <table className={styles.excelTable} style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th className={styles.resumenTh} style={{ textAlign: 'left' }}>Nombre de la Tarea</th>
                    <th className={styles.resumenTh} style={{ width: '150px', textAlign: 'right' }}>Horas Totales</th>
                    <th className={styles.resumenTh} style={{ width: '180px', textAlign: 'right' }}>Monto a Pagar (S/.)</th>
                  </tr>
                </thead>
                <tbody>
                  {tareasResumen.map((t: any) => (
                    <tr key={`resumen-${t.tarea_periodo_id}`}>
                      <td style={{ fontWeight: 'normal' }}>
                        {t.tarea_nombre}
                        {t.esAgil ? (
                          <span className={styles.tagAgil}>Ágil</span>
                        ) : (
                          <span className={styles.tagProy}>Proy</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>{t.totalHoras.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {(t.totalHoras * costoHora).toLocaleString('es-PE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <td style={{ textAlign: 'left' }}>TOTAL GENERAL</td>
                    <td style={{ textAlign: 'right' }}>{totalHorasGeneral.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {(totalHorasGeneral * costoHora).toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Subtotales por Agrupador */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: '14px' }}>
              Subtotales por Agrupador
            </h2>
            <div className={styles.tableWrapper} style={{ maxHeight: '280px' }}>
              <table className={styles.excelTable}>
                <thead>
                  <tr>
                    <th className={styles.resumenTh} style={{ textAlign: 'left' }}>Agrupador</th>
                    <th className={styles.resumenTh} style={{ width: '120px', textAlign: 'center' }}>Tareas</th>
                    <th className={styles.resumenTh} style={{ width: '140px', textAlign: 'right' }}>Horas</th>
                    <th className={styles.resumenTh} style={{ width: '160px', textAlign: 'right' }}>Monto (S/.)</th>
                    <th className={styles.resumenTh} style={{ width: '120px', textAlign: 'right' }}>Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {statsAgrupadores.map((a) => (
                    <tr key={a.nombre}>
                      <td>{a.nombre}</td>
                      <td style={{ textAlign: 'center' }}>{a.tareasCount}</td>
                      <td style={{ textAlign: 'right' }}>{a.horas.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {(a.horas * costoHora).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }}>{a.porcentaje.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── VISTA: GRÁFICOS & VISUALIZACIÓN EJECUTIVA ────────────────────────── */}
      {activeTab === 'graficos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Barra de Filtros Rápida sincronizada con los gráficos */}
          <div className={styles.toolbar} style={{ padding: '12px 16px' }}>
            <div className={styles.filtersGroup}>
              <input
                className={styles.input}
                placeholder="Filtrar gráficos por tarea o detalle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <select
                className={styles.select}
                value={selectedDuracion}
                onChange={(e) => setSelectedDuracion(e.target.value as any)}
              >
                <option value="todas">Todas las duraciones</option>
                <option value="mas_50h">Tareas Largas (&gt; 50 hrs)</option>
                <option value="hasta_50h">Tareas Estándar (≤ 50 hrs)</option>
              </select>

              <select
                className={styles.select}
                value={selectedPry}
                onChange={(e) => setSelectedPry(e.target.value)}
              >
                <option value="">Todos los proyectos</option>
                {opciones.proyectos.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                className={styles.select}
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">Todos los equipos</option>
                {opciones.teams.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                className={styles.select}
                value={selectedAgrupador}
                onChange={(e) => setSelectedAgrupador(e.target.value)}
              >
                <option value="">Todos los agrupadores</option>
                {opciones.agrupadores.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {hasActiveFilters && (
                <button className={styles.btnClear} onClick={limpiarFiltros}>
                  Limpiar
                </button>
              )}
            </div>

            <div className={styles.actionsGroup}>
              <button
                type="button"
                className={styles.btnExcel}
                onClick={handleDownloadExcel}
                disabled={exportingExcel}
              >
                {exportingExcel ? 'Generando...' : 'Descargar Excel'}
              </button>
            </div>
          </div>

          {/* Gráfico 1: Curva de Actividad Diaria a lo largo del mes (Timeline SVG) */}
          {statsDiarias.length > 0 && (
            <div className={styles.chartCardWide}>
              <div className={styles.chartHeader}>
                <div>
                  <h3 className={styles.chartTitle}>Ritmo Cronológico de Registro de Horas</h3>
                  <p className={styles.chartSubtitle}>
                    Horas registradas diariamente por el equipo operativo en el período ({periodoLabel})
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={styles.chartTag}>
                    Promedio: {promedioHorasDia.toFixed(1)} hrs/día
                  </span>
                  <span className={styles.chartTag} style={{ background: '#0f3d3e', color: '#ffffff' }}>
                    Total: {totalHorasGeneral.toFixed(1)} hrs
                  </span>
                </div>
              </div>

              <div className={styles.timelineContainer}>
                <svg
                  viewBox="0 0 840 180"
                  className={styles.timelineSvg}
                  style={{ width: '100%', height: '180px' }}
                >
                  {/* Grid lines at 25%, 50%, 75%, 100% */}
                  {[0.25, 0.5, 0.75, 1.0].map((frac) => {
                    const y = 145 - frac * 115
                    return (
                      <g key={frac}>
                        <line x1="45" y1={y} x2="820" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x="40" y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
                          {(maxHorasDia * frac).toFixed(0)}h
                        </text>
                      </g>
                    )
                  })}

                  {/* Línea horizontal del Promedio */}
                  {promedioHorasDia > 0 && (
                    <g>
                      <line
                        x1="45"
                        y1={145 - (promedioHorasDia / maxHorasDia) * 115}
                        x2="820"
                        y2={145 - (promedioHorasDia / maxHorasDia) * 115}
                        stroke="#ea580c"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}

                  {/* Barras de cada día */}
                  {statsDiarias.map((d, idx) => {
                    const totalDays = statsDiarias.length
                    const usableWidth = 775
                    const slotWidth = usableWidth / totalDays
                    const barWidth = Math.max(Math.min(slotWidth * 0.72, 18), 7)
                    const x = 45 + idx * slotWidth + (slotWidth - barWidth) / 2
                    const barHeight = d.horas > 0 ? Math.max((d.horas / maxHorasDia) * 115, 3) : 2
                    const y = 145 - barHeight
                    const isAboveAvg = d.horas >= promedioHorasDia && d.horas > 0

                    return (
                      <g key={d.dia}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={barHeight > 4 ? 3 : 1}
                          fill={d.horas > 0 ? (isAboveAvg ? '#0f3d3e' : '#38bdf8') : '#e2e8f0'}
                          className={styles.timelineBar}
                        >
                          <title>{`Día ${d.dia}: ${d.horas.toFixed(2)} hrs (S/. ${d.monto.toFixed(2)})`}</title>
                        </rect>
                        {(totalDays <= 16 || d.dia % 2 !== 0 || d.dia === totalDays) && (
                          <text
                            x={x + barWidth / 2}
                            y="162"
                            textAnchor="middle"
                            fontSize="9"
                            fill="#64748b"
                            fontWeight={d.horas > 0 ? 600 : 400}
                          >
                            {d.dia}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', padding: '0 8px', flexWrap: 'wrap', gap: '8px' }}>
                  <span>Días del mes</span>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#0f3d3e' }} /> Sobre promedio
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#38bdf8' }} /> Regular
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '12px', height: '2px', background: '#ea580c', borderTop: '1px dashed #ea580c' }} /> Promedio ({promedioHorasDia.toFixed(1)}h)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grilla 2x2 de Gráficos */}
          <div className={styles.chartsGrid}>
            {/* Gráfico 2: Donut Ágil vs Proyectos Tradicionales */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3 className={styles.chartTitle}>Línea Ágil vs Proyectos Tradicionales</h3>
                  <p className={styles.chartSubtitle}>Proporción y presupuesto de inversión</p>
                </div>
                <span className={styles.chartTag}>Distribución Oficial</span>
              </div>

              <div className={styles.donutContainer}>
                <div className={styles.donutSvgWrapper}>
                  <svg width="170" height="170" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="54" fill="none" stroke="#f1f5f9" strokeWidth="18" />
                    {statsAgilVsProy.horasAgil > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r="54"
                        fill="none"
                        stroke="#ea580c"
                        strokeWidth="18"
                        strokeDasharray={`${(statsAgilVsProy.pctAgil / 100) * 339.292} 339.292`}
                        strokeDashoffset="0"
                        transform="rotate(-90 80 80)"
                      />
                    )}
                    {statsAgilVsProy.horasProyectos > 0 && (
                      <circle
                        cx="80"
                        cy="80"
                        r="54"
                        fill="none"
                        stroke="#0f3d3e"
                        strokeWidth="18"
                        strokeDasharray={`${(statsAgilVsProy.pctProyectos / 100) * 339.292} 339.292`}
                        strokeDashoffset={`${-((statsAgilVsProy.pctAgil / 100) * 339.292)}`}
                        transform="rotate(-90 80 80)"
                      />
                    )}
                    <text x="80" y="74" textAnchor="middle" fill="#111827" fontSize="16" fontWeight="700">
                      {totalHorasGeneral.toFixed(1)}h
                    </text>
                    <text x="80" y="92" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600" letterSpacing="0.05em">
                      TOTAL HORAS
                    </text>
                  </svg>
                </div>

                <div className={styles.donutLegend}>
                  <div className={styles.donutLegendItem}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.donutDot} style={{ background: '#ea580c' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>Línea Ágil</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          S/. {statsAgilVsProy.montoAgil.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#ea580c' }}>
                        {statsAgilVsProy.pctAgil.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {statsAgilVsProy.horasAgil.toFixed(1)} hrs
                      </div>
                    </div>
                  </div>

                  <div className={styles.donutLegendItem}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.donutDot} style={{ background: '#0f3d3e' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>Proyectos Tradicionales</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          S/. {statsAgilVsProy.montoProyectos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f3d3e' }}>
                        {statsAgilVsProy.pctProyectos.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {statsAgilVsProy.horasProyectos.toFixed(1)} hrs
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico 3: Horas por Agrupador de Negocio */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3 className={styles.chartTitle}>Horas por Agrupador de Negocio</h3>
                  <p className={styles.chartSubtitle}>Distribución según capacidad operativa</p>
                </div>
                <span className={styles.chartTag}>{statsAgrupadores.length} Agrupadores</span>
              </div>

              <div className={styles.barList}>
                {statsAgrupadores.map((agr, i) => {
                  const colors = ['#0f3d3e', '#ea580c', '#2563eb', '#10b981', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#64748b']
                  const color = colors[i % colors.length]
                  return (
                    <div key={agr.nombre} className={styles.barItem}>
                      <div className={styles.barItemHeader}>
                        <span className={styles.barItemName}>
                          <span className={styles.donutDot} style={{ background: color }} />
                          {agr.nombre}
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>
                            ({agr.tareasCount} tareas)
                          </span>
                        </span>
                        <span className={styles.barItemValue}>
                          {agr.horas.toFixed(1)} hrs
                          <span className={styles.barItemSub}>({agr.porcentaje.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${agr.porcentaje}%`, background: color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Gráfico 4: Top Tareas con Mayor Inversión */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3 className={styles.chartTitle}>Top Tareas con Mayor Inversión</h3>
                  <p className={styles.chartSubtitle}>Requerimientos que concentran más esfuerzo</p>
                </div>
                <span className={styles.chartTag}>Top {topTareas.length}</span>
              </div>

              <div className={styles.barList}>
                {topTareas.map((t, i) => {
                  const pctOfMax = (t.totalHoras / maxHorasTopTarea) * 100
                  const monto = t.totalHoras * costoHora
                  return (
                    <div key={t.tarea_periodo_id} className={styles.barItem}>
                      <div className={styles.barItemHeader}>
                        <span className={styles.barItemName} title={t.tarea_nombre}>
                          <span style={{ fontWeight: 700, color: '#64748b', fontSize: '11px' }}>#{i + 1}</span>
                          {t.tarea_nombre}
                          {t.esAgil ? (
                            <span className={styles.tagAgil} style={{ fontSize: '9px', padding: '1px 4px' }}>Ágil</span>
                          ) : (
                            <span className={styles.tagProy} style={{ fontSize: '9px', padding: '1px 4px' }}>Proy</span>
                          )}
                        </span>
                        <span className={styles.barItemValue}>
                          {t.totalHoras.toFixed(1)} hrs
                          <span className={styles.barItemSub}>
                            S/. {monto.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{
                            width: `${pctOfMax}%`,
                            background: t.esAgil ? '#ea580c' : '#0f3d3e'
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Gráfico 5: Distribución e Inversión por Equipo */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3 className={styles.chartTitle}>Distribución e Inversión por Equipo</h3>
                  <p className={styles.chartSubtitle}>Consumo de horas según asignación técnica</p>
                </div>
                <span className={styles.chartTag}>{statsEquipos.length} Equipos</span>
              </div>

              <div className={styles.barList}>
                {statsEquipos.map((eq, i) => {
                  const colors = ['#2563eb', '#10b981', '#8b5cf6', '#0f3d3e', '#ea580c', '#06b6d4', '#f59e0b', '#ec4899', '#64748b']
                  const color = colors[i % colors.length]
                  return (
                    <div key={eq.team} className={styles.barItem}>
                      <div className={styles.barItemHeader}>
                        <span className={styles.barItemName}>
                          <span className={styles.donutDot} style={{ background: color }} />
                          {eq.team}
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>
                            ({eq.tareasCount} tareas)
                          </span>
                        </span>
                        <span className={styles.barItemValue}>
                          {eq.horas.toFixed(1)} hrs
                          <span className={styles.barItemSub}>
                            S/. {eq.monto.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${eq.porcentaje}%`, background: color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Gráfico 6 (Wide): Carga de Trabajo por Colaborador */}
          <div className={styles.chartCardWide}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>Carga de Trabajo por Colaborador</h3>
                <p className={styles.chartSubtitle}>Desglose operativo individual por recurso asignado</p>
              </div>
              <span className={styles.chartTag}>{statsRecursos.length} Colaboradores</span>
            </div>

            <div className={styles.chartsGrid}>
              {statsRecursos.map((r, i) => {
                const pct = (r.horas / maxHorasRecurso) * 100
                return (
                  <div key={r.nombre} className={styles.barItem} style={{ background: '#f8fafc', padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                    <div className={styles.barItemHeader}>
                      <span className={styles.barItemName}>
                        <span style={{ fontWeight: 700, color: '#64748b', fontSize: '11px' }}>#{i + 1}</span>
                        {r.nombre}
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                          ({r.team})
                        </span>
                      </span>
                      <span className={styles.barItemValue}>
                        {r.horas.toFixed(1)} hrs
                        <span className={styles.barItemSub}>
                          · {r.logsCount} logs
                        </span>
                      </span>
                    </div>
                    <div className={styles.barTrack} style={{ marginTop: '4px' }}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${pct}%`, background: '#0284c7' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── VISTA: DETALLE DE TAREAS & REGISTROS (TABLA EXACTA IMAGEN 3) ──── */}
      {activeTab === 'detalle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Barra de Filtros */}
          <div className={styles.toolbar}>
            <div className={styles.filtersGroup}>
              <input
                className={styles.input}
                placeholder="Buscar por tarea o detalle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <select
                className={styles.select}
                value={selectedDuracion}
                onChange={(e) => setSelectedDuracion(e.target.value as any)}
              >
                <option value="todas">Todas las duraciones</option>
                <option value="mas_50h">Tareas Largas (&gt; 50 hrs)</option>
                <option value="hasta_50h">Tareas Estándar (≤ 50 hrs)</option>
              </select>

              <select
                className={styles.select}
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
                className={styles.select}
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
                className={styles.select}
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
                className={styles.select}
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

              {hasActiveFilters && (
                <button className={styles.btnClear} onClick={limpiarFiltros}>
                  Limpiar
                </button>
              )}
            </div>

            <div className={styles.actionsGroup}>
              <button
                type="button"
                className={styles.btnSave}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar Observaciones'}
                {pendingChangesCount > 0 && (
                  <span className={styles.pendingBadge}>{pendingChangesCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Tabla de Detalle Oficial */}
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 className={styles.cardTitle}>Detalle de Actividades y Tareas</h2>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  ({tareasResumen.length} tareas · {filasExcel.length} registros)
                </span>
              </div>
              <button
                type="button"
                className={styles.btnToggleSub}
                onClick={toggleAll}
              >
                Expandir / Colapsar Todo
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.excelTable}>
                <thead>
                  <tr>
                    <th style={{ width: '280px' }}>Taskname</th>
                    <th style={{ width: '100px' }}>Fecha</th>
                    <th style={{ width: '130px' }}>Asignado</th>
                    <th style={{ width: '130px' }}>Solicitante</th>
                    <th style={{ width: '150px' }}>Pry - Protecta</th>
                    <th style={{ width: '140px' }}>Agrupador</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Horas tomadas</th>
                    <th style={{ width: '250px' }}>Comentario PS</th>
                    <th style={{ width: '250px' }}>Comentario DM</th>
                  </tr>
                </thead>
                <tbody>
                  {filasExcel.map((fila) => {
                    const tipo = fila.esTarea ? 'TAREA' : 'REGISTRO'
                    const refId = fila.esTarea ? fila.tarea_periodo_id : fila.id
                    const dmReply = comentariosDM[`${tipo}-${refId}`]
                    const isExpanded = expandedTasks[fila.tarea_periodo_id] !== false

                    return (
                      <tr key={`${tipo}-${refId}`} className={fila.esTarea ? styles.rowTask : styles.rowRecord}>
                        {/* Taskname */}
                        <td
                          style={{
                            fontWeight: fila.esTarea ? 'bold' : 'normal',
                            paddingLeft: fila.esTarea ? '12px' : '28px',
                            cursor: fila.esTarea ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (fila.esTarea) toggleTask(fila.tarea_periodo_id)
                          }}
                        >
                          {fila.esTarea ? (
                            <span>
                              {isExpanded ? '▼ ' : '▶ '}
                              {fila.tarea_nombre}
                              {fila.esAgil ? (
                                <span className={styles.tagAgil}>Ágil</span>
                              ) : (
                                <span className={styles.tagProy}>Proy</span>
                              )}
                            </span>
                          ) : (
                            `↳ ${fila.descripcion || fila.tarea_nombre}`
                          )}
                        </td>

                        {/* Fecha */}
                        <td>
                          {fila.esTarea
                            ? '-'
                            : new Date(fila.fecha).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                        </td>

                        {/* Asignado */}
                        <td style={{ color: fila.esTarea ? '#0f172a' : '#475569' }}>
                          {fila.esTarea ? fila.team_nombre || '-' : fila.trabajador_nombre || fila.team_nombre || '-'}
                        </td>

                        {/* Solicitante */}
                        <td style={{ color: fila.esTarea ? '#0f172a' : '#475569' }}>
                          {fila.solicitante_nombre || '-'}
                        </td>

                        {/* Pry - Protecta */}
                        <td style={{ color: fila.esTarea ? '#0f172a' : '#475569' }}>
                          {fila.proyecto_nombre || '-'}
                        </td>

                        {/* Agrupador */}
                        <td style={{ color: fila.esTarea ? '#0f172a' : '#475569' }}>
                          {fila.agrupador_nombre || '-'}
                        </td>

                        {/* Horas tomadas */}
                        <td style={{ fontWeight: 'bold', textAlign: 'right' }}>
                          {fila.esTarea ? fila.totalHoras.toFixed(2) : Number(fila.horas).toFixed(2)}
                        </td>

                        {/* Comentario PS (Editable por Protecta) */}
                        <td style={{ padding: '6px' }}>
                          <textarea
                            className={styles.textarea}
                            placeholder={
                              fila.esTarea
                                ? 'Observación a la tarea general...'
                                : 'Observación al registro diario...'
                            }
                            value={
                              fila.esTarea
                                ? comentariosPS.tareas[refId] || ''
                                : comentariosPS.registros[refId] || ''
                            }
                            onChange={(e) =>
                              handleChange(fila.esTarea ? 'tareas' : 'registros', refId, e.target.value)
                            }
                          />
                        </td>

                        {/* Comentario DM (Lectura de Dev) */}
                        <td style={{ padding: '6px' }}>
                          {dmReply ? (
                            <div className={styles.replyContainer}>
                              <div className={styles.replyAuthor}>Respuesta Dev:</div>
                              {dmReply}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                              Sin comentario
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── VISTA 3: EQUIPOS & RECURSOS ─────────────────────────────────────── */}
      {activeTab === 'equipos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Desglose por Equipos */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: '14px' }}>
              Resumen por Equipo Asignado
            </h2>
            <div className={styles.tableWrapper} style={{ maxHeight: '350px' }}>
              <table className={styles.excelTable}>
                <thead>
                  <tr>
                    <th className={styles.resumenTh} style={{ textAlign: 'left' }}>Equipo</th>
                    <th className={styles.resumenTh} style={{ width: '130px', textAlign: 'center' }}>Tareas Asignadas</th>
                    <th className={styles.resumenTh} style={{ width: '150px', textAlign: 'right' }}>Horas Consumidas</th>
                    <th className={styles.resumenTh} style={{ width: '180px', textAlign: 'right' }}>Monto Liquidación (S/.)</th>
                    <th className={styles.resumenTh} style={{ width: '130px', textAlign: 'right' }}>Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {statsEquipos.map((eq) => (
                    <tr key={eq.team}>
                      <td style={{ fontWeight: 600 }}>{eq.team}</td>
                      <td style={{ textAlign: 'center' }}>{eq.tareasCount}</td>
                      <td style={{ textAlign: 'right' }}>{eq.horas.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {eq.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }}>{eq.porcentaje.toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <td style={{ textAlign: 'left' }}>TOTAL EQUIPOS</td>
                    <td style={{ textAlign: 'center' }}>-</td>
                    <td style={{ textAlign: 'right' }}>{totalHorasGeneral.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {(totalHorasGeneral * costoHora).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right' }}>100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Desglose por Recurso / Colaborador */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle} style={{ marginBottom: '14px' }}>
              Resumen por Colaborador / Recurso
            </h2>
            <div className={styles.tableWrapper} style={{ maxHeight: '420px' }}>
              <table className={styles.excelTable}>
                <thead>
                  <tr>
                    <th className={styles.resumenTh} style={{ textAlign: 'left' }}>Colaborador</th>
                    <th className={styles.resumenTh} style={{ width: '180px', textAlign: 'left' }}>Equipo</th>
                    <th className={styles.resumenTh} style={{ width: '130px', textAlign: 'center' }}>Registros</th>
                    <th className={styles.resumenTh} style={{ width: '150px', textAlign: 'right' }}>Horas Registradas</th>
                    <th className={styles.resumenTh} style={{ width: '180px', textAlign: 'right' }}>Monto Liquidación (S/.)</th>
                  </tr>
                </thead>
                <tbody>
                  {statsRecursos.map((rec) => (
                    <tr key={rec.nombre}>
                      <td style={{ fontWeight: 600 }}>{rec.nombre}</td>
                      <td>{rec.team}</td>
                      <td style={{ textAlign: 'center' }}>{rec.logsCount}</td>
                      <td style={{ textAlign: 'right' }}>{rec.horas.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {rec.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <td style={{ textAlign: 'left' }}>TOTAL GENERAL</td>
                    <td>-</td>
                    <td style={{ textAlign: 'center' }}>-</td>
                    <td style={{ textAlign: 'right' }}>{totalHorasGeneral.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {(totalHorasGeneral * costoHora).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── VISTA 4: BÓVEDA DE ARCHIVOS ("DRIVE") ───────────────────────────── */}
      {activeTab === 'descargas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.driveCard}>
            <div>
              <h2 className={styles.driveCardTitle}>
                Reporte Oficial de Tareo Protecta (.xlsx)
              </h2>
              <p className={styles.driveCardDesc}>
                Descarga directa del libro contable oficial del período {periodoLabel}. Contiene todas las hojas auditadas idénticas a las que se entregan a supervisión:
              </p>
            </div>

            <div className={styles.fileSheetList}>
              <div>• <strong>Hoja 1: Resumen-2</strong> (Resumen ejecutivo consolidado Ágil vs Proyectos)</div>
              <div>• <strong>Hoja 2: Agrupador</strong> (Distribución por agrupadores y subtotales)</div>
              <div>• <strong>Hoja 3: Ágil</strong> (Detalle de actividades ágiles con observaciones PS y Dev)</div>
              <div>• <strong>Hoja 4: Proyectos</strong> (Detalle de requerimientos de proyectos tradicionales)</div>
              <div>• <strong>Hojas 5 y 6: Equipos & Recursos</strong> (Desglose por squad y colaboradores)</div>
            </div>

            <button
              type="button"
              className={styles.btnExcel}
              onClick={handleDownloadExcel}
              disabled={exportingExcel}
              style={{ width: 'fit-content' }}
            >
              {exportingExcel ? 'Generando archivo...' : 'Descargar Archivo Oficial (.xlsx)'}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}