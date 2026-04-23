'use client'

import { useState, useMemo } from 'react'
import { saveExternalCommentsAction } from '../actions/tareo.action'
import styles from '../styles/public-report.module.css'

interface Props {
  registros: any[]
  feedback: any[]
  linkId: string
}

export default function PublicReportTable({ registros, feedback, linkId }: Props) {
  const [saving, setSaving] = useState(false)
  
  // 1. ESTADOS DE FILTROS AMPLIADOS
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPry, setSelectedPry] = useState('')
  const [selectedSolicitante, setSelectedSolicitante] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')

  // Estados de comentarios (Protecta = PS)
  const [comentariosPS, setComentariosPS] = useState<{
    tareas: Record<number, string>;
    registros: Record<number, string>;
  }>(() => {
    const state = { tareas: {} as Record<number, string>, registros: {} as Record<number, string> }
    feedback.forEach(f => {
      if (f.referencia_tipo === 'TAREA') state.tareas[f.referencia_id] = f.comentario_protecta || ''
      if (f.referencia_tipo === 'REGISTRO') state.registros[f.referencia_id] = f.comentario_protecta || ''
    })
    return state
  })

  // Respuestas del equipo (Dev = DM)
  const comentariosDM = useMemo(() => {
    const map: Record<string, string> = {}
    feedback.forEach(f => {
      if (f.comentario_dev) map[`${f.referencia_tipo}-${f.referencia_id}`] = f.comentario_dev
    })
    return map
  }, [feedback])

  // 2. EXTRACCIÓN DINÁMICA DE OPCIONES PARA LOS SELECTS
  const opciones = useMemo(() => {
    return {
      proyectos: Array.from(new Set(registros.map(r => r.proyecto_nombre))).filter(Boolean),
      solicitantes: Array.from(new Set(registros.map(r => r.solicitante_nombre))).filter(Boolean),
      teams: Array.from(new Set(registros.map(r => r.team_nombre))).filter(Boolean)
    }
  }, [registros])

  // Lógica de filas con FILTRADO MULTIPLE
  const filasExcel = useMemo(() => {
    const grupos: Record<number, any> = {}
    registros.forEach(reg => {
      const tId = reg.tarea_periodo_id
      if (!grupos[tId]) {
        grupos[tId] = { ...reg, esTarea: true, totalHoras: 0, detalle: [] }
      }
      grupos[tId].detalle.push({ ...reg, esTarea: false })
      grupos[tId].totalHoras += Number(reg.horas)
    })

    const gruposFiltrados = Object.values(grupos).filter((g: any) => {
      const matchSearch = (g.tarea_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchPry = selectedPry ? g.proyecto_nombre === selectedPry : true
      const matchSol = selectedSolicitante ? g.solicitante_nombre === selectedSolicitante : true
      const matchTeam = selectedTeam ? g.team_nombre === selectedTeam : true
      
      return matchSearch && matchPry && matchSol && matchTeam
    })

    const listaPlana: any[] = []
    gruposFiltrados.forEach((g: any) => {
      listaPlana.push(g) // Fila de Resumen (Tarea)
      g.detalle.forEach((det: any) => listaPlana.push(det)) // Filas de Registro Diario
    })
    return listaPlana
  }, [registros, searchTerm, selectedPry, selectedSolicitante, selectedTeam])

  const handleChange = (tipo: 'tareas' | 'registros', id: number, valor: string) => {
    setComentariosPS(prev => ({
      ...prev,
      [tipo]: { ...prev[tipo], [id]: valor }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const payload: { tipo: 'TAREA' | 'REGISTRO'; id: number; comentario_protecta: string }[] = []
    
    Object.entries(comentariosPS.tareas).forEach(([id, txt]) => {
      if (txt.trim()) payload.push({ tipo: 'TAREA', id: parseInt(id), comentario_protecta: txt })
    })
    
    Object.entries(comentariosPS.registros).forEach(([id, txt]) => {
      if (txt.trim()) payload.push({ tipo: 'REGISTRO', id: parseInt(id), comentario_protecta: txt })
    })

    const res = await saveExternalCommentsAction(payload)
    if (res.success) alert('¡Observaciones guardadas exitosamente!')
    else alert(res.error)
    setSaving(false)
  }

  const limpiarFiltros = () => {
    setSearchTerm('')
    setSelectedPry('')
    setSelectedSolicitante('')
    setSelectedTeam('')
  }

  return (
    <div className={styles.container}>
      
      {/* 3. BARRA DE FILTROS MEJORADA */}
      <div className={styles.toolbar} style={{ flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <input 
            className={styles.input}
            placeholder="Buscar por tarea..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            style={{ minWidth: '200px' }}
          />
          
          <select className={styles.select} value={selectedPry} onChange={e => setSelectedPry(e.target.value)}>
            <option value="">Todos los proyectos</option>
            {opciones.proyectos.map(p => <option key={p as string} value={p as string}>{p as string}</option>)}
          </select>

          <select className={styles.select} value={selectedSolicitante} onChange={e => setSelectedSolicitante(e.target.value)}>
            <option value="">Todos los solicitantes</option>
            {opciones.solicitantes.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
          </select>

          <select className={styles.select} value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
            <option value="">Todos los equipos</option>
            {opciones.teams.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
          </select>

          {(searchTerm || selectedPry || selectedSolicitante || selectedTeam) && (
            <button 
              onClick={limpiarFiltros} 
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px' }}
            >
              Limpiar
            </button>
          )}
        </div>

        <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Observaciones'}
        </button>
      </div>

      {/* ESTRUCTURA EXACTA ANTERIOR */}
      <div className={styles.tableWrapper}>
        <table className={styles.excelTable}>
          <thead>
            <tr>
              <th style={{ width: '250px' }}>Taskname</th>
              <th style={{ width: '100px' }}>Fecha</th>
              <th style={{ width: '140px' }}>Asignado</th>
              <th style={{ width: '140px' }}>Solicitante</th>
              <th style={{ width: '160px' }}>Pry - Protecta</th>
              <th style={{ width: '140px' }}>Agrupador</th>
              <th style={{ width: '90px' }}>Horas tomadas</th>
              <th style={{ width: '250px' }}>Comentario PS</th>
              <th style={{ width: '250px' }}>Comentario DM</th>
            </tr>
          </thead>
          <tbody>
            {filasExcel.map((fila) => {
              const tipo = fila.esTarea ? 'TAREA' : 'REGISTRO';
              const refId = fila.esTarea ? fila.tarea_periodo_id : fila.id;
              const dmReply = comentariosDM[`${tipo}-${refId}`];

              return (
                <tr key={`${tipo}-${refId}`} className={fila.esTarea ? styles.rowTask : styles.rowRecord}>
                  {/* Taskname: Muestra el nombre de la tarea en ambas filas (padre e hijo) */}
                  <td style={{ fontWeight: fila.esTarea ? 'bold' : 'normal', paddingLeft: fila.esTarea ? '12px' : '24px' }}>
                    {fila.esTarea 
                      ? ` ${fila.tarea_nombre}` 
                      : `↳ ${fila.tarea_nombre} ${fila.descripcion ? `(${fila.descripcion})` : ''}`
                    }
                  </td>
                  
                  {/* Fecha */}
                  <td>{fila.esTarea ? '-' : new Date(fila.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  
                  {/* Asignado (Team) */}
                  <td style={{ color: fila.esTarea ? '#0f172a' : '#475569' }}>
                    {fila.team_nombre || '-'}
                  </td>
                  
                  {/* Solicitante */}
                  <td style={{ color: fila.esTarea ? '#0f172a' : '#475569' }}>
                    {fila.solicitante_nombre || '-'}
                  </td>
                  
                  {/* Pry - Protecta (Proyecto) */}
                  <td style={{ color: fila.esTarea ? '#0f172a' : '#475569' }}>
                    {fila.proyecto_nombre || '-'}
                  </td>
                  
                  {/* Agrupador */}
                  <td style={{ color: fila.esTarea ? '#0f172a' : '#475569' }}>
                    {fila.agrupador_nombre || '-'}
                  </td>
                  
                  {/* Horas tomadas */}
                  <td style={{ fontWeight: 'bold' }}>
                    {fila.esTarea ? fila.totalHoras.toFixed(2) : Number(fila.horas).toFixed(2)}
                  </td>
                  
                  {/* Comentario PS (Editable por Protecta) */}
                  <td style={{ padding: '6px' }}>
                    <textarea 
                      className={styles.textarea}
                      placeholder={fila.esTarea ? "Observación a la tarea general..." : "Observación al registro diario..."}
                      value={fila.esTarea ? (comentariosPS.tareas[refId] || '') : (comentariosPS.registros[refId] || '')}
                      onChange={e => handleChange(fila.esTarea ? 'tareas' : 'registros', refId, e.target.value)}
                    />
                  </td>

                  {/* Comentario DM (Lectura de Dev) */}
                  <td style={{ padding: '6px', background: '#f8fafc', color: '#334155', fontSize: '12px' }}>
                    {dmReply ? (
                      <div style={{ borderLeft: '3px solid #0ea5e9', paddingLeft: '8px' }}>
                        {dmReply}
                      </div>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Sin comentario</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}