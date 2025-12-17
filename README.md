# Cloud IDE - Production-Grade Development Platform

A production-grade cloud IDE and deployment platform similar to Replit, built with modern web technologies.

## 🚀 Features

### 1. **Team Collaboration Suite** 🆕
- **Real-time Presence** - See who's online, what they're editing, and their cursor positions
- **Terminal Sharing** - Collaborate on terminal sessions with view-only or interactive modes
- **Code Comments** - Add line-specific comments and threaded discussions
- **Team Organizations** - Create organizations with role-based access (Owner, Admin, Developer, Viewer)
- **Project Permissions** - Granular control with read, write, deploy, and admin permissions
- **Activity Feed** - Track all team actions and changes in real-time
- **Environment Variables** - Securely manage encrypted secrets at org and project levels
- **Team Billing** - Track usage and costs per team member with detailed breakdowns

### 2. **Real-time Collaborative Editing**
- Built with Yjs and CRDT protocol for seamless multi-user editing
- Live cursor tracking and presence awareness
- CodeMirror-based editor with syntax highlighting for multiple languages

### 3. **Integrated Terminal**
- Full-featured terminal with WebSocket connection
- Supports bash/powershell based on platform
- Real-time terminal I/O with xterm.js
- Terminal sharing for collaborative debugging 🆕

### 4. **Advanced Version Control** 🆕
- **Pull Requests** - Create, review, and merge PRs directly in the IDE
- **Visual Merge Conflicts** - 3-way merge view with conflict-by-conflict resolution
- **Code Reviews** - Inline comments, approval workflows, and status tracking
- **Branch Protection** - Enforce PR requirements, approvals, and status checks
- Full git workflow support with commit, push, pull, and branch management

### 5. **Package Manager Integration**
- **npm** - Node.js package management
- **pip** - Python package management
- **cargo** - Rust package management
- Install, uninstall, and list packages
- Auto-detection of package managers

### 6. **Hot Reload & Live Preview**
- Iframe sandboxing for secure preview
- File watching with chokidar
- Automatic refresh on file changes
- Real-time preview of web applications

### 7. **Database GUI**
- **PostgreSQL** - Full query support and table browsing
- **MySQL** - Connection management and query execution
- **MongoDB** - Collection operations and document queries
- Visual database management interface

### 8. **Admin Control System** 🆕
- **User Management** - Advanced search, suspension/activation, analytics, impersonation mode
- **Platform Analytics** - Real-time metrics, revenue tracking (MRR/ARR), churn analysis
- **Sales & Affiliates** - Affiliate program management, discount codes, commission tracking
- **Financial Controls** - Revenue reconciliation, subscription management, refund processing
- **System Administration** - Server health monitoring, deployment queue, feature flags
- **Security Features** - Role-based access control (RBAC), 2FA, audit logging, IP whitelisting

### 9. **Intelligent Automation System** 🆕
- **Auto-Detection** - Automatically detect frameworks, build commands, ports, and dependencies
- **IaC Generation** - Generate Dockerfiles, Kubernetes manifests, Terraform configs, nginx configurations
- **Server Setup** - One-command server installation script with Docker, Node.js, Python, nginx, SSL
- **Project Templates** - 50+ pre-configured starter templates for React, Vue, Express, Django, and more
- **GitHub Import** - Clone and analyze existing repositories with auto-configuration
- **Environment Detection** - Automatic detection of environment variables and secrets

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
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

3. **Set up environment variables**
```bash
# For development
cp .env.example .env.development
# Edit .env.development with your configuration
```

4. **Start development server**
```bash
npm run dev:local
```

This will start:
- Frontend dev server on http://localhost:3000
- Backend API server on http://localhost:4000

> **📖 For detailed development setup including Copilot SaaS testing, see [DEV_SETUP.md](./DEV_SETUP.md)**

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

## 📈 Scalability Architecture

The platform implements a comprehensive scalability strategy designed to handle growth efficiently:

### Multi-Layer Caching
- **L1 (Memory)**: 100MB in-memory LRU cache for hot data
- **L2 (Redis)**: Distributed caching for sessions and API responses
- **L3 (CDN)**: Cloudflare/Fastly for static assets
- **Query Caching**: Automatic database query result caching

### Intelligent Load Balancing
- **Round-robin distribution** across backend instances
- **Geographic routing** to nearest region
- **Health-based routing** with automatic failover
- **Sticky sessions** for connection persistence

### Auto-Scaling
- **CPU-based**: Scale at 70% (up) / 30% (down)
- **Memory-based**: Dynamic scaling based on usage
- **Request-based**: Scale with traffic patterns
- **Predictive scaling**: ML-based anticipation of load

### Resource Management
- **Container limits**: CPU and memory quotas per service
- **Spot instances**: 70% cost reduction for non-critical workloads
- **Quality of Service**: Priority-based resource allocation
- **Vertical Pod Autoscaler**: Automatic right-sizing

### Project Lifecycle
- **Idle suspension**: Automatic suspension after 30 days
- **Wake-on-request**: Fast cold-start (~30 seconds)
- **State preservation**: Full project state and data maintained
- **Activity tracking**: Automatic activity monitoring

**Documentation**:
- [Scalability Architecture](./SCALABILITY.md) - Complete architecture guide
- [Operations Runbooks](./SCALABILITY_RUNBOOKS.md) - Operational procedures

**Key Metrics**:
- Cache hit rate: >80%
- Auto-scaling range: 2-20 instances
- Cold start time: ~30 seconds
- Cost reduction: Up to 70% with spot instances

## 🧪 Testing

```bash
npm test
```

## 📝 API Documentation

### Comprehensive Documentation
- [Admin Control System API](./ADMIN_API.md)
- [Intelligent Automation System](./AUTOMATION_SYSTEM.md)
- [Automation System Examples](./AUTOMATION_EXAMPLES.md)
- [Database Platform](./DATABASE_PLATFORM.md)
- [Team Collaboration](./TEAM_COLLABORATION_API.md)
- [Monetization System](./MONETIZATION_SYSTEM.md)

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

### Automation API
- `POST /api/automation/detect` - Auto-detect project configuration
- `POST /api/automation/install` - Install project dependencies
- `POST /api/automation/generate-iac` - Generate infrastructure as code
- `GET /api/automation/templates` - List available templates
- `POST /api/automation/init-template` - Initialize from template
- `POST /api/automation/import-github` - Import from GitHub repository
- `POST /api/automation/setup` - Full project setup

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
