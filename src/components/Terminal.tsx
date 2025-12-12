import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import '@xterm/xterm/css/xterm.css'
import './Terminal.css'
import { TerminalSession } from '../types'

interface TerminalProps {
  terminals: TerminalSession[]
  activeTerminal: string | null
  onTerminalClick: (terminalId: string) => void
  onTerminalClose: (terminalId: string) => void
  onNewTerminal: (shell: 'bash' | 'zsh' | 'fish') => void
}

const Terminal = ({
  terminals,
  activeTerminal,
  onTerminalClick,
  onTerminalClose,
  onNewTerminal
}: TerminalProps) => {
  const terminalRefs = useRef<Map<string, XTerm>>(new Map())
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const socketRefs = useRef<Map<string, WebSocket>>(new Map())

  useEffect(() => {
    // Initialize terminals
    terminals.forEach(term => {
      if (!terminalRefs.current.has(term.id)) {
        initializeTerminal(term)
      }
    })

    // Cleanup removed terminals
    terminalRefs.current.forEach((xterm, id) => {
      if (!terminals.find(t => t.id === id)) {
        xterm.dispose()
        terminalRefs.current.delete(id)
        
        const socket = socketRefs.current.get(id)
        if (socket) {
          socket.close()
          socketRefs.current.delete(id)
        }
      }
    })
  }, [terminals])

  const initializeTerminal = (termSession: TerminalSession) => {
    const container = containerRefs.current.get(termSession.id)
    if (!container) return

    const xterm = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      fontFamily: '"Cascadia Code", "Fira Code", Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    const searchAddon = new SearchAddon()

    xterm.loadAddon(fitAddon)
    xterm.loadAddon(webLinksAddon)
    xterm.loadAddon(searchAddon)

    xterm.open(container)
    fitAddon.fit()

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/terminal?id=${termSession.id}&shell=${termSession.shell}`
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      xterm.writeln('Terminal connected...\r\n')
    }

    socket.onmessage = (event) => {
      xterm.write(event.data)
    }

    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      xterm.writeln('\r\n\x1b[31mTerminal connection error\x1b[0m\r\n')
    }

    socket.onclose = () => {
      xterm.writeln('\r\n\x1b[33mTerminal connection closed\x1b[0m\r\n')
    }

    xterm.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data)
      }
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows
        }))
      }
    })
    resizeObserver.observe(container)

    terminalRefs.current.set(termSession.id, xterm)
    socketRefs.current.set(termSession.id, socket)
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-tabs">
          {terminals.map(term => (
            <div
              key={term.id}
              className={`terminal-tab ${term.id === activeTerminal ? 'active' : ''}`}
              onClick={() => onTerminalClick(term.id)}
            >
              <span className="terminal-icon">$</span>
              <span className="terminal-title">{term.title}</span>
              <button
                className="terminal-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onTerminalClose(term.id)
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="terminal-actions">
          <button onClick={() => onNewTerminal('bash')} title="New Terminal (bash)">
            +
          </button>
          <select 
            onChange={(e) => onNewTerminal(e.target.value as 'bash' | 'zsh' | 'fish')}
            value=""
          >
            <option value="" disabled>Shell</option>
            <option value="bash">bash</option>
            <option value="zsh">zsh</option>
            <option value="fish">fish</option>
          </select>
        </div>
      </div>
      <div className="terminal-content">
        {terminals.map(term => (
          <div
            key={term.id}
            ref={(el) => {
              if (el) containerRefs.current.set(term.id, el)
            }}
            className={`terminal-container ${term.id === activeTerminal ? 'active' : ''}`}
          />
        ))}
        {terminals.length === 0 && (
          <div className="no-terminal">
            <p>No terminal sessions</p>
            <button onClick={() => onNewTerminal('bash')}>Create Terminal</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Terminal
