'use client'

import { useEffect, useState } from 'react'
import { getTareaHistorialAction } from '../actions/tareo.action'
import type { RegistroDetalleItem } from '../interfaces/tareo.interfaces'

interface TareaHistorialModalProps {
  isOpen: boolean
  onClose: () => void
  tareaId: number | null
  tareaNombre: string
}

interface DiaHistorial {
  fecha: string
  fechaFormateada: string
  diaSemana: string
  periodo: string
  registros: RegistroDetalleItem[]
  totalHoras: number
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const COLORES_TRABAJADORES = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#d1fae5', color: '#065f46' },
  { bg: '#fef3c7', color: '#92400e' },
  { bg: '#fce7f3', color: '#9d174d' },
  { bg: '#ede9fe', color: '#5b21b6' },
  { bg: '#ffedd5', color: '#9a3412' },
  { bg: '#cffafe', color: '#155e75' },
  { bg: '#f0fdf4', color: '#14532d' },
]

function getColorForWorker(nombre: string) {
  const hash = nombre.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COLORES_TRABAJADORES[hash % COLORES_TRABAJADORES.length]
}

function formatFecha(fechaStr: string): { fechaFormateada: string; diaSemana: string } {
  // fechaStr: YYYY-MM-DD
  const [year, month, day] = fechaStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const diaSemana = DIAS_SEMANA[date.getDay()]
  const fechaFormateada = `${day} de ${MESES[month - 1]} ${year}`
  return { fechaFormateada, diaSemana }
}

function groupByFecha(registros: RegistroDetalleItem[]): DiaHistorial[] {
  const map = new Map<string, RegistroDetalleItem[]>()
  for (const r of registros) {
    if (!map.has(r.fecha)) map.set(r.fecha, [])
    map.get(r.fecha)!.push(r)
  }
  return Array.from(map.entries()).map(([fecha, regs]) => {
    const { fechaFormateada, diaSemana } = formatFecha(fecha)
    const totalHoras = regs.reduce((acc, r) => acc + r.horas, 0)
    const periodo = `${regs[0].anio}-${String(regs[0].mes).padStart(2, '0')}`
    return { fecha, fechaFormateada, diaSemana, periodo, registros: regs, totalHoras }
  })
}

export default function TareaHistorialModal({
  isOpen,
  onClose,
  tareaId,
  tareaNombre
}: TareaHistorialModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dias, setDias] = useState<DiaHistorial[]>([])
  const [totalHorasGlobal, setTotalHorasGlobal] = useState(0)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [uniqueWorkers, setUniqueWorkers] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen || !tareaId) return

    const fetch = async () => {
      setLoading(true)
      setError(null)
      const res = await getTareaHistorialAction(tareaId)
      if (!res.success || !res.data) {
        setError(res.error ?? 'Error al cargar el historial')
        setLoading(false)
        return
      }
      const grouped = groupByFecha(res.data)
      setDias(grouped)
      setTotalHorasGlobal(res.data.reduce((acc, r) => acc + r.horas, 0))
      setTotalRegistros(res.data.length)
      setUniqueWorkers(Array.from(new Set(res.data.map(r => r.trabajador_nombre))))
      setLoading(false)
    }

    fetch()
  }, [isOpen, tareaId])

  if (!isOpen) return null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '760px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 32px 24px',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: '#fff',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>

                <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Historial de Trabajo
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, lineHeight: 1.3 }}>
                {tareaNombre}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s', flexShrink: 0
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              ✕
            </button>
          </div>

          {/* Stats strip */}
          {!loading && !error && dias.length > 0 && (
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'Días trabajados', value: dias.length, icon: '' },
                { label: 'Total de horas', value: `${totalHorasGlobal}h`, icon: '' },
                { label: 'Registros', value: totalRegistros, icon: '' },
                { label: 'Trabajadores', value: uniqueWorkers.length, icon: '' },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: 'rgba(255,255,255,0.08)', borderRadius: '12px',
                  padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  <span style={{ fontSize: '18px' }}>{stat.icon}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>{stat.value}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', border: '4px solid #e5e7eb',
                borderTopColor: '#3b82f6', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>Cargando historial...</span>
            </div>
          )}

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px',
              padding: '20px', color: '#dc2626', textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
              {error}
            </div>
          )}

          {!loading && !error && dias.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 20px', color: '#9ca3af'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#374151' }}>Sin registros todavía</p>
              <p style={{ margin: '8px 0 0', fontSize: '14px' }}>
                Esta tarea aún no tiene días de trabajo registrados.
              </p>
            </div>
          )}

          {!loading && !error && dias.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {dias.map((dia, idx) => (
                <div key={dia.fecha} style={{ display: 'flex', gap: '0', position: 'relative' }}>
                  {/* Timeline line + dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '40px', marginRight: '20px' }}>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      border: '3px solid #fff',
                      boxShadow: '0 0 0 2px #3b82f6',
                      flexShrink: 0, marginTop: '20px', zIndex: 1
                    }} />
                    {idx < dias.length - 1 && (
                      <div style={{
                        width: '2px', flex: 1, background: '#e5e7eb', marginTop: '4px', marginBottom: '0'
                      }} />
                    )}
                  </div>

                  {/* Card */}
                  <div style={{
                    flex: 1, marginBottom: idx < dias.length - 1 ? '16px' : '0',
                    background: '#f8fafc', border: '1px solid #e5e7eb',
                    borderRadius: '16px', overflow: 'hidden',
                    transition: 'box-shadow 0.2s'
                  }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    {/* Date header */}
                    <div style={{
                      padding: '14px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: '1px solid #e5e7eb',
                      background: '#fff'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          color: '#fff', borderRadius: '10px',
                          padding: '6px 10px', textAlign: 'center', minWidth: '44px'
                        }}>
                          <div style={{ fontSize: '10px', fontWeight: 600, opacity: 0.85 }}>{dia.diaSemana}</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>
                            {dia.fecha.split('-')[2]}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>
                            {dia.fechaFormateada}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                            Período {dia.periodo}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        background: dia.totalHoras >= 8 ? '#d1fae5' : '#fef3c7',
                        color: dia.totalHoras >= 8 ? '#065f46' : '#92400e',
                        padding: '6px 14px', borderRadius: '999px',
                        fontSize: '14px', fontWeight: 700
                      }}>
                        {dia.totalHoras}h total
                      </div>
                    </div>

                    {/* Registros */}
                    <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {dia.registros.map(reg => {
                        const workerColor = getColorForWorker(reg.trabajador_nombre)
                        return (
                          <div key={reg.id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 14px', background: '#fff',
                            borderRadius: '12px', border: '1px solid #f1f5f9'
                          }}>
                            {/* Avatar */}
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '10px',
                              background: workerColor.bg, color: workerColor.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '14px', flexShrink: 0
                            }}>
                              {reg.trabajador_nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {reg.trabajador_nombre}
                              </div>
                              {reg.comentario && (
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  💬 {reg.comentario}
                                </div>
                              )}
                            </div>

                            {/* Horas badge */}
                            <div style={{
                              background: workerColor.bg, color: workerColor.color,
                              padding: '4px 12px', borderRadius: '999px',
                              fontSize: '13px', fontWeight: 700, flexShrink: 0
                            }}>
                              {reg.horas}h
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 32px', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'flex-end',
          background: '#f9fafb', flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b', color: '#fff', border: 'none',
              borderRadius: '12px', padding: '10px 24px',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
