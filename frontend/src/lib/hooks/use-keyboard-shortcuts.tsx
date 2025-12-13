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
        
        // Check modifiers exactly as specified
        const matchesCtrl = shortcut.ctrlKey ? event.ctrlKey : true
        const matchesMeta = shortcut.metaKey ? event.metaKey : true
        const matchesShift = shortcut.shiftKey ? event.shiftKey : !event.shiftKey
        const matchesAlt = shortcut.altKey ? event.altKey : !event.altKey

        // On Mac, Cmd (metaKey) should work as Ctrl, on Windows/Linux use Ctrl
        const hasRequiredModifier = (shortcut.ctrlKey || shortcut.metaKey)
          ? (event.metaKey || event.ctrlKey)
          : (!event.metaKey && !event.ctrlKey)

        if (matchesKey && hasRequiredModifier && matchesShift && matchesAlt && matchesCtrl && matchesMeta) {
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
