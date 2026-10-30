import Link from 'next/link'
import { Link2 } from 'lucide-react'

export const metadata = {
  title: 'Reporte Externo | SGEM',
  robots: { index: false, follow: false }
}

export default function ReporteExternoRootPage() {
  return (
    <div style={{
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
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: '#e0f2fe',
        color: '#0284c7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px'
      }}>
        <Link2 size={28} />
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
        Portal de Reporte Externo
      </h1>
      <p style={{ color: '#64748b', maxWidth: '480px', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
        Para consultar los reportes, debes ingresar a través del enlace mágico específico provisto por tu supervisor o equipo de proyecto.
      </p>
      <Link 
        href="/login"
        style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '14px'
        }}
      >
        Ir al Sistema Principal
      </Link>
    </div>
  )
}
