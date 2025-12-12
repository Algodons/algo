import { useState, useEffect } from 'react'
import './App.css'
import FileExplorer from './components/FileExplorer'
import EditorPane from './components/EditorPane'
import Terminal from './components/Terminal'
import Toolbar from './components/Toolbar'
import StatusBar from './components/StatusBar'
import SearchPanel from './components/SearchPanel'
import { EditorTab, FileNode, TerminalSession, EditorConfig } from './types'

function App() {
  const [files, setFiles] = useState<FileNode[]>([])
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [terminals, setTerminals] = useState<TerminalSession[]>([])
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [editorConfig, setEditorConfig] = useState<EditorConfig>({
    theme: 'vs-dark',
    fontSize: 14,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: 'on',
    keyBindings: 'default',
    formatOnSave: true
  })
  const [splitView, setSplitView] = useState<'single' | 'horizontal' | 'vertical' | 'grid'>('single')

  useEffect(() => {
    // Load workspace files
    loadWorkspace()
  }, [])

  const loadWorkspace = async () => {
    try {
      const response = await fetch('/api/files')
      const data = await response.json()
      setFiles(data)
    } catch (error) {
      console.error('Failed to load workspace:', error)
    }
  }

  const openFile = async (path: string) => {
    // Check if file is already open
    const existing = openTabs.find(tab => tab.path === path)
    if (existing) {
      setActiveTab(existing.id)
      return
    }

    try {
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(path)}`)
      const data = await response.json()
      
      const newTab: EditorTab = {
        id: `tab-${Date.now()}`,
        path,
        name: path.split('/').pop() || 'untitled',
        content: data.content,
        language: detectLanguage(path),
        modified: false
      }

      setOpenTabs([...openTabs, newTab])
      setActiveTab(newTab.id)
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  const detectLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase()
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'go': 'go',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'shell',
      'sql': 'sql'
    }
    return langMap[ext || ''] || 'plaintext'
  }

  const closeTab = (tabId: string) => {
    const newTabs = openTabs.filter(tab => tab.id !== tabId)
    setOpenTabs(newTabs)
    
    if (activeTab === tabId) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
    }
  }

  const saveFile = async (tabId: string) => {
    const tab = openTabs.find(t => t.id === tabId)
    if (!tab) return

    try {
      await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: tab.path,
          content: tab.content
        })
      })

      setOpenTabs(openTabs.map(t => 
        t.id === tabId ? { ...t, modified: false } : t
      ))
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }

  const updateTabContent = (tabId: string, content: string) => {
    setOpenTabs(openTabs.map(tab => 
      tab.id === tabId ? { ...tab, content, modified: true } : tab
    ))
  }

  const createTerminal = (shell: 'bash' | 'zsh' | 'fish' = 'bash') => {
    const newTerminal: TerminalSession = {
      id: `terminal-${Date.now()}`,
      title: `Terminal ${terminals.length + 1}`,
      shell,
      active: true
    }
    setTerminals([...terminals, newTerminal])
    setActiveTerminal(newTerminal.id)
    setShowTerminal(true)
  }

  const closeTerminal = (terminalId: string) => {
    const newTerminals = terminals.filter(t => t.id !== terminalId)
    setTerminals(newTerminals)
    
    if (activeTerminal === terminalId) {
      setActiveTerminal(newTerminals.length > 0 ? newTerminals[0].id : null)
    }
  }

  return (
    <div className="app">
      <Toolbar 
        onNewFile={() => {}}
        onSave={() => activeTab && saveFile(activeTab)}
        onSearch={() => setShowSearch(!showSearch)}
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
        onSplitView={(mode) => setSplitView(mode)}
        splitView={splitView}
        editorConfig={editorConfig}
        onConfigChange={setEditorConfig}
      />
      
      <div className="main-container">
        <FileExplorer 
          files={files}
          onFileClick={openFile}
          onRefresh={loadWorkspace}
        />
        
        <div className="editor-container">
          {showSearch && (
            <SearchPanel 
              onClose={() => setShowSearch(false)}
              onResultClick={openFile}
            />
          )}
          
          <EditorPane
            tabs={openTabs}
            activeTab={activeTab}
            onTabClick={setActiveTab}
            onTabClose={closeTab}
            onContentChange={updateTabContent}
            onSave={saveFile}
            config={editorConfig}
            splitView={splitView}
          />
          
          {showTerminal && (
            <Terminal
              terminals={terminals}
              activeTerminal={activeTerminal}
              onTerminalClick={setActiveTerminal}
              onTerminalClose={closeTerminal}
              onNewTerminal={createTerminal}
            />
          )}
        </div>
      </div>
      
      <StatusBar 
        activeFile={openTabs.find(t => t.id === activeTab)?.path}
        cursorPosition={openTabs.find(t => t.id === activeTab)?.cursorPosition}
        language={openTabs.find(t => t.id === activeTab)?.language}
      />
    </div>
  )
}

export default App
