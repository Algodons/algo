'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
  category: string
}

interface KeyboardShortcutsDialogProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts: Shortcut[] = [
  // General
  { keys: ['Ctrl', 'K'], description: 'Open command palette', category: 'General' },
  { keys: ['Ctrl', 'B'], description: 'Toggle sidebar', category: 'General' },
  { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts', category: 'General' },
  { keys: ['Ctrl', 'P'], description: 'Quick project switcher', category: 'General' },
  { keys: ['Esc'], description: 'Close dialogs', category: 'General' },
  
  // File Operations
  { keys: ['Ctrl', 'N'], description: 'New file', category: 'File' },
  { keys: ['Ctrl', 'Shift', 'N'], description: 'New folder', category: 'File' },
  { keys: ['Ctrl', 'S'], description: 'Save file', category: 'File' },
  { keys: ['Ctrl', 'W'], description: 'Close file', category: 'File' },
  
  // View
  { keys: ['Ctrl', 'Shift', 'E'], description: 'Toggle Explorer', category: 'View' },
  { keys: ['Ctrl', 'Shift', 'F'], description: 'Toggle Search', category: 'View' },
  { keys: ['Ctrl', 'Shift', 'G'], description: 'Toggle Source Control', category: 'View' },
  { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle Database', category: 'View' },
  { keys: ['Ctrl', '`'], description: 'Toggle Terminal', category: 'View' },
  
  // Editor
  { keys: ['Ctrl', 'F'], description: 'Find in file', category: 'Editor' },
  { keys: ['Ctrl', 'H'], description: 'Replace in file', category: 'Editor' },
  { keys: ['Ctrl', 'D'], description: 'Select next occurrence', category: 'Editor' },
  { keys: ['Ctrl', '/'], description: 'Toggle comment', category: 'Editor' },
  
  // Navigation
  { keys: ['Ctrl', 'Tab'], description: 'Next editor', category: 'Navigation' },
  { keys: ['Ctrl', 'Shift', 'Tab'], description: 'Previous editor', category: 'Navigation' },
  { keys: ['Ctrl', 'G'], description: 'Go to line', category: 'Navigation' },
]

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  if (!isOpen) return null

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)))

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto p-6 max-h-[calc(80vh-80px)]">
            {categories.map((category) => (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts
                    .filter((s) => s.category === category)
                    .map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded hover:bg-white/5 transition-colors"
                      >
                        <span className="text-sm text-gray-300">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <kbd className="px-2 py-1 text-xs font-semibold text-gray-300 bg-gray-800 border border-white/10 rounded">
                                {key}
                              </kbd>
                              {i < shortcut.keys.length - 1 && (
                                <span className="text-gray-600">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
