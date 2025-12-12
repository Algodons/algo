import './Toolbar.css'
import { EditorConfig } from '../types'

interface ToolbarProps {
  onNewFile: () => void
  onSave: () => void
  onSearch: () => void
  onToggleTerminal: () => void
  onSplitView: (mode: 'single' | 'horizontal' | 'vertical' | 'grid') => void
  splitView: string
  editorConfig: EditorConfig
  onConfigChange: (config: EditorConfig) => void
}

const Toolbar = ({
  onNewFile,
  onSave,
  onSearch,
  onToggleTerminal,
  onSplitView,
  splitView,
  editorConfig,
  onConfigChange
}: ToolbarProps) => {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button onClick={onNewFile} title="New File">
          📄 New
        </button>
        <button onClick={onSave} title="Save (Ctrl+S)">
          💾 Save
        </button>
      </div>

      <div className="toolbar-section">
        <button onClick={onSearch} title="Search in Files">
          🔍 Search
        </button>
      </div>

      <div className="toolbar-section">
        <select 
          value={splitView} 
          onChange={(e) => onSplitView(e.target.value as any)}
          title="Split View"
        >
          <option value="single">Single View</option>
          <option value="horizontal">Split Horizontal</option>
          <option value="vertical">Split Vertical</option>
          <option value="grid">Grid (4 panes)</option>
        </select>
      </div>

      <div className="toolbar-section">
        <button onClick={onToggleTerminal} title="Toggle Terminal">
          💻 Terminal
        </button>
      </div>

      <div className="toolbar-section settings">
        <select
          value={editorConfig.theme}
          onChange={(e) => onConfigChange({ ...editorConfig, theme: e.target.value as any })}
          title="Theme"
        >
          <option value="vs-dark">Dark</option>
          <option value="vs-light">Light</option>
          <option value="hc-black">High Contrast</option>
        </select>

        <select
          value={editorConfig.keyBindings}
          onChange={(e) => onConfigChange({ ...editorConfig, keyBindings: e.target.value as any })}
          title="Key Bindings"
        >
          <option value="default">Default</option>
          <option value="vim">Vim</option>
          <option value="emacs">Emacs</option>
        </select>

        <label title="Font Size">
          <span>Font:</span>
          <input
            type="number"
            min="8"
            max="24"
            value={editorConfig.fontSize}
            onChange={(e) => onConfigChange({ ...editorConfig, fontSize: parseInt(e.target.value) })}
          />
        </label>

        <label title="Toggle Minimap">
          <input
            type="checkbox"
            checked={editorConfig.minimap}
            onChange={(e) => onConfigChange({ ...editorConfig, minimap: e.target.checked })}
          />
          <span>Minimap</span>
        </label>

        <label title="Format on Save">
          <input
            type="checkbox"
            checked={editorConfig.formatOnSave}
            onChange={(e) => onConfigChange({ ...editorConfig, formatOnSave: e.target.checked })}
          />
          <span>Format on Save</span>
        </label>
      </div>
    </div>
  )
}

export default Toolbar
