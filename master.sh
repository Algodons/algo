#!/usr/bin/env bash
# master.sh - One-shot bootstrap script for full-stack starter
# Scaffolds FastAPI backend, Vite/React UI, Postgres via Docker Compose
set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

# Project metadata
PROJECT_NAME="${PROJECT_NAME:-myapp}"
DEFAULT_GITHUB_ORG="${DEFAULT_GITHUB_ORG:-}"
DEFAULT_GITHUB_VISIBILITY="${DEFAULT_GITHUB_VISIBILITY:-public}"

# Ports
API_PORT="${API_PORT:-8000}"
UI_PORT="${UI_PORT:-3001}"
DB_PORT="${DB_PORT:-5432}"

# Database credentials
DB_NAME="${DB_NAME:-${PROJECT_NAME}_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Versions
PY_VERSION="${PY_VERSION:-3.11}"
NODE_VERSION_HINT="${NODE_VERSION_HINT:-18}"

# =============================================================================
# UTILITIES
# =============================================================================

warn() {
  echo "⚠️  $*" >&2
}

err() {
  echo "❌ $*" >&2
  exit 1
}

ask() {
  local prompt="$1"
  local default="${2:-}"
  local response
  
  if [[ -n "$default" ]]; then
    read -r -p "❓ $prompt [$default]: " response
    echo "${response:-$default}"
  else
    read -r -p "❓ $prompt: " response
    echo "$response"
  fi
}

info() {
  echo "ℹ️  $*"
}

success() {
  echo "✅ $*"
}

# =============================================================================
# ENVIRONMENT DETECTION
# =============================================================================

detect_python() {
  if command -v python3 &>/dev/null; then
    local version
    version=$(python3 --version 2>&1 | awk '{print $2}')
    info "Python detected: $version"
    return 0
  else
    warn "Python 3 not found"
    return 1
  fi
}

detect_node() {
  if command -v node &>/dev/null; then
    local version
    version=$(node --version 2>&1)
    info "Node.js detected: $version"
    return 0
  else
    warn "Node.js not found"
    return 1
  fi
}

detect_docker() {
  if command -v docker &>/dev/null; then
    local version
    version=$(docker --version 2>&1 | awk '{print $3}' | sed 's/,$//')
    info "Docker detected: $version"
    return 0
  else
    warn "Docker not found"
    return 1
  fi
}

detect_docker_compose() {
  if command -v docker-compose &>/dev/null || docker compose version &>/dev/null; then
    info "Docker Compose detected"
    return 0
  else
    warn "Docker Compose not found"
    return 1
  fi
}

detect_git() {
  if command -v git &>/dev/null; then
    local version
    version=$(git --version 2>&1 | awk '{print $3}')
    info "Git detected: $version"
    return 0
  else
    warn "Git not found"
    return 1
  fi
}

detect_npm() {
  if command -v npm &>/dev/null; then
    local version
    version=$(npm --version 2>&1)
    info "npm detected: $version"
    return 0
  else
    warn "npm not found"
    return 1
  fi
}

cmd_detect() {
  info "Detecting environment..."
  echo ""
  
  detect_python && HAS_PYTHON=1 || HAS_PYTHON=0
  detect_node && HAS_NODE=1 || HAS_NODE=0
  detect_npm && HAS_NPM=1 || HAS_NPM=0
  detect_docker && HAS_DOCKER=1 || HAS_DOCKER=0
  detect_docker_compose && HAS_DOCKER_COMPOSE=1 || HAS_DOCKER_COMPOSE=0
  detect_git && HAS_GIT=1 || HAS_GIT=0
  
  echo ""
  info "Detection Summary:"
  echo "  Python:         $([ $HAS_PYTHON -eq 1 ] && echo '✓' || echo '✗')"
  echo "  Node.js:        $([ $HAS_NODE -eq 1 ] && echo '✓' || echo '✗')"
  echo "  npm:            $([ $HAS_NPM -eq 1 ] && echo '✓' || echo '✗')"
  echo "  Docker:         $([ $HAS_DOCKER -eq 1 ] && echo '✓' || echo '✗')"
  echo "  Docker Compose: $([ $HAS_DOCKER_COMPOSE -eq 1 ] && echo '✓' || echo '✗')"
  echo "  Git:            $([ $HAS_GIT -eq 1 ] && echo '✓' || echo '✗')"
}

