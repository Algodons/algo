import { useState } from 'react'
import './SearchPanel.css'
import { SearchResult } from '../types'

interface SearchPanelProps {
  onClose: () => void
  onResultClick: (path: string) => void
}

const SearchPanel = ({ onClose, onResultClick }: SearchPanelProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)

  const handleSearch = async () => {
    if (!query) return

    setSearching(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          regex: useRegex,
          caseSensitive
        })
      })
      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="search-panel">
      <div className="search-header">
        <h3>Search in Files</h3>
        <button onClick={onClose} className="close-button">×</button>
      </div>

      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="search-input"
        />
        <button onClick={handleSearch} disabled={searching} className="search-button">
          {searching ? '⏳' : '🔍'} Search
        </button>
      </div>

      <div className="search-options">
        <label>
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          Match Case
        </label>
        <label>
          <input
            type="checkbox"
            checked={useRegex}
            onChange={(e) => setUseRegex(e.target.checked)}
          />
          Use Regex
        </label>
      </div>

      <div className="search-results">
        {results.length === 0 && !searching && query && (
          <div className="no-results">No results found</div>
        )}
        {results.map((result, index) => (
          <div
            key={index}
            className="search-result-item"
            onClick={() => onResultClick(result.file)}
          >
            <div className="result-file">{result.file}</div>
            <div className="result-location">
              Line {result.line}, Column {result.column}
            </div>
            <div className="result-match">{result.context}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SearchPanel
