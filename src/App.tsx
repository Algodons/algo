import React, { useState } from 'react';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import FileExplorer from './components/FileExplorer';
import GitPanel from './components/GitPanel';
import DatabasePanel from './components/DatabasePanel';
import PreviewPanel from './components/PreviewPanel';
import PackageManager from './components/PackageManager';
import './App.css';

const App: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [workspaceId] = useState('default-workspace');

  return (
    <div className="app">
      <header className="app-header">
        <h1>☁️ Cloud IDE</h1>
        <div className="header-actions">
          <button className="btn">File</button>
          <button className="btn">Edit</button>
          <button className="btn">View</button>
          <button className="btn">Git</button>
          <button className="btn">Database</button>
        </div>
      </header>
      
      <div className="app-body">
        <aside className="sidebar">
          <FileExplorer 
            workspaceId={workspaceId} 
            onFileSelect={setActiveFile}
          />
          <GitPanel workspaceId={workspaceId} />
          <PackageManager workspaceId={workspaceId} />
        </aside>
        
        <main className="main-content">
          <div className="editor-section">
            <Editor 
              workspaceId={workspaceId}
              filePath={activeFile}
            />
          </div>
          
          <div className="preview-section">
            <PreviewPanel workspaceId={workspaceId} />
          </div>
          
          <div className="terminal-section">
            <Terminal />
          </div>
        </main>
        
        <aside className="right-sidebar">
          <DatabasePanel />
        </aside>
      </div>
    </div>
  );
};

export default App;
