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

// Allow only trusted origins for CORS
const allowedOrigins = [
  'http://localhost:3000', // Add your frontend dev URL here
  // Add more trusted origins as needed
];
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  }
}));
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
