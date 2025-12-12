import { Express } from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const execAsync = promisify(exec)

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(__dirname, '..', 'workspace')

export function setupSearchRoutes(app: Express) {
  // Search files using ripgrep
  app.post('/api/search', async (req, res) => {
    try {
      const { query, regex, caseSensitive } = req.body

      if (!query) {
        return res.status(400).json({ error: 'Query required' })
      }

      // Build ripgrep command
      const flags = [
        '-n', // Line numbers
        '--json', // JSON output
      ]

      if (!caseSensitive) {
        flags.push('-i')
      }

      if (!regex) {
        flags.push('-F') // Fixed string search
      }

      const command = `rg ${flags.join(' ')} "${query.replace(/"/g, '\\"')}" "${WORKSPACE_DIR}"`

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        })

        // Parse ripgrep JSON output
        const results = stdout
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              const parsed = JSON.parse(line)
              if (parsed.type === 'match') {
                return {
                  file: parsed.data.path.text,
                  line: parsed.data.line_number,
                  column: parsed.data.submatches[0]?.start || 0,
                  match: parsed.data.submatches[0]?.match?.text || '',
                  context: parsed.data.lines.text.trim()
                }
              }
              return null
            } catch {
              return null
            }
          })
          .filter(r => r !== null)

        res.json({ results })
      } catch (error: any) {
        // ripgrep returns exit code 1 when no matches found
        if (error.code === 1) {
          res.json({ results: [] })
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      res.status(500).json({ error: 'Search failed' })
    }
  })

  // Find files by name
  app.post('/api/search/files', async (req, res) => {
    try {
      const { query } = req.body

      if (!query) {
        return res.status(400).json({ error: 'Query required' })
      }

      const command = `find "${WORKSPACE_DIR}" -type f -iname "*${query.replace(/"/g, '\\"')}*" -not -path "*/node_modules/*" -not -path "*/.git/*"`

      const { stdout } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024
      })

      const files = stdout
        .split('\n')
        .filter(f => f.trim())
        .map(f => f.replace(WORKSPACE_DIR + '/', ''))

      res.json({ files })
    } catch (error) {
      console.error('File search error:', error)
      res.status(500).json({ error: 'File search failed' })
    }
  })
}
