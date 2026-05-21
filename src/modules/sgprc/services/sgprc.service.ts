import crypto from 'crypto'
import type { SolicitudFormData, EvaluacionFormData } from '../interfaces/sgprc.interfaces'
import {
  createTokenCorreo,
  getSolicitudById,
  updateSolicitudEstado,
  createAuditLog
} from '../repository/sgprc.repository'
import { supabase } from '@/modules/shared/infra/supabase'

export function validateSolicitudPayload(payload: SolicitudFormData): void {
  if (!payload.proyectista_id) {
    throw new Error('El proyectista solicitante es obligatorio.')
  }
  if (!payload.descripcion_negocio.trim()) {
    throw new Error('La descripción del negocio es obligatoria.')
  }
  if (!payload.sustento_tecnico.trim()) {
    throw new Error('El sustento técnico de ingeniería es obligatorio.')
  }
  if (!payload.componentes || payload.componentes.length === 0) {
    throw new Error('Debe agregar al menos un componente cloud.')
  }

  payload.componentes.forEach((c, idx) => {
    if (!c.servicio_requerido) {
      throw new Error(`Componente #${idx + 1}: El servicio cloud requerido es obligatorio.`)
    }
    if (!c.configuracion_detalles.trim()) {
      throw new Error(`Componente #${idx + 1}: La especificación y detalles técnicos son obligatorios.`)
    }
  })
}

export async function generateApprovalToken(
  solicitudId: number,
  usuarioId: number,
  accion: 'Aprobar' | 'Rechazar'
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiracion = new Date()
  expiracion.setHours(expiracion.getHours() + 48) // 48 horas de vigencia

  await createTokenCorreo(solicitudId, usuarioId, token, accion, expiracion)
  return token
}

export async function processEmailAction(
  tokenString: string,
  comentariosRechazo?: string
): Promise<{ success: boolean; message: string }> {
  // Buscar token
  const { data: tokData, error: tokError } = await supabase
    .from('sgprc_tokens_correo')
    .select('*, usuarios(nombre, rol)')
    .eq('token', tokenString)
    .single()

  if (tokError || !tokData) {
    return { success: false, message: 'El enlace de aprobación no es válido o ya no existe.' }
  }

  if (tokData.usado) {
    return { success: false, message: 'Este enlace ya fue utilizado anteriormente.' }
  }

  if (new Date(tokData.fecha_expiracion).getTime() < Date.now()) {
    return { success: false, message: 'El enlace ha expirado (límite de 48 horas superado).' }
  }

  // Traer solicitud
  const solicitud = await getSolicitudById(tokData.solicitud_id)
  if (!solicitud) {
    return { success: false, message: 'La solicitud asociada ya no existe.' }
  }

  const { accion, usuario_id, solicitud_id } = tokData
  const usuarioRol = tokData.usuarios?.rol || 'Agente'

  let nuevoEstado: typeof solicitud.estado = solicitud.estado

  if (accion === 'Aprobar') {
    if (solicitud.estado === 'Pendiente Infraestructura') {
      nuevoEstado = 'Pendiente Ciberseguridad'
    } else if (solicitud.estado === 'Pendiente Ciberseguridad') {
      nuevoEstado = 'Aprobado'
    }
  } else {
    nuevoEstado = 'Rechazado'
  }

  // Si se rechaza, es obligatorio registrar comentarios de rechazo
  if (accion === 'Rechazar' && !comentariosRechazo?.trim()) {
    return { success: false, message: 'Para rechazar la solicitud, el motivo de retroalimentación es obligatorio.' }
  }

  // 1. Marcar el token como usado
  const { error: markError } = await supabase
    .from('sgprc_tokens_correo')
    .update({ usado: true })
    .eq('id', tokData.id)

  if (markError) throw new Error(markError.message)

  // 2. Si se rechaza o aprueba, guardamos la evaluación en el sistema
  if (solicitud.estado === 'Pendiente Infraestructura') {
    const evalData: EvaluacionFormData = {
      solicitud_id,
      presupuesto: 0.00,
      integraciones_detalle: accion === 'Aprobar' ? 'Aprobado vía email de Infraestructura' : `Rechazado vía email: ${comentariosRechazo}`,
      rol_evaluador: 'infraestructura'
    }
    // Buscamos si ya existe evaluación
    const { data: ex } = await supabase.from('sgprc_evaluaciones_tecnicas').select('id').eq('solicitud_id', solicitud_id).single()
    if (ex) {
      await supabase.from('sgprc_evaluaciones_tecnicas').update({
        evaluador_infraestructura_id: usuario_id,
        integraciones_detalle: evalData.integraciones_detalle,
        updated_at: new Date().toISOString()
      }).eq('solicitud_id', solicitud_id)
    } else {
      await supabase.from('sgprc_evaluaciones_tecnicas').insert({
        solicitud_id,
        evaluador_infraestructura_id: usuario_id,
        integraciones_detalle: evalData.integraciones_detalle,
        presupuesto: 0.00
      })
    }
  } else if (solicitud.estado === 'Pendiente Ciberseguridad') {
    const evalData: EvaluacionFormData = {
      solicitud_id,
      reglas_perimetrales: accion === 'Aprobar' ? 'Políticas estandarizadas vía email de Ciberseguridad' : `Rechazado vía email: ${comentariosRechazo}`,
      comentarios: comentariosRechazo || 'Aprobado vía email',
      rol_evaluador: 'ciberseguridad'
    }
    // Evaluacion debe existir ya que pasó por Infraestructura
    await supabase.from('sgprc_evaluaciones_tecnicas').update({
      aprobador_ciberseguridad_id: usuario_id,
      reglas_perimetrales: evalData.reglas_perimetrales,
      comentarios: evalData.comentarios,
      updated_at: new Date().toISOString()
    }).eq('solicitud_id', solicitud_id)
  }

  // 3. Cambiar el estado de la solicitud
  const sustentoMsg = accion === 'Aprobar' ? 'Aprobación asíncrona por correo electrónico' : `Rechazado por correo electrónico: ${comentariosRechazo}`
  await updateSolicitudEstado(solicitud_id, nuevoEstado, usuario_id, sustentoMsg)

  return {
    success: true,
    message: accion === 'Aprobar'
      ? `Solicitud aprobada con éxito. El estado avanzó a: ${nuevoEstado}.`
      : 'Solicitud rechazada con éxito. Se guardó el motivo en la bitácora.'
  }
}

