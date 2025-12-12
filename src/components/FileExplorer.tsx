import React, { useState, useEffect } from 'react';
import './FileExplorer.css';

interface FileExplorerProps {
  workspaceId: string;
  onFileSelect: (path: string) => void;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

const FileExplorer: React.FC<FileExplorerProps> = ({ workspaceId, onFileSelect }) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFiles();
  }, [workspaceId]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/preview/files?workspaceId=${workspaceId}`);
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`file-tree-item ${node.type === 'directory' ? 'directory' : 'file'}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleDirectory(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
        >
          <span className="file-icon">
            {node.type === 'directory' 
              ? (expandedDirs.has(node.path) ? '📂' : '📁') 
              : '📄'}
          </span>
          <span className="file-name">{node.name}</span>
        </div>
        {node.type === 'directory' && expandedDirs.has(node.path) && node.children && (
          <div>{renderFileTree(node.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="file-explorer">
      <div className="panel-title">Files</div>
      <div className="file-tree">
        {files.length > 0 ? renderFileTree(files) : (
          <div className="empty-state">No files in workspace</div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
