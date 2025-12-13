'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  systemTheme: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    // Listen for system theme changes
    const listener = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', listener)

    // Load saved theme with validation
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system')) {
      setTheme(savedTheme as Theme)
    }

    return () => mediaQuery.removeEventListener('change', listener)
  }, [])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const root = window.document.documentElement
    const effectiveTheme = theme === 'system' ? systemTheme : theme

    root.classList.remove('light', 'dark')
    root.classList.add(effectiveTheme)

    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme, systemTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, systemTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