# =============================================================================
# SCAFFOLD CREATION
# =============================================================================

create_directories() {
  info "Creating directory structure..."
  
  mkdir -p api ui .github/workflows hooks
  
  success "Directories created"
}

create_api_files() {
  info "Creating API files..."
  
  # api/main.py
  if [[ ! -f api/main.py ]]; then
    cat > api/main.py <<'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="MyApp API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello from FastAPI!", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "api"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
EOF
    success "Created api/main.py"
  else
    info "api/main.py already exists, skipping"
  fi
  
  # api/requirements.txt
  if [[ ! -f api/requirements.txt ]]; then
    cat > api/requirements.txt <<'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-dotenv==1.0.0
EOF
    success "Created api/requirements.txt"
  else
    info "api/requirements.txt already exists, skipping"
  fi
  
  # api/start.sh
  if [[ ! -f api/start.sh ]]; then
    cat > api/start.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

API_PORT="${API_PORT:-8000}"

echo "Starting FastAPI server on port $API_PORT..."
exec uvicorn main:app --host 0.0.0.0 --port "$API_PORT" --reload
EOF
    chmod +x api/start.sh
    success "Created api/start.sh"
  else
    info "api/start.sh already exists, skipping"
  fi
  
  # api/Dockerfile
  if [[ ! -f api/Dockerfile ]]; then
    cat > api/Dockerfile <<EOF
FROM python:${PY_VERSION}-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV API_PORT=${API_PORT}

EXPOSE ${API_PORT}

CMD ["python", "main.py"]
EOF
    success "Created api/Dockerfile"
  else
    info "api/Dockerfile already exists, skipping"
  fi
}

