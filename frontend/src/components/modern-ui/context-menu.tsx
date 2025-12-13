'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

export type ContextMenuItem = {
  label: string
  icon?: LucideIcon
  onClick: () => void
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  divider?: never
} | {
  divider: true
  label?: never
  icon?: never
  onClick?: never
  shortcut?: never
  disabled?: never
  danger?: never
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  children: React.ReactNode
}

export function ContextMenu({ items, children }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setPosition({ x: e.clientX, y: e.clientY })
    setIsOpen(true)
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  const handleItemClick = (item: ContextMenuItem) => {
    if ('divider' in item || item.disabled) return
    item.onClick()
    setIsOpen(false)
  }

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              zIndex: 9999,
            }}
            className="min-w-[200px] rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl py-1"
          >
            {items.map((item, index) => {
              if ('divider' in item && item.divider) {
                return <div key={index} className="h-px bg-white/10 my-1" />
              }

              const Icon = item.icon

              return (
                <motion.button
                  key={index}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    item.disabled
                      ? 'text-gray-600 cursor-not-allowed'
                      : item.danger
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs text-gray-600">{item.shortcut}</span>
                  )}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
