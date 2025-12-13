'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, File, Folder, FileText } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  type: 'file' | 'folder' | 'doc'
  path: string
}

interface GlobalSearchProps {
  onResultClick?: (result: SearchResult) => void
}

export function GlobalSearch({ onResultClick }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])

  // Mock search function - replace with actual search logic
  const handleSearch = (value: string) => {
    setQuery(value)
    
    if (value.length > 0) {
      // Mock results
      setResults([
        { id: '1', title: 'index.tsx', type: 'file', path: '/src/app/index.tsx' },
        { id: '2', title: 'components', type: 'folder', path: '/src/components' },
        { id: '3', title: 'README.md', type: 'doc', path: '/README.md' },
      ])
    } else {
      setResults([])
    }
  }

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'file':
        return <File className="h-4 w-4" />
      case 'folder':
        return <Folder className="h-4 w-4" />
      case 'doc':
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search files, folders, docs..."
          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          style={{
            backdropFilter: 'blur(10px)',
          }}
        />
      </div>

      <AnimatePresence>
        {isFocused && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="py-1">
              {results.map((result, index) => (
                <motion.button
                  key={result.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    onResultClick?.(result)
                    setQuery('')
                    setResults([])
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                >
                  <span className="text-gray-400">{getIcon(result.type)}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-white">{result.title}</div>
                    <div className="text-xs text-gray-500">{result.path}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
