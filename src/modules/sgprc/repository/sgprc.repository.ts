import { supabase } from '@/modules/shared/infra/supabase'
import type {
  Solicitud,
  ComponenteCloud,
  EvaluacionTecnica,
  AuditoriaLog,
  SolicitudFormData,
  EvaluacionFormData,
  SGPRCCatalogs
} from '../interfaces/sgprc.interfaces'

export async function getSGPRCCatalogs(): Promise<SGPRCCatalogs> {
  const [userRes, srvRes, entRes, metRes, ctaRes, accRes, proyRes] = await Promise.all([
    supabase.from('usuarios').select('id, nombre, email, rol').eq('activo', true).order('nombre'),
    supabase.from('sgprc_servicios_cloud').select('nombre').eq('activo', true).order('orden'),
    supabase.from('sgprc_entornos').select('nombre').eq('activo', true).order('orden'),
    supabase.from('sgprc_metricas_config').select('*').eq('activo', true).order('orden'),
    supabase.from('sgprc_cuentas').select('nombre').eq('activo', true).order('orden'),
    supabase.from('sgprc_acciones').select('nombre').eq('activo', true).order('orden'),
    supabase.from('tareo_solicitante').select('id, nombre').order('nombre')
  ])

  if (userRes.error) throw new Error(userRes.error.message)
  if (srvRes.error) throw new Error(srvRes.error.message)
  if (entRes.error) throw new Error(entRes.error.message)
  if (metRes.error) throw new Error(metRes.error.message)

  const serviciosDisponibles = (srvRes.data || []).map((s: any) => s.nombre)
  const entornos = (entRes.data || []).map((e: any) => e.nombre)
  const metricasConfig = metRes.data || []
  
  const cuentas = ctaRes && !ctaRes.error ? (ctaRes.data || []).map((c: any) => c.nombre) : []
  const acciones = accRes && !accRes.error ? (accRes.data || []).map((a: any) => a.nombre) : []
  const proyectistas = proyRes && !proyRes.error ? (proyRes.data || []) : []

  return {
    usuarios: userRes.data || [],
    serviciosDisponibles,
    entornos,
    metricasConfig,
    cuentas,
    acciones,
    proyectistas
  }
}

export async function getSolicitudes(): Promise<Solicitud[]> {
  // Traemos las solicitudes con el nombre del orquestador y proyectista
  const { data: rawSolicitudes, error: solError } = await supabase
    .from('sgprc_solicitudes')
    .select('*, usuarios(nombre), tareo_solicitante(nombre)')
    .order('updated_at', { ascending: false })

  if (solError) throw new Error(solError.message)

  // Traemos los componentes y evaluaciones en paralelo para armar la entidad completa
  const [compRes, evalRes] = await Promise.all([
    supabase.from('sgprc_componentes_cloud').select('*'),
    supabase.from('sgprc_evaluaciones_tecnicas').select('*, evaluador:usuarios!sgprc_evaluaciones_tecnicas_evaluador_infraestructura_id_fkey(nombre), aprobador:usuarios!sgprc_evaluaciones_tecnicas_aprobador_ciberseguridad_id_fkey(nombre)')
  ])

  if (compRes.error) throw new Error(compRes.error.message)
  if (evalRes.error) throw new Error(evalRes.error.message)

  const componentes = compRes.data || []
  const evaluaciones = evalRes.data || []

  return (rawSolicitudes || []).map((sol) => {
    const solComps = componentes.filter((c) => c.solicitud_id === sol.id)
    const solEval = evaluaciones.find((e) => e.solicitud_id === sol.id)

    return {
      id: sol.id,
      orquestador_id: sol.orquestador_id,
      orquestador_nombre: sol.usuarios?.nombre || 'Desconocido',
      proyectista_id: sol.proyectista_id,
      proyectista_nombre: sol.tareo_solicitante?.nombre || 'Desconocido',
      descripcion_negocio: sol.descripcion_negocio,
      sustento_tecnico: sol.sustento_tecnico,
      estado: sol.estado,
      created_at: sol.created_at,
      updated_at: sol.updated_at,
      componentes: solComps,
      evaluacion: solEval
        ? {
            id: solEval.id,
            solicitud_id: solEval.solicitud_id,
            evaluador_infraestructura_id: solEval.evaluador_infraestructura_id,
            evaluador_infraestructura_nombre: solEval.evaluador?.nombre || null,
            presupuesto: Number(solEval.presupuesto || 0),
            integraciones_detalle: solEval.integraciones_detalle,
            aprobador_ciberseguridad_id: solEval.aprobador_ciberseguridad_id,
            aprobador_ciberseguridad_nombre: solEval.aprobador?.nombre || null,
            reglas_perimetrales: solEval.reglas_perimetrales,
            comentarios: solEval.comentarios
          }
        : undefined
    }
  })
}

