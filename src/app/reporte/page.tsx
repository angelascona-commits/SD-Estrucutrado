import { getPublicReportDataAction } from '@/modules/tareo/actions/tareo.action'
import PublicReportTable from '@/modules/tareo/components/PublicReportTable'
import Link from 'next/link'

export const metadata = {
  title: 'Portal de Tareo y Supervisión | Protecta',
  robots: {
    index: false,
    follow: false
  }
}

export default async function ReporteQueryPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams

  // El token ahora viene oculto bajo el parámetro 'id' (o alias compatibles: ref, doc, token)
  const token = (
    (typeof sp.id === 'string' ? sp.id : '') ||
    (typeof sp.ref === 'string' ? sp.ref : '') ||
    (typeof sp.doc === 'string' ? sp.doc : '') ||
    (typeof sp.code === 'string' ? sp.code : '') ||
    (typeof sp.token === 'string' ? sp.token : '') ||
    ''
  )

  const filterSolicitante = sp.solicitante ? Number(sp.solicitante) : undefined
  const filterTrabajador = sp.trabajador ? Number(sp.trabajador) : undefined
  const filterAgrupador = sp.agrupador ? Number(sp.agrupador) : undefined
  const filterProyecto = sp.proyecto ? Number(sp.proyecto) : undefined
  const filterTeam = sp.team ? Number(sp.team) : undefined
  const filterCosto = sp.costo ? Number(sp.costo) : undefined
  const filterDuracion = typeof sp.duracion === 'string' ? sp.duracion : undefined
  const filterTarea = sp.tarea ? Number(sp.tarea) : undefined
  const filterPeriodo = sp.periodo ? Number(sp.periodo) : undefined

  // Llamar a la acción del servidor con el token/slug o cargar el período activo más reciente
  const response = await getPublicReportDataAction(token, filterPeriodo)

  if (!response.success || !response.data) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '40px 20px',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#f8fafc'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#fee2e2',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          marginBottom: '16px'
        }}>
          ⚠️
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
          Acceso no disponible o enlace expirado
        </h2>
        <p style={{ color: '#64748b', maxWidth: '460px', fontSize: '14px', lineHeight: 1.5 }}>
          {response.error || 'El enlace que estás utilizando ya no es válido o su tiempo de acceso ha caducado. Por favor, solicita un nuevo enlace actualizado al equipo de soporte.'}
        </p>
      </div>
    )
  }

  const { 
    registros, 
    tareasPeriodo, 
    feedback, 
    linkId, 
    periodo, 
    periodos, 
    agrupadores 
  } = response.data

  return (
    <main data-theme="light" style={{ minHeight: '100vh', background: '#f8fafc', padding: 0, margin: 0, colorScheme: 'light' }}>
      <PublicReportTable 
        token={token}
        registros={registros || []} 
        tareasPeriodo={tareasPeriodo || []}
        feedback={feedback || []} 
        linkId={linkId}
        costoHora={filterCosto ?? 65}
        periodo={periodo}
        periodos={periodos || []}
        agrupadores={agrupadores || []}
        initialFilters={{
          solicitanteId: filterSolicitante,
          trabajadorId: filterTrabajador,
          agrupadorId: filterAgrupador,
          proyectoId: filterProyecto,
          teamId: filterTeam,
          duracionFiltro: filterDuracion,
          tareaId: filterTarea
        }}
      />
    </main>
  )
}
