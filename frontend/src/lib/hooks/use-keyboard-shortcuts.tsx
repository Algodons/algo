'use client'

import { useEffect } from 'react'

type ShortcutHandler = () => void

interface Shortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  handler: ShortcutHandler
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const matchesCtrl = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey || shortcut.metaKey
        const matchesMeta = shortcut.metaKey ? event.metaKey : !event.metaKey || shortcut.ctrlKey
        const matchesShift = shortcut.shiftKey ? event.shiftKey : !event.shiftKey
        const matchesAlt = shortcut.altKey ? event.altKey : !event.altKey

        // On Mac, use metaKey (Cmd), on Windows/Linux use ctrlKey
        const modifierMatch = (shortcut.ctrlKey || shortcut.metaKey)
          ? (event.metaKey || event.ctrlKey)
          : true

        if (matchesKey && modifierMatch && matchesShift && matchesAlt) {
          event.preventDefault()
          shortcut.handler()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
