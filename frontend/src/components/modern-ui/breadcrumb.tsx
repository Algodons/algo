'use client'

import { ChevronRight, Home } from 'lucide-react'
import { motion } from 'framer-motion'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate?: (href: string) => void
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onNavigate?.('/')}
        className="flex items-center text-gray-400 hover:text-white transition-colors"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </motion.button>

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="h-4 w-4 text-gray-600" />
          <motion.button
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => item.href && onNavigate?.(item.href)}
            className={`flex items-center space-x-1.5 ${
              index === items.length - 1
                ? 'text-white font-medium'
                : 'text-gray-400 hover:text-white'
            } transition-colors`}
            disabled={!item.href || index === items.length - 1}
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
          </motion.button>
        </div>
      ))}
    </nav>
  )
}
