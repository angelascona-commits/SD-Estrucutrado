import Image from 'next/image'
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
      minHeight: '100vh',
      padding: '40px 20px',
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
      background: '#f4f8f8'
    }}>
      <div style={{ marginBottom: '28px' }}>
        <Image
          src="/brand/logo.svg"
          alt="DM Software - Digital Partner"
          width={200}
          height={36}
          priority
          style={{ height: '36px', width: 'auto' }}
        />
      </div>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: '#e8f7f8',
        color: '#036a6e',
        border: '1px solid rgba(4, 154, 160, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px'
      }}>
        <Link2 size={28} />
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#023a3c', marginBottom: '8px' }}>
        Portal de Reporte Externo
      </h1>
      <p style={{ color: '#4b6b6c', maxWidth: '480px', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
        Para consultar los reportes, debes ingresar a través del enlace mágico específico provisto por tu supervisor o equipo de proyecto.
      </p>
      <Link 
        href="/login"
        style={{
          background: '#036a6e',
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
