'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  getUsuariosPermisosAction,
  updateUsuarioPermisosAction,
  updateBulkUsuariosPermisosAction,
} from '@/modules/admin/actions/roles.action'
import { CATALOGO_DOMINIOS } from '@/modules/admin/repository/roles.repository'
import type { UsuarioPermiso } from '@/modules/admin/interfaces/roles.interfaces'
import Swal from 'sweetalert2'

export default function AdminPermisosPage() {
  const [originalUsuarios, setOriginalUsuarios] = useState<UsuarioPermiso[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioPermiso[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSavingBulk, setIsSavingBulk] = useState(false)
  const [savingUserId, setSavingUserId] = useState<number | null>(null)

  const cargarUsuarios = async () => {
    setLoading(true)
    try {
      const data = await getUsuariosPermisosAction()
      setOriginalUsuarios(JSON.parse(JSON.stringify(data)))
      setUsuarios(data)
    } catch (err) {
      console.error('Error al cargar usuarios:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  // Modificaciones pendientes
  const modifiedUserIds = useMemo(() => {
    const ids = new Set<number>()
    usuarios.forEach((u) => {
      const orig = originalUsuarios.find((o) => o.userId === u.userId)
      if (!orig) return
      const origSet = new Set(orig.dominiosPermitidos)
      const currentSet = new Set(u.dominiosPermitidos)

      if (
        origSet.size !== currentSet.size ||
        [...currentSet].some((d) => !origSet.has(d))
      ) {
        ids.add(u.userId)
      }
    })
    return Array.from(ids)
  }, [usuarios, originalUsuarios])

  const handleToggleDominio = (userId: number, href: string) => {
    setUsuarios((prev) =>
      prev.map((item) => {
        if (item.userId !== userId) return item
        const exists = item.dominiosPermitidos.includes(href)
        const updatedDominios = exists
          ? item.dominiosPermitidos.filter((d) => d !== href)
          : [...item.dominiosPermitidos, href]
        return {
          ...item,
          dominiosPermitidos: updatedDominios,
        }
      })
    )
  }

  const handleGuardarUsuario = async (userId: number, nombre: string, dominiosPermitidos: string[]) => {
    setSavingUserId(userId)
    try {
      const res = await updateUsuarioPermisosAction(userId, dominiosPermitidos)
      if (res.success) {
        setOriginalUsuarios((prev) =>
          prev.map((item) => (item.userId === userId ? { ...item, dominiosPermitidos: [...dominiosPermitidos] } : item))
        )
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: `Permisos actualizados para ${nombre}.`,
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error || 'No se pudo guardar.' })
      }
    } catch (err) {
      console.error(err)
      Swal.fire({ icon: 'error', title: 'Error', text: 'Falló el guardado.' })
    } finally {
      setSavingUserId(null)
    }
  }

  const handleGuardarTodosLosCambios = async () => {
    if (modifiedUserIds.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin cambios',
        text: 'No hay modificaciones pendientes por guardar.',
        timer: 1500,
        showConfirmButton: false,
      })
      return
    }

    const updates = usuarios
      .filter((u) => modifiedUserIds.includes(u.userId))
      .map((u) => ({ userId: u.userId, dominiosPermitidos: u.dominiosPermitidos }))

    setIsSavingBulk(true)
    try {
      const res = await updateBulkUsuariosPermisosAction(updates)
      if (res.success) {
        setOriginalUsuarios(JSON.parse(JSON.stringify(usuarios)))
        Swal.fire({
          icon: 'success',
          title: 'Cambios Guardados',
          text: `Se guardaron los permisos de ${res.count} usuario(s).`,
          timer: 2000,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error })
      }
    } catch (err) {
      console.error(err)
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error al guardar cambios masivos.' })
    } finally {
      setIsSavingBulk(false)
    }
  }

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.rol.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [usuarios, searchTerm])

  const totalConModificaciones = modifiedUserIds.length

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ─── HEADER SIMPLIFICADO ─── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Gestión de Permisos de Usuarios
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.875rem', margin: '4px 0 0' }}>
            Asigna y modifica los dominios permitidos para cada usuario de la plataforma.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Buscador */}
          <input
            type="text"
            placeholder="Buscar por usuario o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
              minWidth: '260px',
              backgroundColor: '#ffffff',
            }}
          />

          {/* Botón de Guardado Masivo */}
          <button
            type="button"
            onClick={handleGuardarTodosLosCambios}
            disabled={isSavingBulk || totalConModificaciones === 0}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: totalConModificaciones > 0 ? '#ec5b13' : '#cbd5e1',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: totalConModificaciones > 0 && !isSavingBulk ? 'pointer' : 'default',
              transition: 'background-color 0.2s',
            }}
          >
            {isSavingBulk
              ? 'Guardando...'
              : totalConModificaciones > 0
              ? `Guardar Cambios (${totalConModificaciones})`
              : 'Guardar Todos los Cambios'}
          </button>
        </div>
      </div>

      {/* ─── TABLA ESTILO CLEAN Y AMIGABLE ─── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Cargando usuarios...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            No se encontraron usuarios.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '14px 20px' }}>USUARIO</th>
                  <th style={{ padding: '14px 20px' }}>EMAIL</th>
                  <th style={{ padding: '14px 20px' }}>ROL</th>
                  <th style={{ padding: '14px 20px' }}>DOMINIOS PERMITIDOS</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => {
                  const isModified = modifiedUserIds.includes(u.userId)
                  const isSavingThis = savingUserId === u.userId
                  const iniciales = u.nombre.trim().slice(0, 2).toUpperCase()
                  const isUserAdmin = u.rol.toUpperCase().includes('ADMIN')

                  return (
                    <tr
                      key={u.userId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isModified ? '#fff7ed' : 'transparent',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* USUARIO (Avatar + Nombre sin ID) */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: isUserAdmin ? '#e0e7ff' : '#ffedd5',
                              color: isUserAdmin ? '#3730a3' : '#c2410c',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                            }}
                          >
                            {iniciales}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                              {u.nombre}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* EMAIL */}
                      <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#475569' }}>
                        {u.email}
                      </td>

                      {/* ROL */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isUserAdmin ? '#e0e7ff' : '#f1f5f9',
                            color: isUserAdmin ? '#4338ca' : '#475569',
                          }}
                        >
                          {u.rol}
                        </span>
                      </td>

                      {/* DOMINIOS PERMITIDOS (Chips amigables con icono e indicador visual) */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {CATALOGO_DOMINIOS.map((dominio) => {
                            const isChecked = u.dominiosPermitidos.includes(dominio.href)

                            return (
                              <button
                                key={dominio.href}
                                type="button"
                                onClick={() => handleToggleDominio(u.userId, dominio.href)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  borderRadius: '20px',
                                  border: isChecked ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                  backgroundColor: isChecked ? '#f0fdf4' : '#f8fafc',
                                  color: isChecked ? '#166534' : '#64748b',
                                  fontSize: '0.8125rem',
                                  fontWeight: isChecked ? 600 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  boxShadow: isChecked ? '0 1px 2px rgba(22, 101, 52, 0.05)' : 'none',
                                }}
                                title={isChecked ? `Acceso permitido a ${dominio.label}` : `Habilitar ${dominio.label}`}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{
                                    fontSize: '16px',
                                    color: isChecked ? '#16a34a' : '#94a3b8',
                                  }}
                                >
                                  {dominio.icon}
                                </span>
                                <span>{dominio.label}</span>
                                <span
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: isChecked ? '#22c55e' : '#cbd5e1',
                                    marginLeft: '2px',
                                  }}
                                />
                              </button>
                            )
                          })}
                        </div>
                      </td>

                      {/* ACCIONES (Guardar individual) */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleGuardarUsuario(u.userId, u.nombre, u.dominiosPermitidos)}
                          disabled={isSavingThis || !isModified}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isModified ? '#ec5b13' : '#f1f5f9',
                            color: isModified ? '#ffffff' : '#cbd5e1',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            cursor: isModified ? 'pointer' : 'default',
                            transition: 'all 0.15s',
                          }}
                        >
                          {isSavingThis ? 'Guardando...' : isModified ? 'Guardar' : 'Sin Cambios'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
