'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isDark: boolean
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'sgem_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const currentAttr = document.documentElement.getAttribute('data-theme') as Theme | null
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null

    // Default to 'light' (original design) unless explicitly saved by the user
    const initialTheme: Theme =
      currentAttr === 'dark' || currentAttr === 'light'
        ? currentAttr
        : savedTheme === 'dark' || savedTheme === 'light'
        ? savedTheme
        : 'light'

    setThemeState(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
    setMounted(true)
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        mounted,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider')
  }
  return context
}
