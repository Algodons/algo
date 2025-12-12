'use client';

import { useState } from 'react';
import { File, Folder, ChevronRight, ChevronDown } from 'lucide-react';

interface EditorSidebarProps {
  width: number;
  projectId: string;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

export function EditorSidebar({ width, projectId }: EditorSidebarProps) {
  const [files] = useState<FileNode[]>([
    {
      name: 'src',
      type: 'folder',
      path: '/src',
      children: [
        { name: 'index.js', type: 'file', path: '/src/index.js' },
        { name: 'App.js', type: 'file', path: '/src/App.js' },
      ],
    },
    { name: 'package.json', type: 'file', path: '/package.json' },
    { name: 'README.md', type: 'file', path: '/README.md' },
  ]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/src']));

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.path);

    return (
      <div key={node.path}>
        <div
          className="flex items-center space-x-2 py-1 px-2 hover:bg-accent cursor-pointer"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => node.type === 'folder' && toggleFolder(node.path)}
        >
          {node.type === 'folder' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Folder className="h-4 w-4 text-primary" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <File className="h-4 w-4 text-muted-foreground" />
            </>
          )}
          <span className="text-sm">{node.name}</span>
        </div>
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="border-r bg-background overflow-y-auto"
      style={{ width }}
    >
      <div className="p-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          Files
        </h2>
        {files.map((file) => renderFileNode(file))}
      </div>
    </div>
  );
}
