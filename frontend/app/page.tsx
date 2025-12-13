'use client'

import { useState } from 'react'
import {
  CommandPalette,
  CollapsibleSidebar,
  Breadcrumb,
  KeyboardShortcutsDialog,
  ThemeToggle,
  GlobalSearch,
  EmptyState,
  ContextMenu,
  Tooltip,
} from '@/components/modern-ui'
import type { ContextMenuItem } from '@/components/modern-ui/context-menu'
import { useTheme } from '@/lib/hooks/use-theme'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'
import { FileText, Settings, Plus, Copy, Trash2, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function Home() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { setTheme } = useTheme()

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrlKey: true,
      handler: () => setIsCommandPaletteOpen(true),
    },
    {
      key: 'b',
      ctrlKey: true,
      handler: () => {
        setIsSidebarCollapsed(!isSidebarCollapsed)
        toast.success(isSidebarCollapsed ? 'Sidebar expanded' : 'Sidebar collapsed')
      },
    },
    {
      key: '/',
      ctrlKey: true,
      handler: () => setIsShortcutsDialogOpen(true),
    },
  ])

  const breadcrumbItems = [
    { label: 'Projects', href: '/projects' },
    { label: 'My Workspace', href: '/workspace' },
    { label: 'index.tsx' },
  ]

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: 'New File',
      icon: Plus,
      onClick: () => toast.success('New file created'),
      shortcut: 'Ctrl+N',
    },
    {
      label: 'Copy',
      icon: Copy,
      onClick: () => toast.success('Copied to clipboard'),
      shortcut: 'Ctrl+C',
    },
    {
      label: 'Rename',
      icon: Edit,
      onClick: () => toast.success('Rename dialog opened'),
      shortcut: 'F2',
    },
    { divider: true } as const,
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => toast.error('File deleted'),
      danger: true,
      shortcut: 'Del',
    },
  ]

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <CollapsibleSidebar defaultCollapsed={isSidebarCollapsed} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-panel h-16 flex items-center justify-between px-6 border-b border-white/10"
        >
          <Breadcrumb items={breadcrumbItems} />
          
          <div className="flex items-center gap-4">
            <GlobalSearch onResultClick={(result) => toast.success(`Opening ${result.title}`)} />
            
            <Tooltip content="Settings (Ctrl+,)">
              <button
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                onClick={() => toast.success('Settings opened')}
              >
                <Settings className="h-5 w-5" />
              </button>
            </Tooltip>
            
            <ThemeToggle />
          </div>
        </motion.header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl font-bold mb-2">Welcome to Algo IDE</h1>
            <p className="text-gray-400 mb-8">
              A modern cloud-based IDE with a beautiful UI/UX
            </p>

            {/* Demo Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[
                { title: 'Command Palette', shortcut: 'Ctrl+K', desc: 'Quick actions and navigation' },
                { title: 'Global Search', shortcut: 'Ctrl+P', desc: 'Search files, folders, and docs' },
                { title: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', desc: 'View all shortcuts' },
              ].map((item, index) => (
                <ContextMenu key={index} items={contextMenuItems}>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="glass-card p-6 rounded-lg cursor-pointer"
                  >
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm mb-3">{item.desc}</p>
                    <kbd className="px-2 py-1 text-xs bg-gray-800 border border-white/10 rounded">
                      {item.shortcut}
                    </kbd>
                  </motion.div>
                </ContextMenu>
              ))}
            </div>

            {/* Empty State Demo */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="glass-card rounded-lg p-8"
            >
              <EmptyState
                icon={FileText}
                title="No files yet"
                description="Get started by creating a new file or opening an existing project. Right-click anywhere to see context menu."
                action={{
                  label: 'Create New File',
                  onClick: () => toast.success('Creating new file...'),
                }}
                secondaryAction={{
                  label: 'Open Project',
                  onClick: () => toast.success('Opening project selector...'),
                }}
              />
            </motion.div>
          </motion.div>
        </main>

        {/* Footer Status Bar */}
        <motion.footer
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-panel h-8 flex items-center justify-between px-4 text-xs border-t border-white/10"
        >
          <div className="flex items-center gap-4">
            <span className="text-green-400">● Connected</span>
            <span className="text-gray-500">|</span>
            <span>UTF-8</span>
            <span className="text-gray-500">|</span>
            <span>LF</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Ln 1, Col 1</span>
            <span className="text-gray-500">|</span>
            <span>TypeScript React</span>
          </div>
        </motion.footer>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onThemeChange={setTheme}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={isShortcutsDialogOpen}
        onClose={() => setIsShortcutsDialogOpen(false)}
      />
    </div>
  )
}
