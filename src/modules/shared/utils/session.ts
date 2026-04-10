import { cookies } from 'next/headers'
import type { SessionPayload } from '@/modules/auth/interfaces/auth.interfaces'

const COOKIE_NAME = 'sgem_session'

// ─── IMPORTANTE ──────────────────────────────────────────────────────────────
// Este archivo es el único punto de contacto con las cookies de sesión.
// Cuando se agregue seguridad real (JWT firmado, etc.), solo se modifica aquí.
// ─────────────────────────────────────────────────────────────────────────────

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as SessionPayload
  } catch {
    return null
  }
}

export async function setSession(data: SessionPayload): Promise<void> {
  const cookieStore = await cookies()
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64')
  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas de sesión
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}