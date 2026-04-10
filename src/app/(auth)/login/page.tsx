import { redirect } from 'next/navigation'
import { getSession } from '@/modules/shared/utils/session'
import { LoginForm } from '@/modules/auth/components/LoginForm'
import styles from './page.module.css'

export default async function LoginPage() {
  // Si ya hay sesión activa, ir directo al dashboard
  const session = await getSession()
  if (session) redirect('/service-desk')

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Bienvenido</h1>
          <p className={styles.subtitle}>SGEM — Gestión Empresarial</p>
        </header>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Iniciar sesión</p>
          <p className={styles.cardSubtitle}>Ingresa tus credenciales para continuar</p>
          <LoginForm />
        </div>
      </div>
    </main>
  )
}