import './StatusBar.css'

interface StatusBarProps {
  activeFile?: string
  cursorPosition?: {
    lineNumber: number
    column: number
  }
  language?: string
}

const StatusBar = ({ activeFile, cursorPosition, language }: StatusBarProps) => {
  return (
    <div className="status-bar">
      <div className="status-section">
        {activeFile && (
          <>
            <span className="status-item">
              📁 {activeFile}
            </span>
            <span className="status-separator">|</span>
          </>
        )}
        {language && (
          <>
            <span className="status-item">
              {language}
            </span>
            <span className="status-separator">|</span>
          </>
        )}
        {cursorPosition && (
          <span className="status-item">
            Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
          </span>
        )}
      </div>
      
      <div className="status-section right">
        <span className="status-item">
          ⚡ Algo Code Editor
        </span>
      </div>
    </div>
  )
}

export default StatusBar