export async function getSolicitudById(id: number): Promise<Solicitud | null> {
  const { data: sol, error: solError } = await supabase
    .from('sgprc_solicitudes')
    .select('*, usuarios(nombre), tareo_solicitante(nombre)')
    .eq('id', id)
    .single()

  if (solError) {
    if (solError.code === 'PGRST116') return null
    throw new Error(solError.message)
  }

  const [compRes, evalRes, logsRes] = await Promise.all([
    supabase.from('sgprc_componentes_cloud').select('*').eq('solicitud_id', id),
    supabase.from('sgprc_evaluaciones_tecnicas').select('*, evaluador:usuarios!sgprc_evaluaciones_tecnicas_evaluador_infraestructura_id_fkey(nombre), aprobador:usuarios!sgprc_evaluaciones_tecnicas_aprobador_ciberseguridad_id_fkey(nombre)').eq('solicitud_id', id).single(),
    supabase.from('sgprc_auditoria_logs').select('*, usuarios(nombre)').eq('solicitud_id', id).order('created_at', { ascending: false })
  ])

  const componentes = compRes.data || []
  const solEval = evalRes.data || null
  const logs = logsRes.data || []

  return {
    id: sol.id,
    orquestador_id: sol.orquestador_id,
    orquestador_nombre: sol.usuarios?.nombre || 'Desconocido',
    proyectista_id: sol.proyectista_id,
    proyectista_nombre: sol.tareo_solicitante?.nombre || 'Desconocido',
    descripcion_negocio: sol.descripcion_negocio,
    sustento_tecnico: sol.sustento_tecnico,
    estado: sol.estado,
    created_at: sol.created_at,
    updated_at: sol.updated_at,
    componentes,
    evaluacion: solEval
      ? {
          id: solEval.id,
          solicitud_id: solEval.solicitud_id,
          evaluador_infraestructura_id: solEval.evaluador_infraestructura_id,
          evaluador_infraestructura_nombre: solEval.evaluador?.nombre || null,
          presupuesto: Number(solEval.presupuesto || 0),
          integraciones_detalle: solEval.integraciones_detalle,
          aprobador_ciberseguridad_id: solEval.aprobador_ciberseguridad_id,
          aprobador_ciberseguridad_nombre: solEval.aprobador?.nombre || null,
          reglas_perimetrales: solEval.reglas_perimetrales,
          comentarios: solEval.comentarios
        }
      : undefined
  }
}

export async function createSolicitud(payload: SolicitudFormData, orquestadorId: number): Promise<number> {
  const { data: sol, error: solError } = await supabase
    .from('sgprc_solicitudes')
    .insert({
      orquestador_id: orquestadorId,
      proyectista_id: payload.proyectista_id,
      descripcion_negocio: payload.descripcion_negocio,
      sustento_tecnico: payload.sustento_tecnico,
      estado: payload.estado || 'Borrador'
    })
    .select('id')
    .single()

  if (solError) throw new Error(solError.message)

  if (payload.componentes && payload.componentes.length > 0) {
    const formattedComponents = payload.componentes.map((c) => ({
      solicitud_id: sol.id,
      servicio_requerido: c.servicio_requerido,
      entorno: c.entorno,
      configuracion_detalles: c.configuracion_detalles,
      usuario_cloud: c.usuario_cloud || null,
      cuenta_cloud: c.cuenta_cloud || null,
      accion_cloud: c.accion_cloud || null
    }))

    const { error: compError } = await supabase
      .from('sgprc_componentes_cloud')
      .insert(formattedComponents)

    if (compError) throw new Error(compError.message)
  }

  // Registramos en auditoría
  await createAuditLog(sol.id, orquestadorId, 'Creación de Solicitud en estado Borrador')

  return sol.id
}