export function generateHtmlOutboundEmail(
  solicitud: any,
  usuarioAprobador: any,
  tokenAprobar: string,
  tokenRechazar: string
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const linkAprobar = `${siteUrl}/sgprc/decision?token=${tokenAprobar}`
  const linkRechazar = `${siteUrl}/sgprc/decision?token=${tokenRechazar}`

  const componentesList = (solicitud.componentes || [])
    .map(
      (c: any) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px; font-weight: 600; color: #1e293b;">${c.servicio_requerido}</td>
      <td style="padding: 12px;"><span style="background: #e2e8f0; color: #334155; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">${c.entorno}</span></td>
      <td style="padding: 12px; color: #475569; font-size: 13px;">${c.configuracion_detalles}</td>
    </tr>
  `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>SGPRC: Solicitud de Recursos Cloud #${solicitud.id}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background: #1e3a8a; padding: 32px; text-align: center; color: white;">
          <span style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.85;">Auditoría e Integridad ISO</span>
          <h2 style="margin: 8px 0 0 0; font-size: 24px; font-weight: 800;">Solicitud de Permisos Cloud</h2>
          <p style="margin: 4px 0 0 0; opacity: 0.85; font-size: 14px;">Ticket #${solicitud.id} | Estado: ${solicitud.estado}</p>
        </div>
        
        <!-- Contenido -->
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">
            Hola <b>${usuarioAprobador.nombre}</b>, tienes una solicitud pendiente de evaluación técnica. A continuación se detallan los requerimientos:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #f1f5f9;">
            <tr>
              <td style="padding: 12px 6px 12px 16px; font-weight: bold; color: #64748b; width: 140px;">Proyectista:</td>
              <td style="padding: 12px 16px 12px 6px; color: #1e293b; font-weight: 600;">${solicitud.proyectista_nombre}</td>
            </tr>
            <tr>
              <td style="padding: 12px 6px 12px 16px; font-weight: bold; color: #64748b; vertical-align: top;">Negocio:</td>
              <td style="padding: 12px 16px 12px 6px; color: #475569; line-height: 1.5;">${solicitud.descripcion_negocio}</td>
            </tr>
            <tr>
              <td style="padding: 12px 6px 12px 16px; font-weight: bold; color: #64748b; vertical-align: top;">Sustento Técnico:</td>
              <td style="padding: 12px 16px 12px 6px; color: #475569; line-height: 1.5; font-style: italic;">"${solicitud.sustento_tecnico}"</td>
            </tr>
          </table>

          <h3 style="margin: 28px 0 12px 0; font-size: 16px; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Componentes Cloud Solicitados</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; font-size: 12px; text-transform: uppercase;">
                <th style="padding: 10px 12px; font-weight: bold;">Servicio</th>
                <th style="padding: 10px 12px; font-weight: bold;">Entorno</th>
                <th style="padding: 10px 12px; font-weight: bold;">Especificación</th>
              </tr>
            </thead>
            <tbody>
              ${componentesList}
            </tbody>
          </table>

          <!-- Acciones -->
          <div style="margin-top: 36px; padding: 24px; background: #eff6ff; border-radius: 12px; text-align: center; border: 1px dashed #bfdbfe;">
            <p style="margin: 0 0 16px 0; font-weight: bold; color: #1e3a8a; font-size: 15px;">¿Cómo deseas proceder?</p>
            <div style="display: inline-block;">
              <a href="${linkAprobar}" target="_blank" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; margin-right: 12px; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                Aprobar Solicitud
              </a>
              <a href="${linkRechazar}" target="_blank" style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px rgba(239,68,68,0.2);">
                Rechazar Solicitud
              </a>
            </div>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #64748b;">
              * Al hacer clic en Aprobar o Rechazar se registrará de forma inmutable su firma electrónica digital (Principio de No Repudio ISO).
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Este es un correo automático del SGPRC (SGEM Platform).<br/>
          Para auditorías internas, el Token hash de no repudio de esta operación es único y válido por 48 horas.
        </div>
      </div>
    </body>
    </html>
  `
}
