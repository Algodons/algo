'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  GitBranch,
  Database,
  Settings,
  Folder,
  Home,
  Clock,
} from 'lucide-react'

interface SidebarProps {
  children?: React.ReactNode
  defaultCollapsed?: boolean
}

export function CollapsibleSidebar({ children, defaultCollapsed = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const menuItems = [
    { icon: Home, label: 'Home', shortcut: 'Ctrl+H' },
    { icon: FileText, label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
    { icon: Search, label: 'Search', shortcut: 'Ctrl+Shift+F' },
    { icon: GitBranch, label: 'Source Control', shortcut: 'Ctrl+Shift+G' },
    { icon: Database, label: 'Database', shortcut: 'Ctrl+Shift+D' },
    { icon: Clock, label: 'Recent', shortcut: 'Ctrl+R' },
    { icon: Settings, label: 'Settings', shortcut: 'Ctrl+,' },
  ]

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? 60 : 240,
      }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="relative h-screen border-r border-white/10 flex flex-col"
      style={{
        background: 'rgba(17, 24, 39, 0.8)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors shadow-lg"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo/Header */}
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <Folder className="h-6 w-6 text-blue-400" />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="ml-3 text-lg font-semibold"
            >
              Algo IDE
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <motion.button
              key={item.label}
              initial={false}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all"
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <>
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="flex-1 text-left"
                    >
                      {item.label}
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {item.shortcut}
                    </motion.span>
                  </>
                )}
              </AnimatePresence>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  {item.label}
                  <span className="ml-2 text-gray-400">{item.shortcut}</span>
                </div>
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Recent Projects Section */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="border-t border-white/10 p-4"
        >
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent Projects</h3>
          <div className="space-y-1">
            {['Project Alpha', 'Project Beta', 'Project Gamma'].map((project) => (
              <button
                key={project}
                className="w-full text-left px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
              >
                {project}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Custom Content */}
      {children && (
        <div className="border-t border-white/10">
          {children}
        </div>
      )}
    </motion.aside>
  )
}