export async function updateSolicitud(id: number, payload: SolicitudFormData, usuarioId: number): Promise<void> {
  const { error: solError } = await supabase
    .from('sgprc_solicitudes')
    .update({
      proyectista_id: payload.proyectista_id,
      descripcion_negocio: payload.descripcion_negocio,
      sustento_tecnico: payload.sustento_tecnico,
      estado: payload.estado || 'Borrador',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (solError) throw new Error(solError.message)

  // Reconstruimos los componentes: borramos anteriores e insertamos nuevos
  const { error: deleteError } = await supabase
    .from('sgprc_componentes_cloud')
    .delete()
    .eq('solicitud_id', id)

  if (deleteError) throw new Error(deleteError.message)

  if (payload.componentes && payload.componentes.length > 0) {
    const formattedComponents = payload.componentes.map((c) => ({
      solicitud_id: id,
      servicio_requerido: c.servicio_requerido,
      entorno: c.entorno,
      configuracion_detalles: c.configuracion_detalles,
      usuario_cloud: c.usuario_cloud || null,
      cuenta_cloud: c.cuenta_cloud || null,
      accion_cloud: c.accion_cloud || null
    }))

    const { error: compError } = await supabase
      .from('sgprc_componentes_cloud')
      .insert(formattedComponents)

    if (compError) throw new Error(compError.message)
  }

  // Registramos en auditoría
  await createAuditLog(id, usuarioId, `Actualización de Solicitud (estado: ${payload.estado || 'Borrador'})`)
}

export async function saveEvaluacion(payload: EvaluacionFormData, usuarioId: number): Promise<void> {
  // Vemos si existe una evaluación
  const { data: existing, error: findError } = await supabase
    .from('sgprc_evaluaciones_tecnicas')
    .select('id')
    .eq('solicitud_id', payload.solicitud_id)
    .single()

  let isInsert = false
  if (findError && findError.code === 'PGRST116') {
    isInsert = true
  }

  const updateFields: any = {}
  let auditMsg = ''

  if (payload.rol_evaluador === 'infraestructura') {
    updateFields.evaluador_infraestructura_id = usuarioId
    updateFields.presupuesto = payload.presupuesto || 0
    updateFields.integraciones_detalle = payload.integraciones_detalle || ''
    auditMsg = `Evaluación de Infraestructura registrada: Presupuesto S/. ${payload.presupuesto}, Integraciones: ${payload.integraciones_detalle}`
  } else {
    updateFields.aprobador_ciberseguridad_id = usuarioId
    updateFields.reglas_perimetrales = payload.reglas_perimetrales || ''
    updateFields.comentarios = payload.comentarios || ''
    auditMsg = `Evaluación de Ciberseguridad registrada: Reglas: ${payload.reglas_perimetrales}, Comentarios: ${payload.comentarios}`
  }

  if (isInsert) {
    const { error: insertError } = await supabase
      .from('sgprc_evaluaciones_tecnicas')
      .insert({
        solicitud_id: payload.solicitud_id,
        ...updateFields
      })

    if (insertError) throw new Error(insertError.message)
  } else {
    const { error: updateError } = await supabase
      .from('sgprc_evaluaciones_tecnicas')
      .update({
        ...updateFields,
        updated_at: new Date().toISOString()
      })
      .eq('solicitud_id', payload.solicitud_id)

    if (updateError) throw new Error(updateError.message)
  }

  // Registramos en auditoría
  await createAuditLog(payload.solicitud_id, usuarioId, auditMsg)
}

export async function updateSolicitudEstado(
  id: number,
  estado: 'Borrador' | 'Pendiente Infraestructura' | 'Pendiente Ciberseguridad' | 'Aprobado' | 'Rechazado',
  usuarioId: number,
  comentarioLogs?: string
): Promise<void> {
  const { error: statusError } = await supabase
    .from('sgprc_solicitudes')
    .update({
      estado,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (statusError) throw new Error(statusError.message)

  let logAction = `Cambio de estado a: ${estado}`
  if (comentarioLogs) {
    logAction += `. Sustento: ${comentarioLogs}`
  }

  await createAuditLog(id, usuarioId, logAction)
}

export async function createAuditLog(solicitudId: number, usuarioId: number, accion: string): Promise<void> {
  const { error } = await supabase
    .from('sgprc_auditoria_logs')
    .insert({
      solicitud_id: solicitudId,
      usuario_id: usuarioId,
      accion
    })

  if (error) {
    console.error('Error al registrar auditoria log:', error.message)
  }
}

export async function createTokenCorreo(
  solicitudId: number,
  usuarioId: number,
  token: string,
  accion: 'Aprobar' | 'Rechazar',
  expiracion: Date
): Promise<void> {
  const { error } = await supabase
    .from('sgprc_tokens_correo')
    .insert({
      solicitud_id: solicitudId,
      usuario_id: usuarioId,
      token,
      accion,
      fecha_expiracion: expiracion.toISOString()
    })

  if (error) throw new Error(error.message)
}

export async function getAuditLogs(solicitudId: number): Promise<AuditoriaLog[]> {
  const { data, error } = await supabase
    .from('sgprc_auditoria_logs')
    .select('*, usuarios(nombre)')
    .eq('solicitud_id', solicitudId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((log) => ({
    id: log.id,
    solicitud_id: log.solicitud_id,
    usuario_id: log.usuario_id,
    usuario_nombre: log.usuarios?.nombre || 'Desconocido',
    accion: log.accion,
    created_at: log.created_at
  }))
}

export async function upsertSGPRCCatalogItem(tableName: string, payload: any): Promise<number> {
  if (payload.id) {
    const { id, ...updatePayload } = payload
    const { error } = await supabase.from(tableName).update(updatePayload).eq('id', id)
    if (error) throw new Error(error.message)
    return id
  } else {
    const { data, error } = await supabase.from(tableName).insert(payload).select('id').single()
    if (error) throw new Error(error.message)
    return data.id
  }
}

export async function deleteSGPRCCatalogItem(tableName: string, id: number): Promise<void> {
  // Para catálogos simples como entornos y servicios hacemos borrado lógico por defecto
  const { error } = await supabase.from(tableName).update({ activo: false }).eq('id', id)
  if (error) throw new Error(error.message)
}
