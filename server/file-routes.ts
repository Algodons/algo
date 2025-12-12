import { Express } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Default workspace directory
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(__dirname, '..', 'workspace')

export function setupFileRoutes(app: Express) {
  // Ensure workspace directory exists
  fs.mkdir(WORKSPACE_DIR, { recursive: true }).catch(console.error)

  // Get file tree
  app.get('/api/files', async (req, res) => {
    try {
      const files = await buildFileTree(WORKSPACE_DIR)
      res.json(files)
    } catch (error) {
      console.error('Error reading files:', error)
      res.status(500).json({ error: 'Failed to read files' })
    }
  })

  // Get file content
  app.get('/api/files/content', async (req, res) => {
    try {
      const filePath = req.query.path as string
      if (!filePath) {
        return res.status(400).json({ error: 'Path required' })
      }

      const fullPath = path.join(WORKSPACE_DIR, filePath)
      
      // Security check: prevent path traversal
      if (!fullPath.startsWith(WORKSPACE_DIR)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      const content = await fs.readFile(fullPath, 'utf-8')
      res.json({ content, path: filePath })
    } catch (error) {
      console.error('Error reading file:', error)
      res.status(500).json({ error: 'Failed to read file' })
    }
  })

  // Save file
  app.post('/api/files/save', async (req, res) => {
    try {
      const { path: filePath, content } = req.body
      if (!filePath) {
        return res.status(400).json({ error: 'Path required' })
      }

      const fullPath = path.join(WORKSPACE_DIR, filePath)
      
      // Security check: prevent path traversal
      if (!fullPath.startsWith(WORKSPACE_DIR)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      
      await fs.writeFile(fullPath, content, 'utf-8')
      res.json({ success: true })
    } catch (error) {
      console.error('Error saving file:', error)
      res.status(500).json({ error: 'Failed to save file' })
    }
  })

  // Create file
  app.post('/api/files/create', async (req, res) => {
    try {
      const { path: filePath, type } = req.body
      if (!filePath) {
        return res.status(400).json({ error: 'Path required' })
      }

      const fullPath = path.join(WORKSPACE_DIR, filePath)
      
      // Security check
      if (!fullPath.startsWith(WORKSPACE_DIR)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      if (type === 'directory') {
        await fs.mkdir(fullPath, { recursive: true })
      } else {
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, '', 'utf-8')
      }

      res.json({ success: true })
    } catch (error) {
      console.error('Error creating file:', error)
      res.status(500).json({ error: 'Failed to create file' })
    }
  })

  // Delete file
  app.delete('/api/files/delete', async (req, res) => {
    try {
      const filePath = req.query.path as string
      if (!filePath) {
        return res.status(400).json({ error: 'Path required' })
      }

      const fullPath = path.join(WORKSPACE_DIR, filePath)
      
      // Security check
      if (!fullPath.startsWith(WORKSPACE_DIR)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      const stats = await fs.stat(fullPath)
      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true })
      } else {
        await fs.unlink(fullPath)
      }

      res.json({ success: true })
    } catch (error) {
      console.error('Error deleting file:', error)
      res.status(500).json({ error: 'Failed to delete file' })
    }
  })
}

async function buildFileTree(dir: string, basePath: string = ''): Promise<any[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(
      entries
        .filter(entry => !entry.name.startsWith('.'))
        .map(async (entry) => {
          const filePath = path.join(dir, entry.name)
          const relativePath = path.join(basePath, entry.name)
          const stats = await fs.stat(filePath)

          if (entry.isDirectory()) {
            const children = await buildFileTree(filePath, relativePath)
            return {
              id: relativePath,
              name: entry.name,
              type: 'directory',
              path: relativePath,
              children: children.sort((a, b) => {
                // Directories first, then alphabetically
                if (a.type !== b.type) {
                  return a.type === 'directory' ? -1 : 1
                }
                return a.name.localeCompare(b.name)
              })
            }
          } else {
            return {
              id: relativePath,
              name: entry.name,
              type: 'file',
              path: relativePath,
              size: stats.size,
              modified: stats.mtime
            }
          }
        })
    )

    return files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    console.error('Error building file tree:', error)
    return []
  }
}
