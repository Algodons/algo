import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import { IPty } from 'node-pty';

interface TerminalSession {
  pty: IPty;
  ws: WebSocket;
}

const terminals = new Map<string, TerminalSession>();

export function setupTerminalServer(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    
    if (url.pathname === '/terminal') {
      const terminalId = url.searchParams.get('id') || generateId();
      
      // Create new terminal session
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME || process.cwd(),
        env: process.env as { [key: string]: string }
      });

      terminals.set(terminalId, { pty: ptyProcess, ws });

      // Send data from terminal to client
      ptyProcess.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'data', data }));
        }
      });

      // Handle exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        ws.send(JSON.stringify({ type: 'exit', exitCode, signal }));
        terminals.delete(terminalId);
        ws.close();
      });

      // Receive data from client
      ws.on('message', (message: string) => {
        try {
          const msg = JSON.parse(message);
          
          if (msg.type === 'input') {
            ptyProcess.write(msg.data);
          } else if (msg.type === 'resize') {
            ptyProcess.resize(msg.cols, msg.rows);
          }
        } catch (error) {
          console.error('Terminal message error:', error);
        }
      });

      ws.on('close', () => {
        ptyProcess.kill();
        terminals.delete(terminalId);
        console.log(`🔌 Terminal session closed: ${terminalId}`);
      });

      ws.send(JSON.stringify({ type: 'ready', terminalId }));
      console.log(`💻 Terminal session started: ${terminalId}`);
    }
  });
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getTerminal(id: string): TerminalSession | undefined {
  return terminals.get(id);
}

export function killTerminal(id: string): boolean {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.pty.kill();
    terminals.delete(id);
    return true;
  }
  return false;
}
