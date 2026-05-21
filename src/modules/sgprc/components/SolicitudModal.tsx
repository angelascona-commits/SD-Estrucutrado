'use client'

import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import styles from './SolicitudModal.module.css'
import type { Solicitud, ComponenteCloud, SGPRCCatalogs } from '../interfaces/sgprc.interfaces'
import { saveSolicitudAction } from '../actions/sgprc.action'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  solicitud: Solicitud | null
  catalogs: SGPRCCatalogs
}

export default function SolicitudModal({ isOpen, onClose, onSuccess, solicitud, catalogs }: Props) {
  const [loading, setLoading] = useState(false)
  const [proyectistaId, setProyectistaId] = useState<number>(0)
  const [descripcionNegocio, setDescripcionNegocio] = useState('')
  const [sustentoTecnico, setSustentoTecnico] = useState('')
  const [estado, setEstado] = useState<'Borrador' | 'Pendiente Infraestructura'>('Borrador')
  const [componentes, setComponentes] = useState<ComponenteCloud[]>([])

  useEffect(() => {
    if (solicitud) {
      setProyectistaId(solicitud.proyectista_id)
      setDescripcionNegocio(solicitud.descripcion_negocio)
      setSustentoTecnico(solicitud.sustento_tecnico)
      setEstado(solicitud.estado === 'Borrador' ? 'Borrador' : 'Pendiente Infraestructura')
      setComponentes(
        (solicitud.componentes || []).map((c) => ({
          ...c,
          usuario_cloud: c.usuario_cloud || '',
          cuenta_cloud: c.cuenta_cloud || catalogs.cuentas[0] || '',
          accion_cloud: c.accion_cloud || catalogs.acciones[0] || ''
        }))
      )
    } else {
      setProyectistaId(catalogs.proyectistas[0]?.id || 0)
      setDescripcionNegocio('')
      setSustentoTecnico('')
      setEstado('Borrador')
      setComponentes([
        {
          servicio_requerido: catalogs.serviciosDisponibles[0] || '',
          entorno: catalogs.entornos[0] || 'Desarrollo',
          configuracion_detalles: '',
          usuario_cloud: '',
          cuenta_cloud: catalogs.cuentas[0] || '',
          accion_cloud: catalogs.acciones[0] || ''
        }
      ])
    }
  }, [solicitud, isOpen, catalogs])

  if (!isOpen) return null

  const handleAddComponent = () => {
    setComponentes((prev) => [
      ...prev,
      {
        servicio_requerido: catalogs.serviciosDisponibles[0] || '',
        entorno: catalogs.entornos[0] || 'Desarrollo',
        configuracion_detalles: '',
        usuario_cloud: '',
        cuenta_cloud: catalogs.cuentas[0] || '',
        accion_cloud: catalogs.acciones[0] || ''
      }
    ])
  }

  const handleRemoveComponent = (index: number) => {
    if (componentes.length <= 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Componente Requerido',
        text: 'Debe especificar al menos un componente cloud en la solicitud.',
        confirmButtonColor: 'var(--primary, #ec5b13)'
      })
      return
    }
    setComponentes((prev) => prev.filter((_, i) => i !== index))
  }

  const handleComponentChange = (index: number, key: keyof ComponenteCloud, value: string) => {
    setComponentes((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [key]: value } : c))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!proyectistaId) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'El proyectista solicitante es obligatorio.', confirmButtonColor: 'var(--primary, #ec5b13)' })
      return
    }
    if (!descripcionNegocio.trim()) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'La descripción del negocio es obligatoria.', confirmButtonColor: 'var(--primary, #ec5b13)' })
      return
    }
    if (!sustentoTecnico.trim()) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'El sustento técnico de ingeniería es obligatorio.', confirmButtonColor: 'var(--primary, #ec5b13)' })
      return
    }

    // Validar componentes
    for (let i = 0; i < componentes.length; i++) {
      const c = componentes[i]
      if (!c.configuracion_detalles.trim()) {
        Swal.fire({
          icon: 'error',
          title: 'Detalle Faltante',
          text: `Por favor especifique los detalles técnicos del componente #${i + 1}.`,
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
        return
      }
    }

    setLoading(true)

    try {
      const payload = {
        id: solicitud?.id,
        proyectista_id: proyectistaId,
        descripcion_negocio: descripcionNegocio,
        sustento_tecnico: sustentoTecnico,
        estado: solicitud ? solicitud.estado : estado,
        componentes
      }

      const res = await saveSolicitudAction(payload as any, !!solicitud)

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: solicitud ? 'Solicitud Actualizada' : 'Solicitud Creada',
          text: solicitud
            ? 'Los datos de la solicitud fueron actualizados exitosamente.'
            : 'La solicitud de permisos y recursos cloud se registró correctamente.',
          confirmButtonColor: 'var(--primary, #ec5b13)'
        })
        onSuccess()
        onClose()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al Guardar',
          text: res.error || 'Ocurrió un error inesperado al procesar la solicitud.',
          confirmButtonColor: '#ef4444'
        })
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error Crítico',
        text: err.message || 'No se pudo conectar con el servidor.',
        confirmButtonColor: '#ef4444'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleBox}>
            <h2 className={styles.title}>{solicitud ? 'Editar Solicitud Cloud' : 'Nueva Solicitud Cloud'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          <div className={styles.formSection}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Proyectista Solicitante (Protecta)</label>
                <select
                  value={proyectistaId || ''}
                  onChange={(e) => setProyectistaId(Number(e.target.value))}
                  className={styles.select}
                  required
                >
                  <option value="">Seleccione proyectista...</option>
                  {catalogs.proyectistas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {!solicitud && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Estado Inicial</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as any)}
                    className={styles.select}
                  >
                    <option value="Borrador">Borrador (Solo guardar)</option>
                    <option value="Pendiente Infraestructura">Enviar a Infraestructura</option>
                  </select>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Necesidad y Objetivo Comercial del Negocio</label>
              <textarea
                placeholder="Describa el objetivo comercial del negocio..."
                value={descripcionNegocio}
                onChange={(e) => setDescripcionNegocio(e.target.value)}
                className={styles.textarea}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Sustento Técnico de Ingeniería (DM)</label>
              <textarea
                placeholder="Describa el sustento técnico de ingeniería..."
                value={sustentoTecnico}
                onChange={(e) => setSustentoTecnico(e.target.value)}
                className={styles.textarea}
                required
              />
            </div>
          </div>

          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Componentes Cloud Requeridos</h3>
            <button type="button" onClick={handleAddComponent} className={styles.addCompBtn}>
              Agregar Componente
            </button>
          </div>

          <div className={styles.componentList}>
            {componentes.map((comp, idx) => (
              <div key={idx} className={styles.componentCard}>
                <button
                  type="button"
                  onClick={() => handleRemoveComponent(idx)}
                  className={styles.removeCompBtn}
                  title="Eliminar Componente"
                >
                  ✕
                </button>

                <div className={styles.compRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Usuario Cloud (IAM)</label>
                    <input
                      type="text"
                      placeholder="Ingrese el usuario cloud..."
                      value={comp.usuario_cloud || ''}
                      onChange={(e) => handleComponentChange(idx, 'usuario_cloud', e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Cuenta Cloud</label>
                    <select
                      value={comp.cuenta_cloud || ''}
                      onChange={(e) => handleComponentChange(idx, 'cuenta_cloud', e.target.value)}
                      className={styles.select}
                    >
                      {catalogs.cuentas.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.compRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Servicio Técnico Cloud</label>
                    <select
                      value={comp.servicio_requerido}
                      onChange={(e) => handleComponentChange(idx, 'servicio_requerido', e.target.value)}
                      className={styles.select}
                    >
                      {catalogs.serviciosDisponibles.map((srv) => (
                        <option key={srv} value={srv}>
                          {srv}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Entorno Destino</label>
                    <select
                      value={comp.entorno}
                      onChange={(e) => handleComponentChange(idx, 'entorno', e.target.value as any)}
                      className={styles.select}
                    >
                      {catalogs.entornos.map((ent) => (
                        <option key={ent} value={ent}>
                          {ent}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Acción / Permiso Requerido</label>
                  <select
                    value={catalogs.acciones.includes(comp.accion_cloud || '') ? comp.accion_cloud : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === 'custom') {
                        handleComponentChange(idx, 'accion_cloud', '')
                      } else {
                        handleComponentChange(idx, 'accion_cloud', val)
                      }
                    }}
                    className={styles.select}
                    style={{ marginBottom: '8px' }}
                  >
                    {catalogs.acciones.map((act) => (
                      <option key={act} value={act}>
                        {act}
                      </option>
                    ))}
                    <option value="custom">✍️ Escribir acción personalizada...</option>
                  </select>
                  
                  {(!catalogs.acciones.includes(comp.accion_cloud || '') || comp.accion_cloud === '') && (
                    <input
                      type="text"
                      placeholder="Describa la acción personalizada..."
                      value={comp.accion_cloud || ''}
                      onChange={(e) => handleComponentChange(idx, 'accion_cloud', e.target.value)}
                      className={styles.input}
                      required
                    />
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Especificación / Configuración y Detalles Técnicos Exactos</label>
                  <textarea
                    placeholder="Describa las especificaciones y detalles técnicos exactos..."
                    value={comp.configuracion_detalles}
                    onChange={(e) => handleComponentChange(idx, 'configuracion_detalles', e.target.value)}
                    className={styles.textarea}
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.btnCancel} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? 'Guardando...' : (solicitud ? 'Guardar Cambios' : 'Registrar Solicitud')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
