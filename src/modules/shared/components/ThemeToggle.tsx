'use client'

import React from 'react'
import { useTheme } from '../providers/ThemeProvider'
import styles from './ThemeToggle.module.css'

interface ThemeToggleProps {
  showLabel?: boolean
  className?: string
}

export default function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme()

  const isDark = mounted ? theme === 'dark' : false
  const titleText = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
  const labelText = isDark ? 'Modo Oscuro' : 'Modo Claro'

  return (
    <button
      type="button"
      className={`${styles.toggleButton} ${showLabel ? styles.withLabel : ''} ${className}`}
      onClick={toggleTheme}
      title={titleText}
      aria-label={titleText}
    >
      <span
        className={`material-symbols-outlined ${styles.icon} ${
          isDark ? styles.iconDark : styles.iconLight
        }`}
      >
        {isDark ? 'dark_mode' : 'light_mode'}
      </span>
      {showLabel && <span className={styles.label}>{labelText}</span>}
    </button>
  )
}
