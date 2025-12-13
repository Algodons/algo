'use client'

import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  File,
  Folder,
  Settings,
  Terminal,
  Database,
  FileText,
  GitBranch,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onThemeChange?: (theme: 'dark' | 'light' | 'system') => void
}

export function CommandPalette({ isOpen, onClose, onThemeChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="fixed left-1/2 top-20 -translate-x-1/2 w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Command
            className="rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl"
            style={{
              background: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="flex items-center border-b border-white/10 px-4">
              <Search className="mr-2 h-5 w-5 shrink-0 opacity-50" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Type a command or search..."
                className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-gray-500">
                No results found.
              </Command.Empty>

              <Command.Group heading="Quick Actions" className="mb-2">
                <CommandItem icon={<File />} onSelect={onClose}>
                  New File
                  <span className="ml-auto text-xs text-gray-500">Ctrl+N</span>
                </CommandItem>
                <CommandItem icon={<Folder />} onSelect={onClose}>
                  New Folder
                  <span className="ml-auto text-xs text-gray-500">Ctrl+Shift+N</span>
                </CommandItem>
                <CommandItem icon={<Terminal />} onSelect={onClose}>
                  Open Terminal
                  <span className="ml-auto text-xs text-gray-500">Ctrl+`</span>
                </CommandItem>
                <CommandItem icon={<Settings />} onSelect={onClose}>
                  Settings
                  <span className="ml-auto text-xs text-gray-500">Ctrl+,</span>
                </CommandItem>
              </Command.Group>

              <Command.Group heading="Views" className="mb-2">
                <CommandItem icon={<FileText />} onSelect={onClose}>
                  Explorer
                  <span className="ml-auto text-xs text-gray-500">Ctrl+Shift+E</span>
                </CommandItem>
                <CommandItem icon={<Search />} onSelect={onClose}>
                  Search
                  <span className="ml-auto text-xs text-gray-500">Ctrl+Shift+F</span>
                </CommandItem>
                <CommandItem icon={<GitBranch />} onSelect={onClose}>
                  Source Control
                  <span className="ml-auto text-xs text-gray-500">Ctrl+Shift+G</span>
                </CommandItem>
                <CommandItem icon={<Database />} onSelect={onClose}>
                  Database
                  <span className="ml-auto text-xs text-gray-500">Ctrl+Shift+D</span>
                </CommandItem>
              </Command.Group>

              <Command.Group heading="Theme">
                <CommandItem
                  icon={<Moon />}
                  onSelect={() => {
                    onThemeChange?.('dark')
                    onClose()
                  }}
                >
                  Dark Mode
                </CommandItem>
                <CommandItem
                  icon={<Sun />}
                  onSelect={() => {
                    onThemeChange?.('light')
                    onClose()
                  }}
                >
                  Light Mode
                </CommandItem>
                <CommandItem
                  icon={<Monitor />}
                  onSelect={() => {
                    onThemeChange?.('system')
                    onClose()
                  }}
                >
                  System Theme
                </CommandItem>
              </Command.Group>
            </Command.List>
          </Command>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface CommandItemProps {
  icon: React.ReactNode
  children: React.ReactNode
  onSelect: () => void
}

function CommandItem({ icon, children, onSelect }: CommandItemProps) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-white/5 aria-selected:bg-white/10 transition-colors"
    >
      <span className="opacity-70">{icon}</span>
      {children}
    </Command.Item>
  )
}
