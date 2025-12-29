# master.sh - Full-Stack Bootstrap Guide

`master.sh` is a one-shot bootstrap script that scaffolds a complete full-stack starter project with FastAPI backend, Vite/React UI, and PostgreSQL database via Docker Compose.

## Features

- 🔍 **Environment Detection**: Automatically detects Python, Node.js, Docker, Git, and their versions
- 🏗️ **Project Scaffolding**: Creates complete project structure with API and UI directories
- 📦 **Dependency Management**: Installs Python and Node.js dependencies automatically
- 🐳 **Docker Support**: Generates docker-compose.yml with PostgreSQL, API, and UI services
- 🔧 **Git Integration**: Initializes Git, creates .gitignore, and sets up pre-commit hooks
- 🚀 **CI/CD Ready**: Generates GitHub Actions workflow for automated testing and building
- 💻 **Development Commands**: Simple commands to run services locally or via Docker

## Quick Start

### 1. Run Environment Detection

```bash
./master.sh detect
```

This will show you which tools are available on your system.

### 2. Bootstrap Your Project

```bash
./master.sh setup
```

This single command will:
- Create `api/` directory with FastAPI application
- Create `ui/` directory with Vite/React application
- Generate Docker Compose configuration
- Install Python and Node.js dependencies
- Initialize Git repository
- Set up pre-commit hooks
- Create GitHub Actions CI workflow

### 3. Start Development

**Option A: Run locally (without Docker)**
```bash
./master.sh run
```

**Option B: Run with Docker Compose**
```bash
./master.sh docker
```

## Generated Project Structure

```
.
├── api/
│   ├── main.py              # FastAPI application with /health endpoint
│   ├── requirements.txt     # Python dependencies (FastAPI, Uvicorn)
│   ├── start.sh            # Startup script
│   ├── Dockerfile          # Docker image for API
│   └── venv/               # Python virtual environment
├── ui/
│   ├── src/
│   │   └── main.jsx        # React app that checks API health
│   ├── index.html          # HTML entry point
│   ├── package.json        # Node.js dependencies (React, Vite)
│   ├── vite.config.mjs     # Vite configuration
│   ├── Dockerfile          # Multi-stage Docker build
│   └── node_modules/       # Node.js dependencies
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI workflow
├── hooks/
│   └── pre-commit.sh       # Git pre-commit hook
├── docker-compose.yml      # Docker Compose configuration
├── .gitignore              # Git ignore rules
└── master.sh               # This bootstrap script
```

## Commands

### detect

Detect available development tools on your system.

```bash
./master.sh detect
```

Output example:
```
ℹ️  Detection Summary:
  Python:         ✓
  Node.js:        ✓
  npm:            ✓
  Docker:         ✓
  Docker Compose: ✓
  Git:            ✓
```

### setup

Run complete project setup including scaffolding, dependency installation, and configuration.

```bash
./master.sh setup
```

**Custom Configuration:**
```bash
PROJECT_NAME=myproject API_PORT=8080 UI_PORT=3000 ./master.sh setup
```

### run

Start API and UI services locally without Docker (requires Python and Node.js).

```bash
./master.sh run
```

Services will be available at:
- API: http://localhost:8000
- UI: http://localhost:3001

Press Ctrl+C to stop both services.

### docker

Start all services using Docker Compose (requires Docker).

```bash
./master.sh docker
```

This will:
- Build Docker images for API and UI
- Start PostgreSQL database
- Start API service (waits for DB health check)
- Start UI service (depends on API)

### github-push

Interactive helper to push your project to GitHub.

```bash
./master.sh github-push
```

This will guide you through:
1. Checking for existing Git remote
2. Adding a new remote if needed
3. Committing changes
4. Pushing to GitHub

### help

Show help message with all available commands and configuration options.

```bash
./master.sh help
```

## Configuration Options

All configuration is done via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_NAME` | `myapp` | Name of the project |
| `DEFAULT_GITHUB_ORG` | _(empty)_ | Default GitHub organization/username |
| `DEFAULT_GITHUB_VISIBILITY` | `public` | Repository visibility (public/private) |
| `API_PORT` | `8000` | Port for FastAPI server |
| `UI_PORT` | `3001` | Port for Vite dev server / nginx |
| `DB_PORT` | `5432` | Port for PostgreSQL |
| `DB_NAME` | `myapp_db` | PostgreSQL database name |
| `DB_USER` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `PY_VERSION` | `3.11` | Python version for Dockerfile |
| `NODE_VERSION_HINT` | `18` | Node.js version for Dockerfile |
| `FORCE_OVERWRITE` | `0` | Set to `1` to overwrite existing files |

### Example with Custom Configuration

```bash
PROJECT_NAME=awesome-app \
API_PORT=9000 \
UI_PORT=4000 \
DB_PASSWORD=secure_password \
./master.sh setup
```

## API Endpoints

The generated FastAPI application includes:

- **GET /** - Root endpoint
  ```json
  {
    "message": "Hello from FastAPI!",
    "status": "running"
  }
  ```

- **GET /health** - Health check endpoint
  ```json
  {
    "status": "healthy",
    "service": "api"
  }
  ```

## UI Application

The generated React application:
- Polls the API `/health` endpoint every 5 seconds
- Displays API status with visual feedback (green for healthy, red for error)
- Shows API response in formatted JSON
- Includes getting started information

## Docker Services

### Database (PostgreSQL)

- Image: `postgres:15-alpine`
- Port: 5432 (configurable)
- Includes health check
- Persistent volume for data

### API (FastAPI)

- Built from `api/Dockerfile`
- Port: 8000 (configurable)
- Waits for database to be healthy
- Auto-restart enabled

### UI (React/Vite)

- Multi-stage build: Node.js builder + nginx server
- Port: 3001 (configurable)
- Depends on API service
- Production-optimized build

## GitHub Actions CI

The generated CI workflow includes:

### API Tests Job
- Sets up Python
- Installs API dependencies
- Runs tests (placeholder - add your tests)

### UI Build Job
- Sets up Node.js
- Installs UI dependencies
- Builds production bundle
- Uploads build artifacts

## Pre-commit Hook

Located at `hooks/pre-commit.sh` and symlinked to `.git/hooks/pre-commit`.

**Default placeholder implementation** - customize for your needs:
- Linting
- Code formatting
- Unit tests
- Static analysis

## Idempotent Behavior

Running `./master.sh setup` multiple times is safe:
- Existing files are not overwritten by default
- Use `FORCE_OVERWRITE=1` to override this behavior
- Dependencies are only installed if needed

## Troubleshooting

### "Python 3 not found"

Install Python 3:
```bash
# Ubuntu/Debian
sudo apt-get install python3 python3-venv

# macOS
brew install python@3.11
```

### "Node.js not found"

Install Node.js:
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@18
```

### "Docker not found"

Install Docker:
- Ubuntu/Debian: https://docs.docker.com/engine/install/ubuntu/
- macOS: https://docs.docker.com/desktop/install/mac-install/
- Windows: https://docs.docker.com/desktop/install/windows-install/

### Port Already in Use

Change the ports using environment variables:
```bash
API_PORT=8001 UI_PORT=3002 ./master.sh run
```

### Permission Denied on Scripts

Make scripts executable:
```bash
chmod +x master.sh api/start.sh hooks/pre-commit.sh
```

## Extending the Scaffold

### Adding API Dependencies

1. Edit `api/requirements.txt`
2. Add your packages
3. Re-run dependency installation:
   ```bash
   cd api
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### Adding UI Dependencies

1. Edit `ui/package.json` or use npm:
   ```bash
   cd ui
   npm install <package-name>
   ```

### Adding API Endpoints

Edit `api/main.py`:
```python
@app.get("/api/users")
async def get_users():
    return {"users": []}
```

### Customizing UI

Edit `ui/src/main.jsx` to add components and functionality.

### Database Migrations

Add a migration tool like Alembic:
```bash
cd api
source venv/bin/activate
pip install alembic
alembic init migrations
```

## Best Practices

1. **Environment Variables**: Use `.env` files for configuration (add to `.gitignore`)
2. **Secrets**: Never commit passwords or API keys
3. **Testing**: Add tests to `api/tests/` and `ui/src/__tests__/`
4. **Linting**: Configure ESLint for UI and pylint/black for API
5. **Type Safety**: Use TypeScript for UI and type hints for Python
6. **Documentation**: Keep API documentation updated (FastAPI auto-generates docs at `/docs`)

## Production Deployment

### Docker Compose

For production, update `docker-compose.yml`:
- Use secrets for passwords
- Add resource limits
- Configure proper networking
- Use production-grade PostgreSQL settings

### Kubernetes

Generate Kubernetes manifests from Docker Compose:
```bash
kompose convert -f docker-compose.yml
```

### Environment Variables

Create environment-specific files:
- `.env.development`
- `.env.staging`
- `.env.production`

## License

This bootstrap script generates MIT-licensed starter code. Customize as needed for your project.

## Support

For issues or questions:
1. Check this guide
2. Review generated files
3. Open an issue on GitHub: https://github.com/Algodons/algo

## Version

master.sh version 1.0.0
