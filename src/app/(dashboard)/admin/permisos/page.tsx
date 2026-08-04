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
import styles from './admin-permisos.module.css'

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
    <div className={styles.container}>
      
      {/* ─── HEADER SIMPLIFICADO ─── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión de Permisos de Usuarios</h1>
          <p className={styles.subtitle}>
            Asigna y modifica los dominios permitidos para cada usuario de la plataforma.
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* Buscador */}
          <input
            type="text"
            placeholder="Buscar por usuario o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />

          {/* Botón de Guardado Masivo */}
          <button
            type="button"
            onClick={handleGuardarTodosLosCambios}
            disabled={isSavingBulk || totalConModificaciones === 0}
            className={`${styles.btnSaveBulk} ${
              totalConModificaciones > 0 && !isSavingBulk
                ? styles.btnSaveBulkActive
                : styles.btnSaveBulkDisabled
            }`}
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
      <div className={styles.cardContainer}>
        {loading ? (
          <div className={styles.loadingState}>
            Cargando usuarios...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            No se encontraron usuarios.
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeaderRow}>
                  <th className={styles.th}>USUARIO</th>
                  <th className={styles.th}>EMAIL</th>
                  <th className={styles.th}>ROL</th>
                  <th className={styles.th}>DOMINIOS PERMITIDOS</th>
                  <th className={styles.thRight}>ACCIONES</th>
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
                      className={`${styles.tr} ${isModified ? styles.trModified : ''}`}
                    >
                      {/* USUARIO */}
                      <td className={styles.td}>
                        <div className={styles.userCell}>
                          <div className={isUserAdmin ? styles.avatarAdmin : styles.avatarUser}>
                            {iniciales}
                          </div>
                          <div>
                            <p className={styles.userName}>{u.nombre}</p>
                          </div>
                        </div>
                      </td>

                      {/* EMAIL */}
                      <td className={`${styles.td} ${styles.userEmail}`}>
                        {u.email}
                      </td>

                      {/* ROL */}
                      <td className={styles.td}>
                        <span className={isUserAdmin ? styles.roleBadgeAdmin : styles.roleBadgeUser}>
                          {u.rol}
                        </span>
                      </td>

                      {/* DOMINIOS PERMITIDOS */}
                      <td className={styles.td}>
                        <div className={styles.domainGrid}>
                          {CATALOGO_DOMINIOS.map((dominio) => {
                            const isChecked = u.dominiosPermitidos.includes(dominio.href)

                            return (
                              <button
                                key={dominio.href}
                                type="button"
                                onClick={() => handleToggleDominio(u.userId, dominio.href)}
                                className={isChecked ? styles.domainChipChecked : styles.domainChipUnchecked}
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
                                <span className={isChecked ? styles.domainDotActive : styles.domainDotInactive} />
                              </button>
                            )
                          })}
                        </div>
                      </td>

                      {/* ACCIONES */}
                      <td className={styles.tdRight}>
                        <button
                          type="button"
                          onClick={() => handleGuardarUsuario(u.userId, u.nombre, u.dominiosPermitidos)}
                          disabled={isSavingThis || !isModified}
                          className={isModified ? styles.btnSaveUserActive : styles.btnSaveUserDisabled}
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
