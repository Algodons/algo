# Algo Code Editor

A full-featured browser-based code editor built with modern web technologies.

## Features

### Editor Capabilities
- ✅ **Syntax highlighting** for 50+ languages (powered by Monaco Editor)
- ✅ **Intelligent code completion** using Language Server Protocol (LSP)
- ✅ **Multi-cursor editing** for efficient code manipulation
- ✅ **Vim/Emacs keybindings** support
- ✅ **Integrated debugging** with breakpoints (Node.js, Python, Go)
- ✅ **Code formatting** with auto-integration (Prettier, Black, gofmt)
- ✅ **Find/replace with regex** support across entire project
- ✅ **Split view editing** (up to 4 panes)
- ✅ **Minimap navigation** for quick code overview
- ✅ **Git diff visualization** inline
- ✅ **Snippet library** with custom user snippets

### File Management
- ✅ **Drag-and-drop** file/folder organization
- ✅ **Search across all files** (ripgrep implementation)
- ✅ **File templates** for common frameworks
- ✅ **Binary file preview** (images, PDFs, videos)
- ✅ **Large file handling** with lazy loading (>10MB)

### Terminal Integration
- ✅ **Multiple terminal tabs**
- ✅ **Shell selection** (bash, zsh, fish)
- ✅ **Command history persistence**
- ✅ **Terminal sharing** for collaboration
- ✅ **SSH key management** interface

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Editor**: Monaco Editor (VS Code's editor)
- **Terminal**: xterm.js
- **Build Tool**: Vite
- **Backend**: Node.js + Express
- **WebSocket**: ws (for terminal and collaboration)
- **Collaboration**: Yjs for real-time editing
- **Search**: ripgrep for fast file searching

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- ripgrep (optional, for file search functionality)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Algodons/algo.git
cd algo
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Opening Files
- Click on files in the left sidebar file explorer
- Files will open in tabs at the top of the editor

### Editing Code
- **Save**: `Ctrl/Cmd + S`
- **Find**: `Ctrl/Cmd + F`
- **Find in files**: `Ctrl/Cmd + Shift + F`
- **Quick open**: `Ctrl/Cmd + P`
- **Toggle terminal**: `Ctrl/Cmd + \``

### Split View
- Use the toolbar dropdown to select split view mode:
  - Single View
  - Split Horizontal
  - Split Vertical
  - Grid (4 panes)

### Terminal
- Click "Terminal" button in the toolbar
- Create new terminals with different shells
- Multiple terminal tabs supported
- Full terminal functionality with command history

### Search
- Click the "Search" button in the toolbar
- Enter search query
- Toggle regex and case-sensitive options
- Click on results to jump to files

## Configuration

### Editor Settings
The editor supports various configuration options accessible from the toolbar:
- **Theme**: Dark, Light, High Contrast
- **Key Bindings**: Default, Vim, Emacs
- **Font Size**: Adjustable (8-24px)
- **Minimap**: Toggle on/off
- **Format on Save**: Enable/disable automatic formatting

### Environment Variables
- `PORT`: Server port (default: 3001)
- `WORKSPACE_DIR`: Workspace directory path (default: ./workspace)

## Project Structure

```
algo/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   │   ├── EditorPane.tsx  # Monaco editor wrapper
│   │   ├── Terminal.tsx    # Terminal component
│   │   ├── FileExplorer.tsx # File tree component
│   │   ├── Toolbar.tsx     # Top toolbar
│   │   ├── StatusBar.tsx   # Bottom status bar
│   │   └── SearchPanel.tsx # Search interface
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── server/                # Backend server code
│   ├── index.ts          # Main server file
│   ├── file-routes.ts    # File system API routes
│   ├── terminal-server.ts # Terminal WebSocket handler
│   ├── yjs-server.ts     # Collaborative editing server
│   └── search-routes.ts  # Search API routes
├── workspace/            # Default workspace directory
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
└── README.md            # This file
```

## Architecture

### Frontend Architecture
- **React Components**: Modular component structure
- **Monaco Editor**: Industry-standard code editor from VS Code
- **WebSocket Communication**: Real-time terminal and collaboration
- **State Management**: React hooks for local state

### Backend Architecture
- **Express Server**: RESTful API for file operations
- **WebSocket Server**: Real-time communication for terminals
- **Node-pty**: Pseudo-terminal for shell integration
- **File System API**: Secure file operations with path validation

### Communication Flow
```
Browser (React App)
    ↓
Vite Dev Server (Proxy)
    ↓
Express Server (API Routes)
    ↓
WebSocket Server (Terminal/Yjs)
    ↓
File System / PTY Processes
```

## Supported Languages

Monaco Editor provides syntax highlighting and IntelliSense for 50+ languages including:

- JavaScript, TypeScript, JSX, TSX
- Python, Java, C, C++, C#
- Go, Rust, Ruby, PHP, Swift
- HTML, CSS, SCSS, Less
- JSON, XML, YAML, TOML
- Markdown, SQL, Shell scripts
- And many more...

## Development

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Running in Production

```bash
npm run preview
```

## Features in Detail

### Multi-Cursor Editing
- Hold `Alt` (or `Option` on Mac) and click to add cursors
- `Ctrl/Cmd + Alt + ↑/↓` to add cursors above/below
- `Ctrl/Cmd + D` to select next occurrence

### Code Formatting
- Automatic formatting on save (when enabled)
- Supports language-specific formatters
- Configurable format options

### Debugging Support
- Set breakpoints by clicking on line numbers
- Debug panel for variables and call stack
- Supports Node.js, Python, and Go debugging

### Git Integration
- Inline diff visualization
- View changes in the editor
- Color-coded additions and deletions

### Collaborative Editing
- Real-time collaboration via Yjs
- See other users' cursors and selections
- Conflict-free concurrent editing

## Troubleshooting

### Terminal Not Working
- Ensure `node-pty` is properly installed
- Check that the shell (bash/zsh/fish) is available on your system
- Verify WebSocket connection in browser console

### File Search Not Working
- Install ripgrep: `brew install ripgrep` (Mac) or `apt install ripgrep` (Linux)
- Verify ripgrep is in your PATH

### Editor Performance Issues
- Disable minimap for large files
- Reduce the number of open tabs
- Check browser console for errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Monaco Editor - Microsoft
- xterm.js - xtermjs.org
- React - Meta
- Vite - Evan You and contributors
