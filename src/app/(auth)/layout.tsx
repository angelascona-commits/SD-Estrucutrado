import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Acceso — SGEM',
  description: 'Plataforma de Gestión Empresarial Modular',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      {children}
    </div>
  )
}