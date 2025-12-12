import { useState } from 'react'
import './FileExplorer.css'
import { FileNode } from '../types'

interface FileExplorerProps {
  files: FileNode[]
  onFileClick: (path: string) => void
  onRefresh: () => void
}

const FileExplorer = ({ files, onFileClick, onRefresh }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const getFileIcon = (node: FileNode) => {
    if (node.type === 'directory') {
      return expandedFolders.has(node.path) ? '📂' : '📁'
    }
    
    const ext = node.name.split('.').pop()?.toLowerCase()
    const iconMap: Record<string, string> = {
      'js': '📄',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'py': '🐍',
      'go': '🔵',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'rs': '🦀',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'md': '📝',
      'png': '🖼️',
      'jpg': '🖼️',
      'gif': '🖼️',
      'svg': '🎨',
      'pdf': '📕'
    }
    return iconMap[ext || ''] || '📄'
  }

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path)
    
    return (
      <div key={node.id} className="file-node">
        <div
          className={`file-item ${node.type}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleFolder(node.path)
            } else {
              onFileClick(node.path)
            }
          }}
        >
          <span className="file-icon">{getFileIcon(node)}</span>
          <span className="file-name">{node.name}</span>
        </div>
        {node.type === 'directory' && isExpanded && node.children && (
          <div className="folder-children">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <span className="explorer-title">EXPLORER</span>
        <button className="refresh-button" onClick={onRefresh} title="Refresh">
          🔄
        </button>
      </div>
      <div className="explorer-content">
        {files.map(node => renderNode(node))}
        {files.length === 0 && (
          <div className="empty-state">
            <p>No files in workspace</p>
            <button onClick={onRefresh}>Refresh</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileExplorer
