'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
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
  AlertCircle,
  History,
  Activity,
  Layers,
  Users,
  Briefcase
} from 'lucide-react'
import { saveExternalCommentsAction, exportPublicReportExcelAction } from '../actions/tareo.action'
import TareaCicloVidaModal, { CicloVidaModalItem } from './TareaCicloVidaModal'
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

// ─── COMPONENTE MULTI-SELECT REUTILIZABLE CON BÚSQUEDA Y CHECKBOXES ────────
interface MultiSelectFilterProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder: string
  icon?: React.ReactNode
}

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  placeholder,
  icon
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const q = searchQuery.toLowerCase()
    return options.filter((opt) => opt.toLowerCase().includes(q))
  }, [options, searchQuery])

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  const selectAll = () => {
    onChange([...options])
  }

  const clearAll = () => {
    onChange([])
  }

  const displayText = useMemo(() => {
    if (selected.length === 0) return placeholder
    if (selected.length === 1) return selected[0]
    return `${selected.length} seleccionados`
  }, [selected, placeholder])

  return (
    <div className={styles.multiSelectContainer} ref={containerRef}>
      <div
        className={`${styles.multiSelectTrigger} ${selected.length > 0 ? styles.multiSelectTriggerActive : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        title={selected.length > 0 ? selected.join(', ') : placeholder}
      >
        <div className={styles.multiSelectLabelBox}>
          {icon}
          <span>{displayText}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {selected.length > 1 && (
            <span className={styles.multiSelectBadgeCount}>{selected.length}</span>
          )}
          <ChevronDown size={14} color="#64748b" />
        </div>
      </div>

      {open && (
        <div className={styles.multiSelectPopover}>
          <div className={styles.popoverHeader}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
              {label} ({options.length})
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={styles.popoverActionBtn}
                onClick={selectAll}
              >
                Todos
              </button>
              {selected.length > 0 && (
                <button
                  type="button"
                  className={styles.popoverActionBtn}
                  onClick={clearAll}
                  style={{ color: '#ef4444' }}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {options.length > 4 && (
            <div className={styles.popoverSearchBox}>
              <input
                className={styles.popoverSearchInput}
                placeholder={`Buscar en ${label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8'
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className={styles.popoverList}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                Sin resultados
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt)
                return (
                  <label
                    key={opt}
                    className={`${styles.popoverOption} ${isSelected ? styles.popoverOptionSelected : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOption(opt)}
                      style={{ accentColor: '#0f3d3e', cursor: 'pointer' }}
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

export default function PublicReportTable({
  token,
  registros,
  tareasPeriodo = [],
  feedback,
  linkId,
  costoHora = 65,
  periodo,
  initialFilters = {}
}: Props) {
  const [saving, setSaving] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({})
  const [cicloVidaModalItem, setCicloVidaModalItem] = useState<CicloVidaModalItem | null>(null)

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

  // ─── 1. ESTADOS DE FILTROS (MULTI-SELECCIÓN) ───────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedComentarioEstado, setSelectedComentarioEstado] = useState<ComentarioEstadoFiltro>('todos')
  const [selectedDuracion, setSelectedDuracion] = useState<'todas' | 'mas_50h' | 'hasta_50h'>(
    (initialFilters.duracionFiltro as any) || 'todas'
  )

  const [selectedPry, setSelectedPry] = useState<string[]>(() => {
    if (initialFilters.proyectoId) {
      const match = registros.find((r) => r.proyecto_id === initialFilters.proyectoId)
      return match?.proyecto_nombre ? [match.proyecto_nombre] : []
    }
    return []
  })

  const [selectedSolicitante, setSelectedSolicitante] = useState<string[]>(() => {
    if (initialFilters.solicitanteId) {
      const match = registros.find((r) => r.solicitante_id === initialFilters.solicitanteId)
      return match?.solicitante_nombre ? [match.solicitante_nombre] : []
    }
    return []
  })

  const [selectedTeam, setSelectedTeam] = useState<string[]>(() => {
    if (initialFilters.teamId) {
      const match = registros.find((r) => r.team_id === initialFilters.teamId)
      return match?.team_nombre ? [match.team_nombre] : []
    }
    return []
  })

  const [selectedAgrupador, setSelectedAgrupador] = useState<string[]>(() => {
    if (initialFilters.agrupadorId) {
      const match = registros.find((r) => r.agrupador_id === initialFilters.agrupadorId)
      return match?.agrupador_nombre ? [match.agrupador_nombre] : []
    }
    return []
  })

  const [selectedActividades, setSelectedActividades] = useState<string[]>([])
  const [selectedEstados, setSelectedEstados] = useState<string[]>([])

  // ─── 2. ESTADOS DE LAS TAREAS Y REGISTROS (Nacen en Pendiente, y fluyen a Observado, Actualizado, Aprobado) ───
  const [estadosTareas, setEstadosTareas] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    registros.forEach((r) => {
      if (r.tarea_periodo_id && !map[r.tarea_periodo_id]) {
        const raw = (r.estado_tarea || '').toLowerCase()
        if (raw.includes('observ')) map[r.tarea_periodo_id] = 'Observado'
        else if (raw.includes('aprob') || raw.includes('conform')) map[r.tarea_periodo_id] = 'Aprobado'
        else if (raw.includes('actualiz')) map[r.tarea_periodo_id] = 'Actualizado'
        else map[r.tarea_periodo_id] = 'Pendiente' // Nace en pendiente
      }
    })
    if (Array.isArray(tareasPeriodo)) {
      tareasPeriodo.forEach((tp) => {
        if (!map[tp.tarea_periodo_id]) {
          const raw = (tp.estado_nombre || '').toLowerCase()
          if (raw.includes('observ')) map[tp.tarea_periodo_id] = 'Observado'
          else if (raw.includes('aprob') || raw.includes('conform')) map[tp.tarea_periodo_id] = 'Aprobado'
          else if (raw.includes('actualiz')) map[tp.tarea_periodo_id] = 'Actualizado'
          else map[tp.tarea_periodo_id] = 'Pendiente'
        }
      })
    }
    return map
  })

  const [estadosRegistros, setEstadosRegistros] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    registros.forEach((r) => {
      if (r.id) {
        const raw = (r.estado_registro || r.estado || '').toLowerCase()
        if (raw.includes('observ')) map[r.id] = 'Observado'
        else if (raw.includes('aprob') || raw.includes('conform')) map[r.id] = 'Aprobado'
        else if (raw.includes('actualiz')) map[r.id] = 'Actualizado'
        else map[r.id] = 'Pendiente' // Nace en pendiente
      }
    })
    return map
  })

  // ─── 3. COMENTARIOS PROTECTA (PS) Y DEV (DM) ─────────────────────────────
  const [comentariosPS, setComentariosPS] = useState<{
    tareas: Record<number, string>
    registros: Record<number, string>
  }>(() => {
    const state = { tareas: {} as Record<number, string>, registros: {} as Record<number, string> }

    registros.forEach((r) => {
      if (r.tarea_periodo_id && r.comentario_periodo && !state.tareas[r.tarea_periodo_id]) {
        state.tareas[r.tarea_periodo_id] = r.comentario_periodo
      }
      if (r.id && r.comentario && !state.registros[r.id]) {
        state.registros[r.id] = r.comentario
      }
    })

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

    registros.forEach((r) => {
      if (r.tarea_periodo_id && r.comentario_dm && !state.tareas[r.tarea_periodo_id]) {
        state.tareas[r.tarea_periodo_id] = r.comentario_dm
      }
    })

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

  const [savedHash, setSavedHash] = useState<Record<string, { ps: string; dm: string; estado?: string }>>(() => {
    const map: Record<string, { ps: string; dm: string; estado?: string }> = {}

    registros.forEach((r) => {
      if (r.tarea_periodo_id && !map[`TAREA-${r.tarea_periodo_id}`]) {
        const raw = (r.estado_tarea || '').toLowerCase()
        let est = 'Pendiente'
        if (raw.includes('observ')) est = 'Observado'
        else if (raw.includes('aprob') || raw.includes('conform')) est = 'Aprobado'
        else if (raw.includes('actualiz')) est = 'Actualizado'

        map[`TAREA-${r.tarea_periodo_id}`] = {
          ps: r.comentario_periodo || '',
          dm: r.comentario_dm || '',
          estado: est
        }
      }
      if (r.id && !map[`REGISTRO-${r.id}`]) {
        const raw = (r.estado_registro || r.estado || '').toLowerCase()
        let est = 'Pendiente'
        if (raw.includes('observ')) est = 'Observado'
        else if (raw.includes('aprob') || raw.includes('conform')) est = 'Aprobado'
        else if (raw.includes('actualiz')) est = 'Actualizado'

        map[`REGISTRO-${r.id}`] = {
          ps: r.comentario || '',
          dm: '',
          estado: est
        }
      }
    })

    feedback.forEach((f) => {
      const key = `${f.referencia_tipo}-${f.referencia_id}`
      map[key] = {
        ps: f.comentario_protecta !== undefined && f.comentario_protecta !== null ? f.comentario_protecta : (map[key]?.ps || ''),
        dm: f.comentario_dev !== undefined && f.comentario_dev !== null ? f.comentario_dev : (map[key]?.dm || ''),
        estado: map[key]?.estado || 'Pendiente'
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
    Object.entries(estadosTareas).forEach(([id, st]) => {
      if (st !== (savedHash[`TAREA-${id}`]?.estado || 'Pendiente')) count++
    })
    Object.entries(estadosRegistros).forEach(([id, st]) => {
      if (st !== (savedHash[`REGISTRO-${id}`]?.estado || 'Pendiente')) count++
    })
    return count
  }, [comentariosPS, comentariosDM, estadosTareas, estadosRegistros, savedHash])

  // ─── 4. OPCIONES DE FILTROS ──────────────────────────────────────────────
  const opciones = useMemo(() => {
    const pry = new Set<string>()
    const sol = new Set<string>()
    const tea = new Set<string>()
    const agr = new Set<string>()
    const act = new Set<string>()

    registros.forEach((r) => {
      if (r.proyecto_nombre) pry.add(r.proyecto_nombre)
      if (r.solicitante_nombre) sol.add(r.solicitante_nombre)
      if (r.team_nombre) tea.add(r.team_nombre)
      if (r.agrupador_nombre) agr.add(r.agrupador_nombre)
      const desc = (r.descripcion || r.comentario || '').trim()
      if (desc) act.add(desc)
    })

    return {
      proyectos: Array.from(pry).sort(),
      solicitantes: Array.from(sol).sort(),
      teams: Array.from(tea).sort(),
      agrupadores: Array.from(agr).sort(),
      actividades: Array.from(act).sort(),
      estados: ['Pendiente', 'Observado', 'Actualizado', 'Aprobado']
    }
  }, [registros])

  // ─── 5. LÓGICA DE FILTRADO Y AGRUPACIÓN POR TAREA ────────────────────────
  const { filasExcel, tareasResumen, countsEstadoComentarios, totalTareasBase, totalHorasBase } = useMemo(() => {
    const grupos: Record<number, any> = {}

    // 1. Agregar únicamente tareas que tienen registros operativos
    registros.forEach((reg) => {
      const tId = reg.tarea_periodo_id
      if (!tId) return

      if (!grupos[tId]) {
        const agName = reg.agrupador_nombre || ''
        const esAgil =
          reg.es_agil === true ||
          /ágil|agil|ongoing|mejora|evolutivo/i.test(agName) ||
          /ágil|agil|ongoing/i.test(reg.tarea_nombre || '')

        grupos[tId] = {
          esTarea: true,
          tarea_periodo_id: tId,
          tarea_id: reg.tarea_id,
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
        tarea_id: reg.tarea_id,
        tarea_nombre: reg.tarea_nombre,
        descripcion: reg.descripcion || reg.comentario,
        fecha: reg.fecha,
        horas: reg.horas,
        trabajador_nombre: reg.trabajador_nombre,
        team_nombre: reg.team_nombre,
        solicitante_nombre: reg.solicitante_nombre,
        proyecto_nombre: reg.proyecto_nombre,
        agrupador_nombre: reg.agrupador_nombre
      })
    })

    // Excluir cualquier tarea sin registros operativos o con 0 horas
    const todosGrupos = Object.values(grupos).filter(
      (g: any) => Array.isArray(g.detalle) && g.detalle.length > 0 && Number(g.totalHoras) > 0
    )
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

    // Aplicar filtros multi-selección
    const searchLower = searchTerm.toLowerCase().trim()

    const gruposFiltrados = todosGrupos.filter((g: any) => {
      // 1. Filtro Proyectos (más de uno)
      if (selectedPry.length > 0 && !selectedPry.includes(g.proyecto_nombre)) return false

      // 2. Filtro Solicitantes (más de uno)
      if (selectedSolicitante.length > 0 && !selectedSolicitante.includes(g.solicitante_nombre)) return false

      // 3. Filtro Equipos (más de uno)
      if (selectedTeam.length > 0 && !selectedTeam.includes(g.team_nombre)) return false

      // 4. Filtro Agrupadores (más de uno)
      if (selectedAgrupador.length > 0 && !selectedAgrupador.includes(g.agrupador_nombre)) return false

      // 5. Filtro Estados (más de uno, coincide si la tarea o alguno de sus registros coincide)
      const curEstado = estadosTareas[g.tarea_periodo_id] || 'Pendiente'
      const matchTareaEstado = selectedEstados.length === 0 || selectedEstados.includes(curEstado)
      const matchRegistroEstado = selectedEstados.length === 0 || g.detalle.some((d: any) => selectedEstados.includes(estadosRegistros[d.id] || 'Pendiente'))
      if (!matchTareaEstado && !matchRegistroEstado) return false

      // 6. Filtro Actividades (más de una actividad)
      if (selectedActividades.length > 0) {
        const matchesActividad = g.detalle.some((d: any) =>
          selectedActividades.includes((d.descripcion || '').trim())
        )
        if (!matchesActividad) return false
      }

      // 7. Filtro Duración
      if (selectedDuracion === 'mas_50h' && g.totalHoras <= 50) return false
      if (selectedDuracion === 'hasta_50h' && g.totalHoras > 50) return false

      // 8. Filtro Estado de Comentarios (Tabs rápidas)
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

      // 9. Búsqueda Global
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

    // Lista plana para la tabla de detalle (desplegando hijos según corresponda)
    const listaPlana: any[] = []
    gruposFiltrados.forEach((g: any) => {
      listaPlana.push(g)
      const isExpanded = expandedTasks[g.tarea_periodo_id] !== false
      if (isExpanded) {
        const taskEstado = estadosTareas[g.tarea_periodo_id] || 'Pendiente'
        // Si hay filtro de actividades o estados activo, filtrar registros hijos correspondientes
        let hijos = g.detalle
        if (selectedActividades.length > 0) {
          hijos = hijos.filter((d: any) => selectedActividades.includes((d.descripcion || '').trim()))
        }
        if (selectedEstados.length > 0 && !selectedEstados.includes(taskEstado)) {
          hijos = hijos.filter((d: any) => selectedEstados.includes(estadosRegistros[d.id] || 'Pendiente'))
        }

        hijos.forEach((det: any) => listaPlana.push(det))
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
    tareasPeriodo,
    searchTerm,
    selectedDuracion,
    selectedPry,
    selectedSolicitante,
    selectedTeam,
    selectedAgrupador,
    selectedActividades,
    selectedEstados,
    selectedComentarioEstado,
    expandedTasks,
    comentariosPS,
    comentariosDM,
    estadosTareas
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
    if (selectedPry.length > 0) count++
    if (selectedSolicitante.length > 0) count++
    if (selectedTeam.length > 0) count++
    if (selectedAgrupador.length > 0) count++
    if (selectedActividades.length > 0) count++
    if (selectedEstados.length > 0) count++
    if (selectedComentarioEstado !== 'todos') count++
    return count
  }, [
    searchTerm,
    selectedDuracion,
    selectedPry,
    selectedSolicitante,
    selectedTeam,
    selectedAgrupador,
    selectedActividades,
    selectedEstados,
    selectedComentarioEstado
  ])

  const limpiarFiltros = () => {
    setSearchTerm('')
    setSelectedDuracion('todas')
    setSelectedPry([])
    setSelectedSolicitante([])
    setSelectedTeam([])
    setSelectedAgrupador([])
    setSelectedActividades([])
    setSelectedEstados([])
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

  const handleEstadoChange = (tareaPeriodoId: number, nuevoEstado: string) => {
    setEstadosTareas((prev) => ({
      ...prev,
      [tareaPeriodoId]: nuevoEstado
    }))
  }

  const handleRegistroEstadoChange = (registroId: number, nuevoEstado: string) => {
    setEstadosRegistros((prev) => ({
      ...prev,
      [registroId]: nuevoEstado
    }))
  }

  const handleCicloVidaStateChanged = (id: number, nuevoEstado: string, tipo?: 'TAREA' | 'REGISTRO') => {
    if (tipo === 'REGISTRO') {
      handleRegistroEstadoChange(id, nuevoEstado)
      setSavedHash((prev) => ({
        ...prev,
        [`REGISTRO-${id}`]: {
          ...(prev[`REGISTRO-${id}`] || { ps: '', dm: '' }),
          estado: nuevoEstado
        }
      }))
    } else {
      handleEstadoChange(id, nuevoEstado)
      setSavedHash((prev) => ({
        ...prev,
        [`TAREA-${id}`]: {
          ...(prev[`TAREA-${id}`] || { ps: '', dm: '' }),
          estado: nuevoEstado
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

  // Guardar Observaciones, Comentarios y Estados
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
          estado?: string
          actor?: string
        }
      > = {}

      // Tareas con comentarios modificados
      Object.entries(comentariosPS.tareas).forEach(([idStr, psTxt]) => {
        const id = Number(idStr)
        const dmTxt = comentariosDM.tareas[id] || ''
        const init = savedHash[`TAREA-${id}`] || { ps: '', dm: '', estado: 'Pendiente' }
        if ((psTxt || '') !== init.ps || (dmTxt || '') !== init.dm) {
          commentsMap[`TAREA-${id}`] = {
            tipo: 'TAREA',
            id,
            comentario_protecta: psTxt || '',
            comentario_dev: dmTxt || '',
            estado: estadosTareas[id] || init.estado || 'Pendiente'
          }
        }
      })

      Object.entries(comentariosDM.tareas).forEach(([idStr, dmTxt]) => {
        const id = Number(idStr)
        const psTxt = comentariosPS.tareas[id] || ''
        const init = savedHash[`TAREA-${id}`] || { ps: '', dm: '', estado: 'Pendiente' }
        if ((psTxt || '') !== init.ps || (dmTxt || '') !== init.dm) {
          commentsMap[`TAREA-${id}`] = {
            tipo: 'TAREA',
            id,
            comentario_protecta: psTxt || '',
            comentario_dev: dmTxt || '',
            estado: estadosTareas[id] || init.estado || 'Pendiente'
          }
        }
      })

      // Tareas con cambios de estado
      Object.entries(estadosTareas).forEach(([idStr, st]) => {
        const id = Number(idStr)
        const init = savedHash[`TAREA-${id}`] || { ps: '', dm: '', estado: 'Pendiente' }
        if (st !== (init.estado || 'Pendiente')) {
          if (!commentsMap[`TAREA-${id}`]) {
            commentsMap[`TAREA-${id}`] = {
              tipo: 'TAREA',
              id,
              comentario_protecta: comentariosPS.tareas[id] || '',
              comentario_dev: comentariosDM.tareas[id] || '',
              estado: st,
              actor: 'Portal de Supervisión'
            }
          } else {
            commentsMap[`TAREA-${id}`].estado = st
            commentsMap[`TAREA-${id}`].actor = 'Portal de Supervisión'
          }
        }
      })

      // Registros modificados (comentarios)
      Object.entries(comentariosPS.registros).forEach(([idStr, psTxt]) => {
        const id = Number(idStr)
        const dmTxt = comentariosDM.registros[id] || ''
        const init = savedHash[`REGISTRO-${id}`] || { ps: '', dm: '', estado: 'Pendiente' }
        if ((psTxt || '') !== init.ps || (dmTxt || '') !== init.dm) {
          commentsMap[`REGISTRO-${id}`] = {
            tipo: 'REGISTRO',
            id,
            comentario_protecta: psTxt || '',
            comentario_dev: dmTxt || '',
            estado: estadosRegistros[id] || init.estado || 'Pendiente'
          }
        }
      })

      Object.entries(comentariosDM.registros).forEach(([idStr, dmTxt]) => {
        const id = Number(idStr)
        const psTxt = comentariosPS.registros[id] || ''
        const init = savedHash[`REGISTRO-${id}`] || { ps: '', dm: '', estado: 'Pendiente' }
        if ((psTxt || '') !== init.ps || (dmTxt || '') !== init.dm) {
          commentsMap[`REGISTRO-${id}`] = {
            tipo: 'REGISTRO',
            id,
            comentario_protecta: psTxt || '',
            comentario_dev: dmTxt || '',
            estado: estadosRegistros[id] || init.estado || 'Pendiente'
          }
        }
      })

      // Registros con cambios de estado
      Object.entries(estadosRegistros).forEach(([idStr, st]) => {
        const id = Number(idStr)
        const init = savedHash[`REGISTRO-${id}`] || { ps: '', dm: '', estado: 'Pendiente' }
        if (st !== (init.estado || 'Pendiente')) {
          if (!commentsMap[`REGISTRO-${id}`]) {
            commentsMap[`REGISTRO-${id}`] = {
              tipo: 'REGISTRO',
              id,
              comentario_protecta: comentariosPS.registros[id] || '',
              comentario_dev: comentariosDM.registros[id] || '',
              estado: st,
              actor: 'Portal de Supervisión'
            }
          } else {
            commentsMap[`REGISTRO-${id}`].estado = st
            commentsMap[`REGISTRO-${id}`].actor = 'Portal de Supervisión'
          }
        }
      })

      const commentsArray = Object.values(commentsMap)

      if (commentsArray.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin cambios',
          text: 'No hay comentarios ni estados modificados para guardar.',
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
              dm: c.comentario_dev,
              estado: c.estado || next[`${c.tipo}-${c.id}`]?.estado || 'Pendiente'
            }
          })
          return next
        })

        Swal.fire({
          icon: 'success',
          title: '¡Cambios guardados!',
          text: 'Todos los comentarios, estados y transiciones han sido registrados exitosamente.',
          confirmButtonColor: '#0f3d3e',
          timer: 2200,
          showConfirmButton: false
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: res.error || 'Ocurrió un inconveniente al guardar los comentarios y estados.',
          confirmButtonColor: '#0f3d3e'
        })
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error de red',
        text: 'No se pudo conectar con el servidor para guardar.',
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
      {/* ─── 1. HEADER SUPERIOR EJECUTIVO ──────────────────────────────── */}
      <header className={styles.topNavbar}>
        <div className={styles.navbarBrand}>
          <div className={styles.navbarLogoBox}>
            <FileSpreadsheet size={22} />
          </div>
          <div className={styles.navbarBrandTexts}>
            <h1 className={styles.navbarTitle}>Portal de Supervisión y Tareo</h1>
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
            title="Guardar observaciones, respuestas y estados en la base de datos"
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
        {/* ─── 2. TARJETA DE FILTROS AVANZADOS MULTI-SELECCIÓN ───────────────── */}
        <section className={styles.filterCard}>
          <div className={styles.filterHeader}>
            <div className={styles.filterHeaderTitle}>
              <Filter size={16} color="#0f3d3e" />
              <span>Filtros y Búsqueda Inteligente (Selección Múltiple)</span>
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
                placeholder="Buscar por tarea, colaborador, actividad, descripción, proyecto..."
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

          {/* Fila 2: Selectores Desplegables Multi-Selección */}
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

            <MultiSelectFilter
              label="Proyectos"
              placeholder="Todos los proyectos"
              options={opciones.proyectos}
              selected={selectedPry}
              onChange={setSelectedPry}
              icon={<Briefcase size={13} color="#0f3d3e" />}
            />

            <MultiSelectFilter
              label="Solicitantes"
              placeholder="Todos los solicitantes"
              options={opciones.solicitantes}
              selected={selectedSolicitante}
              onChange={setSelectedSolicitante}
              icon={<User size={13} color="#0f3d3e" />}
            />

            <MultiSelectFilter
              label="Equipos"
              placeholder="Todos los equipos"
              options={opciones.teams}
              selected={selectedTeam}
              onChange={setSelectedTeam}
              icon={<Users size={13} color="#0f3d3e" />}
            />

            <MultiSelectFilter
              label="Agrupadores"
              placeholder="Todos los agrupadores"
              options={opciones.agrupadores}
              selected={selectedAgrupador}
              onChange={setSelectedAgrupador}
              icon={<Layers size={13} color="#0f3d3e" />}
            />

            <MultiSelectFilter
              label="Actividades"
              placeholder="Todas las actividades"
              options={opciones.actividades}
              selected={selectedActividades}
              onChange={setSelectedActividades}
              icon={<Activity size={13} color="#0f3d3e" />}
            />

            <MultiSelectFilter
              label="Estados"
              placeholder="Todos los estados"
              options={opciones.estados}
              selected={selectedEstados}
              onChange={setSelectedEstados}
              icon={<CheckCircle2 size={13} color="#0f3d3e" />}
            />
          </div>

          {/* Fila 3: Resumen dinámico en vivo */}
          <div className={styles.filterSummaryRow}>
            <div>
              Mostrando <strong style={{ color: '#0f172a' }}>{tareasResumen.length}</strong> de {totalTareasBase} tareas
              {' '}·{' '}
              <strong style={{ color: '#0f172a' }}>{totalRegistrosFiltrados}</strong> registros operativos
              {' '}·{' '}
              <strong style={{ color: '#0f3d3e' }}>{totalHorasFiltradas.toFixed(2)} hrs</strong> acumuladas
            </div>
            <div>
              Período evaluado: <strong>{periodoNombre}</strong>
            </div>
          </div>
        </section>

        {/* ─── 3. TABLA DE DETALLE CON JERARQUÍA PADRE VS HIJOS Y ESTADO ──── */}
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
                  <th style={{ width: '280px' }}>Taskname</th>
                  <th style={{ width: '95px' }}>Fecha</th>
                  <th style={{ width: '135px' }}>Asignado</th>
                  <th style={{ width: '130px' }}>Solicitante</th>
                  <th style={{ width: '145px' }}>Pry - Protecta</th>
                  <th style={{ width: '135px' }}>Agrupador</th>
                  <th style={{ width: '105px', textAlign: 'right' }}>Horas tomadas</th>
                  <th style={{ width: '180px', textAlign: 'center' }}>Estado & Ciclo de Vida</th>
                  <th style={{ width: '240px' }}>Comentario PS</th>
                  <th style={{ width: '240px' }}>Comentario DM</th>
                </tr>
              </thead>
              <tbody>
                {filasExcel.map((fila) => {
                  const refId = fila.esTarea ? fila.tarea_periodo_id : fila.id
                  const isExpanded = expandedTasks[fila.tarea_periodo_id] !== false

                  if (fila.esTarea) {
                    const taskEstado = estadosTareas[refId] || 'Pendiente'
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

                        {/* Columna Estado y Ciclo de Vida */}
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <div className={styles.estadoBadgeWrapper}>
                            <select
                              className={`${styles.estadoSelect} ${
                                taskEstado === 'Observado'
                                  ? styles.estadoSelectObservado
                                  : taskEstado === 'Aprobado'
                                  ? styles.estadoSelectAprobado
                                  : taskEstado === 'Actualizado'
                                  ? styles.estadoSelectActualizado
                                  : styles.estadoSelectPendiente
                              }`}
                              value={taskEstado}
                              onChange={(e) => handleEstadoChange(refId, e.target.value)}
                              title="Cambiar estado de la tarea (Nace en Pendiente, y fluye a Observado, Actualizado o Aprobado)"
                            >
                              <option value="Pendiente">Pendiente</option>
                              <option value="Observado">Observado</option>
                              <option value="Actualizado">Actualizado</option>
                              <option value="Aprobado">Aprobado</option>
                            </select>

                            <button
                              type="button"
                              className={styles.btnHistorialCiclo}
                              onClick={() =>
                                setCicloVidaModalItem({
                                  tipo: 'TAREA',
                                  id: fila.tarea_periodo_id,
                                  tarea_id: fila.tarea_id,
                                  nombre: fila.tarea_nombre,
                                  proyecto_nombre: fila.proyecto_nombre,
                                  solicitante_nombre: fila.solicitante_nombre,
                                  team_nombre: fila.team_nombre,
                                  totalHoras: fila.totalHoras,
                                  estado_nombre: taskEstado
                                })
                              }
                              title="Ver línea de tiempo y registrar auditoría del ciclo de vida"
                            >
                              <History size={12} />
                              <span>Ciclo</span>
                            </button>
                          </div>
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

                  // ─── Fila Registro Hijo (Actividad Individual) ─────────────
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

                      {/* Estado del registro y Ciclo de Vida */}
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <div className={styles.estadoBadgeWrapper}>
                          <select
                            className={`${styles.estadoSelect} ${
                              (estadosRegistros[refId] || 'Pendiente') === 'Observado'
                                ? styles.estadoSelectObservado
                                : (estadosRegistros[refId] || 'Pendiente') === 'Aprobado'
                                ? styles.estadoSelectAprobado
                                : (estadosRegistros[refId] || 'Pendiente') === 'Actualizado'
                                ? styles.estadoSelectActualizado
                                : styles.estadoSelectPendiente
                            }`}
                            value={estadosRegistros[refId] || 'Pendiente'}
                            onChange={(e) => handleRegistroEstadoChange(refId, e.target.value)}
                            title="Cambiar estado del registro diario (Pendiente, Observado, Actualizado, Aprobado)"
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Observado">Observado</option>
                            <option value="Actualizado">Actualizado</option>
                            <option value="Aprobado">Aprobado</option>
                          </select>

                          <button
                            type="button"
                            className={styles.btnHistorialCiclo}
                            onClick={() =>
                              setCicloVidaModalItem({
                                tipo: 'REGISTRO',
                                id: fila.id,
                                registro_id: fila.id,
                                tarea_id: fila.tarea_id,
                                nombre: fila.descripcion || fila.comentario || `Registro #${fila.id}`,
                                fecha: fila.fecha,
                                trabajador_nombre: fila.trabajador_nombre,
                                proyecto_nombre: fila.proyecto_nombre,
                                solicitante_nombre: fila.solicitante_nombre,
                                team_nombre: fila.team_nombre,
                                totalHoras: Number(fila.horas),
                                estado_nombre: estadosRegistros[refId] || 'Pendiente'
                              })
                            }
                            title="Ver línea de tiempo y registrar auditoría del registro"
                          >
                            <History size={12} />
                            <span>Ciclo</span>
                          </button>
                        </div>
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

      {/* ─── 4. MODAL DE CICLO DE VIDA Y AUDITORÍA ────────────────────────── */}
      <TareaCicloVidaModal
        isOpen={Boolean(cicloVidaModalItem)}
        onClose={() => setCicloVidaModalItem(null)}
        item={cicloVidaModalItem}
        onStateChanged={handleCicloVidaStateChanged}
      />

      {/* ─── 5. BARRA FLOTANTE DE GUARDADO ─────────────────────────────────── */}
      {pendingChangesCount > 0 && (
        <div className={styles.floatingSaveBar}>
          <div className={styles.floatingSaveContent}>
            <span className={styles.floatingPulse} />
            <span>
              Tienes <strong>{pendingChangesCount}</strong> {pendingChangesCount === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}
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
