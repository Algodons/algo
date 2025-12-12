'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import { getSocket } from '@/lib/socket';

interface EditorTerminalProps {
  projectId: string;
}

export function EditorTerminal({ projectId }: EditorTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize terminal
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;

    // Connect to WebSocket for terminal I/O
    const socket = getSocket();
    
    socket.on('connect', () => {
      socket.emit('terminal:connect', { projectId });
      terminal.writeln('Connected to terminal...');
    });

    socket.on('terminal:data', (data: string) => {
      terminal.write(data);
    });

    terminal.onData((data) => {
      socket.emit('terminal:input', { projectId, data });
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      terminal.dispose();
      window.removeEventListener('resize', handleResize);
      socket.off('terminal:data');
      socket.off('connect');
    };
  }, [projectId]);

  return <div ref={terminalRef} className="h-full w-full p-2" />;
}
