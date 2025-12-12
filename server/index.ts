import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupFileRoutes } from './file-routes.js'
import { setupTerminalServer } from './terminal-server.js'
import { setupYjsServer } from './yjs-server.js'
import { setupSearchRoutes } from './search-routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Middleware
app.use(cors())
app.use(express.json())

// API Routes
setupFileRoutes(app)
setupSearchRoutes(app)

// WebSocket routing
wss.on('connection', (ws, req) => {
  const url = req.url || ''
  
  if (url.startsWith('/terminal')) {
    setupTerminalServer(ws, req)
  } else if (url.startsWith('/yjs')) {
    setupYjsServer(ws, req)
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export { app, server, wss }
