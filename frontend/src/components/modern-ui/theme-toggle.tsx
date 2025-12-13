'use client'

import { motion } from 'framer-motion'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/hooks/use-theme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const

  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
      {themes.map((t) => {
        const Icon = t.icon
        const isActive = theme === t.value

        return (
          <motion.button
            key={t.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme(t.value)}
            className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            aria-label={`Switch to ${t.label} theme`}
          >
            {isActive && (
              <motion.div
                layoutId="theme-toggle-bg"
                className="absolute inset-0 bg-blue-600 rounded-md"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
