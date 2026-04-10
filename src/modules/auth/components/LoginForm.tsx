'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginAction } from '@/modules/auth/actions/login.action'
import type { LoginActionState } from '@/modules/auth/interfaces/auth.interfaces'
import styles from './LoginForm.module.css'

const initialState: LoginActionState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={styles.button}
      aria-busy={pending}
    >
      {pending ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        'Ingresar'
      )}
    </button>
  )
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState)

  return (
    <form action={action} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="usuario@empresa.com"
          className={styles.input}
          aria-describedby={state.error ? 'form-error' : undefined}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={styles.input}
          aria-describedby={state.error ? 'form-error' : undefined}
        />
      </div>

      {state.error && (
        <p id="form-error" className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}