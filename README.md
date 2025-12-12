# Cloud IDE - Production-Grade Development Platform

A production-grade cloud IDE and deployment platform similar to Replit, built with modern web technologies.

## 🚀 Features

### 1. **Real-time Collaborative Editing**
- Built with Yjs and CRDT protocol for seamless multi-user editing
- Live cursor tracking and presence awareness
- CodeMirror-based editor with syntax highlighting for multiple languages

### 2. **Integrated Terminal**
- Full-featured terminal with WebSocket connection
- Supports bash/powershell based on platform
- Real-time terminal I/O with xterm.js

### 3. **Git Integration**
- Clone repositories
- Commit, push, and pull operations
- Branch management (create, checkout, list)
- View git status, diff, and logs
- Full git workflow support

### 4. **Package Manager Integration**
- **npm** - Node.js package management
- **pip** - Python package management
- **cargo** - Rust package management
- Install, uninstall, and list packages
- Auto-detection of package managers

### 5. **Hot Reload & Live Preview**
- Iframe sandboxing for secure preview
- File watching with chokidar
- Automatic refresh on file changes
- Real-time preview of web applications

### 6. **Database GUI**
- **PostgreSQL** - Full query support and table browsing
- **MySQL** - Connection management and query execution
- **MongoDB** - Collection operations and document queries
- Visual database management interface

### 7. **Admin Control System** 🆕
- **User Management** - Advanced search, suspension/activation, analytics, impersonation mode
- **Platform Analytics** - Real-time metrics, revenue tracking (MRR/ARR), churn analysis
- **Sales & Affiliates** - Affiliate program management, discount codes, commission tracking
- **Financial Controls** - Revenue reconciliation, subscription management, refund processing
- **System Administration** - Server health monitoring, deployment queue, feature flags
- **Security Features** - Role-based access control (RBAC), 2FA, audit logging, IP whitelisting

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **CodeMirror** - Code editor
- **Yjs** - CRDT for collaboration
- **xterm.js** - Terminal emulator
- **Zustand** - State management

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **WebSocket (ws)** - Real-time communication
- **node-pty** - Terminal sessions
- **simple-git** - Git operations
- **chokidar** - File watching
- **pg, mysql2, mongodb** - Database clients

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/Algodons/algo.git
cd algo
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development server**
```bash
npm run dev
```

This will start:
- Frontend dev server on http://localhost:3000
- Backend API server on http://localhost:5000

### Production Build

```bash
npm run build
npm start
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

This will start:
- Cloud IDE application
- PostgreSQL database
- MySQL database
- MongoDB database

### Using Docker

```bash
docker build -t cloud-ide .
docker run -p 3000:3000 -p 5000:5000 cloud-ide
```

## 📖 Usage

### Collaborative Editing
1. Open the IDE in multiple browser windows
2. Select the same file
3. Start typing - changes sync in real-time
4. See other users' cursors and selections

### Terminal
- Click on the terminal panel at the bottom
- Type commands directly
- Terminal persists during the session

### Git Operations
1. Enter a repository URL in the Git panel
2. Click "Clone Repository"
3. Make changes to files
4. Commit changes with a message
5. Push to remote repository

### Package Management
1. Select package manager (npm/pip/cargo)
2. Enter package name
3. Click "Install"
4. Packages are installed in the workspace

### Live Preview
1. Create an HTML file (e.g., index.html)
2. Preview panel automatically shows the page
3. Edit files - preview updates automatically

### Database Management
1. Select database type (PostgreSQL/MySQL/MongoDB)
2. Enter connection details
3. Click "Connect"
4. Execute queries and view results

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  │
│  │ Editor  │  │Terminal │  │   Git   │  │ Database │  │
│  └─────────┘  └─────────┘  └─────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                     WebSocket/HTTP
                          │
┌─────────────────────────────────────────────────────────┐
│                  Backend (Node.js/Express)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   Yjs    │  │  PTY     │  │   Git    │             │
│  │  Server  │  │  Server  │  │   API    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Package  │  │ Preview  │  │ Database │             │
│  │   API    │  │  Server  │  │   API    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                          │
                    File System
```

## 🔒 Security Features

- **Iframe Sandboxing** - Preview runs in sandboxed iframe
- **WebSocket Authentication** - Secure WebSocket connections
- **Input Validation** - All inputs are validated
- **File System Isolation** - Workspaces are isolated
- **Database Connection Management** - Secure credential handling

## 🧪 Testing

```bash
npm test
```

## 📝 API Documentation

For detailed Admin Control System API documentation, see [ADMIN_API.md](./ADMIN_API.md)

### Git API
- `POST /api/git/clone` - Clone repository
- `GET /api/git/status` - Get git status
- `POST /api/git/commit` - Commit changes
- `POST /api/git/push` - Push changes
- `POST /api/git/pull` - Pull changes
- `GET /api/git/branches` - List branches
- `POST /api/git/branch` - Create branch
- `POST /api/git/checkout` - Checkout branch

### Package Manager API
- `POST /api/package/{manager}/install` - Install package
- `POST /api/package/{manager}/uninstall` - Uninstall package
- `GET /api/package/{manager}/list` - List packages

### Database API
- `POST /api/db/{type}/connect` - Connect to database
- `POST /api/db/{type}/query` - Execute query
- `GET /api/db/{type}/tables` - List tables/collections
- `POST /api/db/disconnect` - Disconnect

### Preview API
- `GET /api/preview/:workspaceId/*` - Serve preview files
- `POST /api/preview/watch` - Start watching files
- `POST /api/preview/unwatch` - Stop watching

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by Replit, CodeSandbox, and StackBlitz
- Built with amazing open-source tools
