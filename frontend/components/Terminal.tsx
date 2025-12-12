'use client'

import { useEffect, useRef } from 'react'

const Terminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    // Dynamically import xterm to avoid SSR issues
    const loadTerminal = async () => {
      const { Terminal: XTerm } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')

      // Initialize terminal
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
        },
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      
      if (terminalRef.current) {
        term.open(terminalRef.current)
        fitAddon.fit()

        // Welcome message
        term.writeln('Welcome to Algo IDE Terminal')
        term.writeln('$ ')

        // Handle user input
        let currentLine = ''
        term.onData((data) => {
          const code = data.charCodeAt(0)
          
          if (code === 13) { // Enter
            term.writeln('')
            if (currentLine.trim()) {
              term.writeln(`Command not implemented: ${currentLine}`)
            }
            term.write('$ ')
            currentLine = ''
          } else if (code === 127) { // Backspace
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1)
              term.write('\b \b')
            }
          } else if (code >= 32) { // Printable characters
            currentLine += data
            term.write(data)
          }
        })

        xtermRef.current = term
        fitAddonRef.current = fitAddon

        // Handle window resize
        const handleResize = () => {
          fitAddon.fit()
        }
        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
          term.dispose()
        }
      }
    }

    loadTerminal()
  }, [])

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <span className="text-gray-300 text-sm">Terminal</span>
      </div>
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  )
}

export default Terminal
