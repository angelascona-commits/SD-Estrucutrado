import { getPublicReportDataAction } from '@/modules/tareo/actions/tareo.action'
import PublicReportTable from '@/modules/tareo/components/PublicReportTable'

export default async function PublicReportPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ token: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // 1. Desenvolver la promesa de los parámetros (Requisito de Next.js 15+)
  const resolvedParams = await params;
  const token = resolvedParams.token;
  const sp = await searchParams;
  const filterSolicitante = sp.solicitante ? Number(sp.solicitante) : undefined;
  const filterTrabajador = sp.trabajador ? Number(sp.trabajador) : undefined;
  const filterCosto = sp.costo ? Number(sp.costo) : undefined;

  // 2. Llamar a la acción del servidor con el token
  const response = await getPublicReportDataAction(token);

  // 3. Validar si hubo un error o si el link expiró
  if (!response.success || !response.data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Acceso Denegado</h2>
        <p>{response.error || 'El enlace ha expirado o no es válido.'}</p>
      </div>
    )
  }

  // 4. Extraer los datos (ahora incluye la tabla de feedback bidireccional)
  let { registros, feedback, linkId } = response.data

  if (filterSolicitante) {
    registros = registros.filter((r: any) => r.solicitante_id === filterSolicitante);
  }
  if (filterTrabajador) {
    registros = registros.filter((r: any) => r.trabajador_id === filterTrabajador);
  }

  return (
    <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>Revisión de Tareo Detallado</h1>
        <p style={{ color: '#6B7280' }}>
          Por favor, revise el log de actividades y añada sus observaciones en la columna "Observaciones Protecta". 
          Recuerde guardar sus cambios al finalizar la revisión.
        </p>
      </header>
      
      <PublicReportTable 
        registros={registros} 
        feedback={feedback} 
        linkId={linkId}
        costoHora={filterCosto}
      />
    </main>
  )
}