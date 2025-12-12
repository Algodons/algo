'use client'

import { useState } from 'react'

interface FileItem {
  name: string
  type: 'file' | 'folder'
  children?: FileItem[]
}

const Sidebar = () => {
  const [files] = useState<FileItem[]>([
    {
      name: 'src',
      type: 'folder',
      children: [
        { name: 'index.ts', type: 'file' },
        { name: 'app.ts', type: 'file' },
      ],
    },
    {
      name: 'public',
      type: 'folder',
      children: [
        { name: 'index.html', type: 'file' },
      ],
    },
    { name: 'package.json', type: 'file' },
    { name: 'README.md', type: 'file' },
  ])

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['src', 'public']))

  const toggleFolder = (folderName: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName)
    } else {
      newExpanded.add(folderName)
    }
    setExpanded(newExpanded)
  }

  const renderFileTree = (items: FileItem[], level = 0) => {
    return items.map((item, index) => (
      <div key={`${item.name}-${index}`} style={{ paddingLeft: `${level * 12}px` }}>
        <div
          className="flex items-center py-1 px-2 hover:bg-gray-800 cursor-pointer text-sm"
          onClick={() => item.type === 'folder' && toggleFolder(item.name)}
        >
          {item.type === 'folder' ? (
            <span className="mr-2">{expanded.has(item.name) ? '▼' : '▶'}</span>
          ) : (
            <span className="mr-2">📄</span>
          )}
          <span className="text-gray-300">{item.name}</span>
        </div>
        {item.type === 'folder' && expanded.has(item.name) && item.children && (
          <div>{renderFileTree(item.children, level + 1)}</div>
        )}
      </div>
    ))
  }

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-white font-semibold text-lg">Algo IDE</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          <h3 className="text-gray-400 text-xs uppercase font-semibold mb-2 px-2">
            Explorer
          </h3>
          {renderFileTree(files)}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
