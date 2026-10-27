import { submitDecisionAction } from '@/modules/sgprc/actions/sgprc.action'
import Link from 'next/link'

export const metadata = {
  title: 'Decisión SGPRC | Protecta',
  robots: { index: false, follow: false }
}

export default async function SGPRCDecisionPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const sp = await searchParams
  const token = sp.token

  if (!token) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Token no especificado</h2>
        <p style={{ color: '#64748b' }}>No se ha proporcionado un token válido de aprobación.</p>
      </div>
    )
  }

  const result = await submitDecisionAction(token)

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '40px 20px',
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '500px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '36px 28px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: result.success ? '#ecfdf5' : '#fef2f2',
          color: result.success ? '#059669' : '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          margin: '0 auto 16px auto'
        }}>
          {result.success ? '✓' : '✕'}
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          {result.success ? 'Respuesta Registrada con Éxito' : 'No se pudo procesar la solicitud'}
        </h1>

        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
          {result.success
            ? result.data?.message || 'Tu decisión ha sido procesada y el estado del ticket se actualizó automáticamente.'
            : result.error || 'El token de decisión ya fue utilizado o ha caducado.'}
        </p>

        <Link
          href="/sgprc"
          style={{
            display: 'inline-block',
            background: '#0f172a',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px'
          }}
        >
          Volver a SGPRC
        </Link>
      </div>
    </main>
  )
}
