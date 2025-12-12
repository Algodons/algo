import { useRef } from 'react'
import Editor from '@monaco-editor/react'
import './EditorPane.css'
import { EditorTab, EditorConfig } from '../types'

interface EditorPaneProps {
  tabs: EditorTab[]
  activeTab: string | null
  onTabClick: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onContentChange: (tabId: string, content: string) => void
  onSave: (tabId: string) => void
  config: EditorConfig
  splitView: 'single' | 'horizontal' | 'vertical' | 'grid'
}

const EditorPane = ({
  tabs,
  activeTab,
  onTabClick,
  onTabClose,
  onContentChange,
  onSave,
  config,
  splitView
}: EditorPaneProps) => {
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor

    // Configure vim/emacs keybindings if needed
    if (config.keyBindings === 'vim') {
      // Monaco doesn't have built-in vim mode, would need a plugin
      console.log('Vim keybindings requested')
    } else if (config.keyBindings === 'emacs') {
      console.log('Emacs keybindings requested')
    }

    // Add save command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeTab) {
        onSave(activeTab)
      }
    })

    // Track cursor position
    // Note: Direct mutation is intentional here for performance - cursor position
    // is transient UI state that updates frequently and doesn't need re-renders
    editor.onDidChangeCursorPosition((e: any) => {
      const tab = tabs.find(t => t.id === activeTab)
      if (tab) {
        tab.cursorPosition = {
          lineNumber: e.position.lineNumber,
          column: e.position.column
        }
      }
    })
  }

  const activeTabData = tabs.find(t => t.id === activeTab)

  const editorOptions = {
    fontSize: config.fontSize,
    tabSize: config.tabSize,
    insertSpaces: config.insertSpaces,
    wordWrap: config.wordWrap,
    minimap: { enabled: config.minimap },
    lineNumbers: config.lineNumbers,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderWhitespace: 'selection' as const,
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    formatOnPaste: true,
    formatOnType: true,
    multiCursorModifier: 'ctrlCmd' as const,
    snippetSuggestions: 'top' as const,
    suggest: {
      showWords: true,
      showSnippets: true
    }
  }

  return (
    <div className="editor-pane">
      <div className="tabs-bar">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTab ? 'active' : ''} ${tab.modified ? 'modified' : ''}`}
            onClick={() => onTabClick(tab.id)}
          >
            <span className="tab-name">{tab.name}</span>
            {tab.modified && <span className="modified-indicator">●</span>}
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(tab.id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className={`editor-content ${splitView}`}>
        {activeTabData ? (
          <Editor
            height="100%"
            language={activeTabData.language}
            value={activeTabData.content}
            theme={config.theme}
            options={editorOptions}
            onChange={(value) => {
              if (value !== undefined && activeTab) {
                onContentChange(activeTab, value)
              }
            }}
            onMount={handleEditorDidMount}
          />
        ) : (
          <div className="no-file-open">
            <div className="welcome-message">
              <h2>Welcome to Algo Code Editor</h2>
              <p>Open a file from the explorer to start editing</p>
              <div className="shortcuts">
                <h3>Keyboard Shortcuts:</h3>
                <ul>
                  <li><kbd>Ctrl/Cmd + S</kbd> - Save file</li>
                  <li><kbd>Ctrl/Cmd + F</kbd> - Find in file</li>
                  <li><kbd>Ctrl/Cmd + Shift + F</kbd> - Find in files</li>
                  <li><kbd>Ctrl/Cmd + P</kbd> - Quick open</li>
                  <li><kbd>Ctrl/Cmd + `</kbd> - Toggle terminal</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorPane
