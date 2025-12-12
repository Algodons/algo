# Algo - Cloud IDE Platform

A modern cloud-based IDE platform built with Next.js 14, TypeScript, and Express.

## Features

- **Modern Frontend**: Next.js 14 with App Router and TypeScript
- **Code Editor**: Monaco Editor integration for a VSCode-like experience
- **Terminal**: Integrated terminal using xterm.js
- **File Explorer**: Sidebar with file tree navigation
- **Real-time Communication**: WebSocket support via Socket.IO
- **Containerized**: Docker and Docker Compose setup for easy deployment

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Monaco Editor
- xterm.js
- Socket.IO Client

### Backend
- Express.js
- TypeScript
- Socket.IO
- CORS support

## Project Structure

```
algo/
├── frontend/                # Next.js frontend application
│   ├── app/                # App router pages
│   ├── components/         # React components
│   │   ├── Sidebar.tsx    # File explorer sidebar
│   │   ├── Editor.tsx     # Monaco code editor
│   │   └── Terminal.tsx   # xterm.js terminal
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── backend/                # Express backend server
│   ├── src/
│   │   └── index.ts       # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml      # Docker orchestration
└── package.json           # Workspace root
```

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or yarn
- Docker (optional, for containerized deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Algodons/algo.git
cd algo
```

2. Install dependencies:
```bash
npm install
```

### Development

Run both frontend and backend in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
# Frontend (runs on http://localhost:3000)
npm run dev --workspace=frontend

# Backend (runs on http://localhost:4000)
npm run dev --workspace=backend
```

### Building

Build both frontend and backend:

```bash
npm run build
```

### Production

Start production servers:

```bash
npm start
```

### Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up --build
```

Access the application at http://localhost:3000

## API Endpoints

### REST API

- `GET /health` - Health check endpoint
- `GET /api/files` - List files
- `GET /api/file/:path` - Get file content

### WebSocket Events

#### Client to Server
- `terminal:input` - Send terminal commands
- `file:save` - Save file content
- `editor:change` - Broadcast editor changes

#### Server to Client
- `terminal:output` - Receive terminal output
- `file:saved` - File save confirmation
- `editor:change` - Receive editor changes from other clients

## Configuration

### Frontend Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## Future Enhancements

- Real-time collaboration
- Git integration
- Multiple language support
- File system operations
- User authentication
- Workspace persistence
- Code completion and IntelliSense
- Debugging capabilities
- Theme customization

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.