create_ui_files() {
  info "Creating UI files..."
  
  # ui/package.json
  if [[ ! -f ui/package.json ]]; then
    cat > ui/package.json <<'EOF'
{
  "name": "ui",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
EOF
    success "Created ui/package.json"
  else
    info "ui/package.json already exists, skipping"
  fi
  
  # ui/index.html
  if [[ ! -f ui/index.html ]]; then
    cat > ui/index.html <<'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MyApp</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF
    success "Created ui/index.html"
  else
    info "ui/index.html already exists, skipping"
  fi
  
  # ui/src/main.jsx
  mkdir -p ui/src
  if [[ ! -f ui/src/main.jsx ]]; then
    cat > ui/src/main.jsx <<EOF
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:${API_PORT}';

function App() {
  const [apiStatus, setApiStatus] = useState('checking...');
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(\`\${API_URL}/health\`);
        const data = await response.json();
        setApiStatus(data.status);
        setApiMessage(JSON.stringify(data, null, 2));
      } catch (error) {
        setApiStatus('error');
        setApiMessage(error.message);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif', 
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1>🚀 Full-Stack Starter</h1>
      <div style={{ 
        padding: '1rem', 
        background: apiStatus === 'healthy' ? '#d4edda' : '#f8d7da',
        border: '1px solid ' + (apiStatus === 'healthy' ? '#c3e6cb' : '#f5c6cb'),
        borderRadius: '4px',
        marginTop: '1rem'
      }}>
        <h2>API Status: {apiStatus}</h2>
        <pre style={{ 
          background: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '4px',
          overflow: 'auto'
        }}>
          {apiMessage}
        </pre>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <h2>Getting Started</h2>
        <ul>
          <li>API running on port ${API_PORT}</li>
          <li>UI running on port ${UI_PORT}</li>
          <li>Check /health endpoint for API status</li>
        </ul>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
EOF
    success "Created ui/src/main.jsx"
  else
    info "ui/src/main.jsx already exists, skipping"
  fi
  
  # ui/vite.config.mjs
  if [[ ! -f ui/vite.config.mjs ]]; then
    cat > ui/vite.config.mjs <<EOF
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: ${UI_PORT},
    host: true,
  },
  preview: {
    port: ${UI_PORT},
  },
});
EOF
    success "Created ui/vite.config.mjs"
  else
    info "ui/vite.config.mjs already exists, skipping"
  fi
  
  # ui/Dockerfile
  if [[ ! -f ui/Dockerfile ]]; then
    cat > ui/Dockerfile <<EOF
# Build stage
FROM node:${NODE_VERSION_HINT}-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config
RUN echo 'server { \
  listen ${UI_PORT}; \
  location / { \
    root /usr/share/nginx/html; \
    index index.html; \
    try_files \$uri \$uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE ${UI_PORT}

CMD ["nginx", "-g", "daemon off;"]
EOF
    success "Created ui/Dockerfile"
  else
    info "ui/Dockerfile already exists, skipping"
  fi
}

# =============================================================================
# SERVICE SETUP
# =============================================================================

setup_api() {
  if [[ $HAS_PYTHON -eq 1 ]]; then
    info "Setting up Python API environment..."
    
    cd api
    
    # Create virtualenv if it doesn't exist
    if [[ ! -d venv ]]; then
      python3 -m venv venv
      success "Created Python virtual environment"
    fi
    
    # Activate and install dependencies
    # shellcheck disable=SC1091
    source venv/bin/activate
    pip install --upgrade pip > /dev/null 2>&1
    pip install -r requirements.txt
    deactivate
    
    cd ..
    success "API dependencies installed"
  else
    warn "Python not available, skipping API setup"
  fi
}

setup_ui() {
  if [[ $HAS_NPM -eq 1 ]]; then
    info "Setting up UI environment..."
    
    cd ui
    
    if [[ ! -d node_modules ]]; then
      npm install
      success "UI dependencies installed"
    else
      info "UI dependencies already installed"
    fi
    
    cd ..
  else
    warn "npm not available, skipping UI setup"
  fi
}

# =============================================================================
# DOCKER COMPOSE
# =============================================================================

create_docker_compose() {
  info "Creating docker-compose.yml..."
  
  if [[ ! -f docker-compose.yml ]] || [[ "${FORCE_OVERWRITE:-0}" == "1" ]]; then
    cat > docker-compose.yml <<EOF
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "${DB_PORT}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "${API_PORT}:${API_PORT}"
    environment:
      API_PORT: ${API_PORT}
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  ui:
    build:
      context: ./ui
      dockerfile: Dockerfile
    ports:
      - "${UI_PORT}:${UI_PORT}"
    environment:
      VITE_API_URL: http://localhost:${API_PORT}
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
EOF
    success "Created docker-compose.yml"
  else
    info "docker-compose.yml already exists, skipping (use FORCE_OVERWRITE=1 to override)"
  fi
}

# =============================================================================
# GIT HOOKS
# =============================================================================

setup_git() {
  if [[ $HAS_GIT -eq 1 ]]; then
    info "Setting up Git..."
    
    # Initialize git if not already initialized
    if [[ ! -d .git ]]; then
      git init
      success "Git repository initialized"
    else
      info "Git repository already initialized"
    fi
    
    # Create .gitignore
    if [[ ! -f .gitignore ]]; then
      cat > .gitignore <<'EOF'
# Dependencies
node_modules/
venv/
__pycache__/
*.pyc

# Build outputs
dist/
build/
*.egg-info/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Docker
.docker/

# Testing
coverage/
.pytest_cache/
EOF
      success "Created .gitignore"
    else
      info ".gitignore already exists"
    fi
    
    # Create pre-commit hook
    if [[ ! -f hooks/pre-commit.sh ]]; then
      cat > hooks/pre-commit.sh <<'EOF'
#!/usr/bin/env bash
# Pre-commit hook - placeholder checks
set -euo pipefail

echo "Running pre-commit checks..."

# Placeholder: Add your checks here
# Examples:
# - Linting
# - Code formatting
# - Unit tests
# - Static analysis

echo "✅ Pre-commit checks passed"
exit 0
EOF
      chmod +x hooks/pre-commit.sh
      success "Created hooks/pre-commit.sh"
    else
      info "hooks/pre-commit.sh already exists"
    fi
    
    # Symlink to .git/hooks/pre-commit
    if [[ ! -f .git/hooks/pre-commit ]]; then
      ln -sf ../../hooks/pre-commit.sh .git/hooks/pre-commit
      success "Symlinked pre-commit hook"
    else
      info "Pre-commit hook already exists"
    fi
  else
    warn "Git not available, skipping Git setup"
  fi
}

# =============================================================================
# GITHUB ACTIONS CI
# =============================================================================

create_ci_workflow() {
  info "Creating GitHub Actions CI workflow..."
  
  mkdir -p .github/workflows
  
  if [[ ! -f .github/workflows/ci.yml ]] || [[ "${FORCE_OVERWRITE:-0}" == "1" ]]; then
    cat > .github/workflows/ci.yml <<EOF
name: CI

on:
  push:
    branches:
      - main
      - master
  pull_request:
    branches:
      - main
      - master

jobs:
  api-test:
    name: API Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '${PY_VERSION}'
          cache: 'pip'

      - name: Install API dependencies
        working-directory: ./api
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run API tests (placeholder)
        working-directory: ./api
        run: |
          echo "No tests defined yet"
          # Add: pytest tests/

  ui-build:
    name: UI Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${NODE_VERSION_HINT}'
          cache: 'npm'
          cache-dependency-path: './ui/package-lock.json'

      - name: Install UI dependencies
        working-directory: ./ui
        run: npm ci

      - name: Build UI
        working-directory: ./ui
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ui-build
          path: ui/dist/
          retention-days: 7
EOF
    success "Created .github/workflows/ci.yml"
  else
    info ".github/workflows/ci.yml already exists, skipping (use FORCE_OVERWRITE=1 to override)"
  fi
}

# =============================================================================
# COMMAND HANDLERS
# =============================================================================

cmd_setup() {
  info "Running full setup..."
  echo ""
  
  # Detect environment
  cmd_detect
  echo ""
  
  # Create scaffolding
  create_directories
  create_api_files
  create_ui_files
  create_docker_compose
  
  echo ""
  
  # Setup services
  setup_api
  setup_ui
  
  echo ""
  
  # Git and CI
  setup_git
  create_ci_workflow
  
  echo ""
  success "Setup complete!"
  echo ""
  info "Next steps:"
  echo "  - Run './master.sh run' to start API and UI locally"
  echo "  - Run './master.sh docker' to start with Docker Compose"
  echo "  - Run './master.sh github-push' to push to GitHub"
}

cmd_run() {
  info "Starting services locally..."
  
  if [[ $HAS_PYTHON -eq 0 ]] || [[ $HAS_NPM -eq 0 ]]; then
    err "Python and npm are required to run services locally"
  fi
  
  # Start API in background
  info "Starting API on port $API_PORT..."
  cd api
  # shellcheck disable=SC1091
  source venv/bin/activate
  API_PORT=$API_PORT python main.py &
  API_PID=$!
  cd ..
  
  # Start UI in background
  info "Starting UI on port $UI_PORT..."
  cd ui
  VITE_API_URL="http://localhost:$API_PORT" npm run dev &
  UI_PID=$!
  cd ..
  
  success "Services started!"
  info "API running at http://localhost:$API_PORT"
  info "UI running at http://localhost:$UI_PORT"
  echo ""
  info "Press Ctrl+C to stop services"
  
  # Wait for interrupt
  trap "kill $API_PID $UI_PID 2>/dev/null; exit 0" INT TERM
  wait
}

cmd_docker() {
  info "Starting services with Docker Compose..."
  
  if [[ $HAS_DOCKER_COMPOSE -eq 0 ]]; then
    err "Docker Compose is required"
  fi
  
  # Try docker compose (new) then docker-compose (old)
  if docker compose version &>/dev/null; then
    docker compose up --build
  else
    docker-compose up --build
  fi
}

cmd_github_push() {
  info "GitHub Push Helper"
  echo ""
  
  if [[ $HAS_GIT -eq 0 ]]; then
    err "Git is required"
  fi
  
  # Check if we have a remote
  if git remote get-url origin &>/dev/null; then
    info "Remote 'origin' already configured"
    REMOTE_URL=$(git remote get-url origin)
    info "Remote URL: $REMOTE_URL"
  else
    warn "No remote 'origin' configured"
    echo ""
    info "To push to GitHub, you need to:"
    echo "  1. Create a new repository on GitHub"
    echo "  2. Add the remote with: git remote add origin <URL>"
    echo ""
    
    local should_setup
    should_setup=$(ask "Would you like to add a remote now? (y/n)" "n")
    
    if [[ "$should_setup" =~ ^[Yy] ]]; then
      local org_or_user
      if [[ -n "$DEFAULT_GITHUB_ORG" ]]; then
        org_or_user=$(ask "GitHub username or organization" "$DEFAULT_GITHUB_ORG")
      else
        org_or_user=$(ask "GitHub username or organization")
      fi
      
      local repo_name
      repo_name=$(ask "Repository name" "$PROJECT_NAME")
      
      local remote_url="https://github.com/$org_or_user/$repo_name.git"
      
      info "Adding remote: $remote_url"
      git remote add origin "$remote_url"
      success "Remote added"
      
      warn "Don't forget to create the repository on GitHub first!"
      warn "Visit: https://github.com/new"
    else
      info "Skipping remote setup"
      return 0
    fi
  fi
  
  # Commit and push
  info "Checking for changes..."
  
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    info "Uncommitted changes found"
    git add .
    
    local commit_msg
    commit_msg=$(ask "Commit message" "Initial commit from master.sh")
    
    git commit -m "$commit_msg"
    success "Changes committed"
  else
    info "No uncommitted changes"
  fi
  
  info "Pushing to origin..."
  git push -u origin main || git push -u origin master
  
  success "Pushed to GitHub!"
}

cmd_help() {
  cat <<EOF
master.sh - Full-Stack Bootstrap Script

USAGE:
  ./master.sh COMMAND [OPTIONS]

COMMANDS:
  detect        Detect available tools (Python, Node, Docker, Git)
  setup         Run full setup: scaffold, dependencies, docker-compose, git, CI
  run           Start API and UI locally (without Docker)
  docker        Start services with Docker Compose
  github-push   Guide through adding GitHub remote and pushing code
  help          Show this help message

CONFIGURATION (via environment variables):
  PROJECT_NAME              Project name (default: myapp)
  DEFAULT_GITHUB_ORG        Default GitHub organization
  DEFAULT_GITHUB_VISIBILITY Repository visibility (default: public)
  API_PORT                  API port (default: 8000)
  UI_PORT                   UI port (default: 3001)
  DB_PORT                   Database port (default: 5432)
  DB_NAME                   Database name (default: myapp_db)
  DB_USER                   Database user (default: postgres)
  DB_PASSWORD               Database password (default: postgres)
  PY_VERSION                Python version (default: 3.11)
  NODE_VERSION_HINT         Node.js version hint (default: 18)
  FORCE_OVERWRITE           Overwrite existing files (default: 0)

EXAMPLES:
  # Run detection
  ./master.sh detect

  # Full setup with custom project name
  PROJECT_NAME=myproject ./master.sh setup

  # Start services locally
  ./master.sh run

  # Start with Docker
  ./master.sh docker

  # Push to GitHub
  ./master.sh github-push

GENERATED STRUCTURE:
  api/
    main.py              FastAPI application
    requirements.txt     Python dependencies
    start.sh            Start script
    Dockerfile          API Docker image
    venv/               Python virtual environment (after setup)
  ui/
    src/main.jsx        React application
    index.html          HTML entry point
    package.json        Node dependencies
    vite.config.mjs     Vite configuration
    Dockerfile          UI Docker image
    node_modules/       Node dependencies (after setup)
  .github/workflows/
    ci.yml              GitHub Actions CI
  hooks/
    pre-commit.sh       Pre-commit hook
  docker-compose.yml    Docker Compose configuration
  .gitignore            Git ignore file

For more information, visit: https://github.com/Algodons/algo
EOF
}

# =============================================================================
# MAIN
# =============================================================================

main() {
  local command="${1:-help}"
  
  case "$command" in
    detect)
      cmd_detect
      ;;
    setup)
      # Run detection first
      HAS_PYTHON=0
      HAS_NODE=0
      HAS_NPM=0
      HAS_DOCKER=0
      HAS_DOCKER_COMPOSE=0
      HAS_GIT=0
      
      detect_python && HAS_PYTHON=1 || true
      detect_node && HAS_NODE=1 || true
      detect_npm && HAS_NPM=1 || true
      detect_docker && HAS_DOCKER=1 || true
      detect_docker_compose && HAS_DOCKER_COMPOSE=1 || true
      detect_git && HAS_GIT=1 || true
      
      cmd_setup
      ;;
    run)
      # Detect for run command
      HAS_PYTHON=0
      HAS_NPM=0
      detect_python && HAS_PYTHON=1 || true
      detect_npm && HAS_NPM=1 || true
      
      cmd_run
      ;;
    docker)
      HAS_DOCKER_COMPOSE=0
      detect_docker_compose && HAS_DOCKER_COMPOSE=1 || true
      
      cmd_docker
      ;;
    github-push)
      HAS_GIT=0
      detect_git && HAS_GIT=1 || true
      
      cmd_github_push
      ;;
    help|--help|-h)
      cmd_help
      ;;
    *)
      err "Unknown command: $command (use 'help' for usage)"
      ;;
  esac
}

# Run main if not sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
