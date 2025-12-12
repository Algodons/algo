import { WebSocket } from 'ws'
import { IncomingMessage } from 'http'

// Simple Yjs collaborative editing server
// This is a basic implementation - for production, use y-websocket package

const docs = new Map<string, any>()
const connections = new Map<string, Set<WebSocket>>()

export function setupYjsServer(ws: WebSocket, req: IncomingMessage) {
  const docName = new URL(req.url || '', 'http://localhost').searchParams.get('doc') || 'default'

  if (!connections.has(docName)) {
    connections.set(docName, new Set())
  }

  const docConnections = connections.get(docName)!
  docConnections.add(ws)

  // Broadcast messages to all clients connected to the same document
  ws.on('message', (data: Buffer) => {
    docConnections.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  })

  ws.on('close', () => {
    docConnections.delete(ws)
    if (docConnections.size === 0) {
      connections.delete(docName)
    }
  })

  ws.on('error', (error) => {
    console.error('Yjs WebSocket error:', error)
  })
}
