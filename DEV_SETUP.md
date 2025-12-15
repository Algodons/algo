# Development Environment Setup Guide

This guide will help you set up your local development environment for testing and developing the Algo Cloud IDE platform, including Copilot SaaS functionality.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Starting the Development Server](#starting-the-development-server)
5. [Copilot SaaS Testing](#copilot-saas-testing)
6. [API Endpoints](#api-endpoints)
7. [Development Features](#development-features)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** 9.x or higher (comes with Node.js)
- **PostgreSQL** 14+ (for database features)
- **Redis** 6+ (optional, for caching)
- **Docker** (optional, for containerized services)

## Quick Start

The fastest way to get started with the development environment:

```bash
# 1. Clone the repository
git clone https://github.com/Algodons/algo.git
cd algo

# 2. Set up environment variables
cp .env.example .env.development

# 3. Install dependencies for all packages
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# 4. Start the development servers (frontend + backend)
npm run dev:local
```

This will start:
- **Frontend** on http://localhost:3000 (Next.js)
- **Backend** on http://localhost:4000 (Express)

## Environment Configuration

### Development Environment Files

The project uses environment-specific configuration files:

- **`.env.development`** - Root development configuration
- **`frontend/.env.development`** - Frontend-specific dev config
- **`backend/.env.development`** - Backend-specific dev config

### Key Configuration Variables

#### API Endpoints

```bash
# Frontend (.env.development)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

#### Copilot SaaS Configuration

```bash
# Dev API endpoints for Copilot testing
COPILOT_API_URL=https://api-dev.copilot.example.com
COPILOT_API_KEY=your_dev_api_key
COPILOT_WORKSPACE_ID=dev_workspace
COPILOT_ENABLED=true

# Frontend Copilot config
NEXT_PUBLIC_COPILOT_API_URL=https://api-dev.copilot.example.com
NEXT_PUBLIC_COPILOT_ENABLED=true
```

> **Important:** Replace the placeholder API keys with your actual development credentials.

#### Database Configuration

For local development, you can use PostgreSQL:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=algo_ide_dev
DB_USER=algo_user
DB_PASSWORD=dev_password
```

### Environment Switching

The application automatically uses the appropriate environment file based on `NODE_ENV`:

- **Development:** Uses `.env.development` files
- **Production:** Uses `.env` or `.env.production` files

## Starting the Development Server

### Option 1: Start Both Frontend and Backend (Recommended)

```bash
# From the root directory
npm run dev:local
```

This uses `concurrently` to start both services simultaneously with hot-reload enabled.

### Option 2: Start Services Separately

Start the backend:
```bash
cd backend
npm run dev
```

In a new terminal, start the frontend:
```bash
cd frontend
npm run dev
```

### Option 3: Use the Legacy Dev Script

```bash
# From root directory
npm run dev
```

This starts the older server/client setup (if available).

## Copilot SaaS Testing

### Enable Copilot Features

1. **Set environment variables** in your `.env.development`:

```bash
COPILOT_ENABLED=true
COPILOT_API_URL=https://api-dev.copilot.example.com
COPILOT_API_KEY=your_dev_api_key
```

2. **Configure frontend** in `frontend/.env.development`:

```bash
NEXT_PUBLIC_COPILOT_ENABLED=true
NEXT_PUBLIC_COPILOT_API_URL=https://api-dev.copilot.example.com
```

### Testing Copilot Functionality

#### 1. AI Agent Testing

Access AI agents through the API:

```bash
# List available agents
curl http://localhost:4000/api/v1/ai/agents

# Invoke an agent
curl -X POST http://localhost:4000/api/v1/ai/agents/{agentId}/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Your input here",
    "context": {},
    "parameters": {}
  }'
```

#### 2. ML Model Testing

Test machine learning models:

```bash
# List available models
curl http://localhost:4000/api/v1/ai/models

# Make a prediction
curl -X POST http://localhost:4000/api/v1/ai/models/{modelId}/predict \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Your input data",
    "parameters": {}
  }'
```

### Debug Logging

Enable verbose logging for Copilot features:

```bash
# In .env.development
DEBUG=true
VERBOSE_LOGGING=true
LOG_LEVEL=debug
```

View logs in the console where you started the backend server.

## API Endpoints

### Development API Base URLs

- **Backend API:** http://localhost:4000
- **WebSocket:** ws://localhost:4000
- **Frontend:** http://localhost:3000

### Key Endpoints for Testing

#### AI/ML Endpoints
- `GET /api/v1/ai/agents` - List AI agents
- `POST /api/v1/ai/agents/:agentId/invoke` - Invoke AI agent
- `GET /api/v1/ai/models` - List ML models
- `POST /api/v1/ai/models/:modelId/predict` - ML prediction

#### Health Check
- `GET /health` - Server health status

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### API Documentation

For complete API documentation, see:
- [Admin API](./ADMIN_API.md)
- [Platform API v1](./PLATFORM_API_V1.md)
- [Automation System](./AUTOMATION_SYSTEM.md)

## Development Features

### Hot Reload

Both frontend and backend support hot-reload:

- **Frontend:** Next.js Fast Refresh automatically reloads on file changes
- **Backend:** `ts-node-dev` restarts the server on TypeScript file changes

### CORS Configuration

CORS is pre-configured for local development:

```javascript
// Backend automatically allows requests from
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
```

### Debug Mode

Debug mode provides additional logging and error details:

```bash
# Enable in .env.development
DEBUG=true
NEXT_PUBLIC_DEBUG_MODE=true
```

### Feature Flags

Toggle features during development:

```bash
ENABLE_COLLABORATION=true
ENABLE_GIT_INTEGRATION=true
ENABLE_MONITORING=true
NEXT_PUBLIC_AI_FEATURES_ENABLED=true
```

## Troubleshooting

### Common Issues

#### Port Already in Use

If ports 3000 or 4000 are already in use:

```bash
# Find and kill the process using the port
# On Linux/Mac:
lsof -ti:3000 | xargs kill -9
lsof -ti:4000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or configure different ports in your `.env.development`:

```bash
# Backend
PORT=4001

# Frontend - change in package.json
npm run dev -- -p 3001
```

#### Database Connection Errors

Ensure PostgreSQL is running:

```bash
# Start PostgreSQL
# On Linux/Mac with Homebrew:
brew services start postgresql

# On Linux with systemd:
sudo systemctl start postgresql

# On Windows:
# Start via Services or pg_ctl
```

Create the development database:

```bash
createdb algo_ide_dev
```

#### Module Not Found Errors

Clear node_modules and reinstall:

```bash
# Root directory
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors

Clear TypeScript cache and rebuild:

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run type-check
```

#### WebSocket Connection Issues

Check that:
1. Backend is running on port 4000
2. CORS is properly configured
3. WebSocket URL is correct in frontend config

```bash
# Test WebSocket connection
wscat -c ws://localhost:4000
```

### Getting Help

If you encounter issues:

1. Check the [main README](./README.md)
2. Review [Troubleshooting Guide](./TROUBLESHOOTING.md)
3. Check server logs for error messages
4. Enable debug logging (see above)

## Development Workflow

### Recommended Workflow

1. **Start Services:** Run `npm run dev:local` from root
2. **Make Changes:** Edit files in `frontend/` or `backend/`
3. **Test Changes:** Changes auto-reload in the browser/server
4. **Check Logs:** Monitor terminal output for errors
5. **Test APIs:** Use Postman, curl, or browser DevTools
6. **Commit:** Commit working changes regularly

### Testing Checklist

Before committing changes:

- [ ] Frontend starts without errors
- [ ] Backend starts without errors
- [ ] API endpoints respond correctly
- [ ] WebSocket connections work
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Copilot features work (if applicable)

## Environment Switching

### Switch to Production Mode

To test production build locally:

```bash
# Build for production
npm run build

# Start production server
npm start
```

Use `.env` instead of `.env.development` for production configuration.

### Multiple Environments

You can create additional environment files:

- `.env.staging` - Staging environment
- `.env.test` - Test environment
- `.env.local` - Local overrides (gitignored)

Specify which to use:

```bash
NODE_ENV=staging npm run dev
```

## Additional Resources

- **Main Documentation:** [README.md](./README.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Documentation:** [API.md](./API.md)
- **Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Security:** [SECURITY.md](./SECURITY.md)

## Next Steps

Once your environment is running:

1. Explore the IDE interface at http://localhost:3000
2. Test API endpoints using the examples above
3. Review the [Automation System](./AUTOMATION_SYSTEM.md) for advanced features
4. Check out [example projects](./AUTOMATION_EXAMPLES.md)
5. Read about [Team Collaboration](./TEAM_COLLABORATION_SETUP.md)

Happy coding! 🚀
