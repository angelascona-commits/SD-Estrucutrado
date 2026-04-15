'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  fetchTareoCatalogsAction,
  getRegistroByIdAction,
  getResumenDiarioGeneralAction,
  getTareaByIdAction,
  listRegistrosByFechaAction,
  listTareasAction,
  saveRegistroAction,
  saveTareaAction,
  deleteRegistroAction
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

  const [registroModalOpen, setRegistroModalOpen] = useState(false)
  const [tareaModalOpen, setTareaModalOpen] = useState(false)
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroFormData | null>(null)
  const [selectedTarea, setSelectedTarea] = useState<TareaFormData | null>(null)

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

  const totalHorasDia = useMemo(() => {
    return registros.reduce((acc, item) => acc + Number(item.horas ?? 0), 0)
  }, [registros])

  const totalTrabajadoresDia = useMemo(() => {
    return new Set(registros.map((item) => item.trabajador_id)).size
  }, [registros])

  const totalRegistrosDia = registros.length

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
      <TareoHeader
        periodos={catalogs?.periodos ?? []}
        selectedPeriodoId={selectedPeriodoId}
        selectedFecha={selectedFecha}
        onPeriodoChange={setSelectedPeriodoId}
        onFechaChange={setSelectedFecha}
        onNuevoRegistro={handleOpenNuevoRegistro}
        onNuevaTarea={handleOpenNuevaTarea}
      />

      {error && <div className={styles.errorBox}>{error}</div>}

      <TareoDailyWidgets
        totalHorasDia={totalHorasDia}
        totalAcumuladoMes={Number(resumenDia?.horas_acumuladas_mes ?? 0)}
        totalRegistrosDia={totalRegistrosDia}
        totalTrabajadoresDia={totalTrabajadoresDia}
      />

      <TareoDailyTable
        registros={registros}
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
        }}
        onSave={handleSaveTarea}
        tarea={selectedTarea}
        periodos={catalogs?.periodos ?? []}
        proyectos={catalogs?.proyectos ?? []}
        agrupadores={catalogs?.agrupadores ?? []}
        solicitantes={catalogs?.solicitantes ?? []}
        teams={catalogs?.teams ?? []}
        estadosTarea={catalogs?.estadosTarea ?? []}
      />
    </div>
  )
}