import { WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { spawn } from 'node-pty'
import url from 'url'

interface TerminalProcess {
  ptyProcess: any
  shell: string
}

const terminals = new Map<string, TerminalProcess>()

export function setupTerminalServer(ws: WebSocket, req: IncomingMessage) {
  const query = url.parse(req.url || '', true).query
  const terminalId = query.id as string
  const shell = (query.shell as string) || 'bash'

  if (!terminalId) {
    ws.close(1008, 'Terminal ID required')
    return
  }

  try {
    // Check if shell exists, fallback to bash
    const availableShells = ['bash', 'zsh', 'fish', 'sh']
    const selectedShell = availableShells.includes(shell) ? shell : 'bash'

    // Create PTY process
    const ptyProcess = spawn(selectedShell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.env.WORKSPACE_DIR || process.cwd(),
      env: process.env as any
    })

    terminals.set(terminalId, { ptyProcess, shell: selectedShell })

    // Send terminal output to WebSocket
    ptyProcess.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })

    ptyProcess.onExit(({ exitCode, signal }: any) => {
      console.log(`Terminal ${terminalId} exited with code ${exitCode}`)
      terminals.delete(terminalId)
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    })

    // Handle WebSocket messages (terminal input)
    ws.on('message', (data: Buffer) => {
      try {
        const message = data.toString()
        
        // Check if it's a resize command
        try {
          const parsed = JSON.parse(message)
          if (parsed.type === 'resize') {
            ptyProcess.resize(parsed.cols, parsed.rows)
            return
          }
        } catch {
          // Not JSON, treat as regular input
        }

        ptyProcess.write(message)
      } catch (error) {
        console.error('Error writing to terminal:', error)
      }
    })

    // Handle WebSocket close
    ws.on('close', () => {
      const terminal = terminals.get(terminalId)
      if (terminal) {
        terminal.ptyProcess.kill()
        terminals.delete(terminalId)
      }
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

  } catch (error) {
    console.error('Error creating terminal:', error)
    ws.close(1011, 'Failed to create terminal')
  }
}
