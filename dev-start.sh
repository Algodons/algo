#!/bin/bash

# Development Environment Startup Script
# This script sets up and starts the development environment for Algo Cloud IDE

set -e

echo "🚀 Algo Cloud IDE - Development Environment"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"
echo ""

# Check if .env.development exists
if [ ! -f ".env.development" ]; then
    echo -e "${YELLOW}⚠️  .env.development not found. Creating from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env.development
        echo -e "${GREEN}✅ Created .env.development${NC}"
        echo -e "${YELLOW}📝 Please edit .env.development with your configuration${NC}"
    else
        echo -e "${RED}❌ .env.example not found. Cannot create .env.development${NC}"
        exit 1
    fi
fi

# Check if frontend/.env.development exists
if [ ! -f "frontend/.env.development" ]; then
    echo -e "${YELLOW}⚠️  frontend/.env.development not found. Creating...${NC}"
    cat > frontend/.env.development << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_COPILOT_ENABLED=true
NEXT_PUBLIC_ENVIRONMENT=development
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-nextauth-secret-key-change-in-production
EOF
    echo -e "${GREEN}✅ Created frontend/.env.development${NC}"
fi

# Check if backend/.env.development exists
if [ ! -f "backend/.env.development" ]; then
    echo -e "${YELLOW}⚠️  backend/.env.development not found. Creating...${NC}"
    cat > backend/.env.development << 'EOF'
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=algo_ide_dev
DB_USER=algo_user
DB_PASSWORD=dev_password
JWT_SECRET=dev-secret-key-at-least-32-characters-long-for-testing
JWT_EXPIRATION=7d
ENCRYPTION_SECRET=dev-encryption-key-at-least-32-characters-for-testing
COPILOT_ENABLED=true
DEBUG=true
LOG_LEVEL=debug
EOF
    echo -e "${GREEN}✅ Created backend/.env.development${NC}"
fi

echo ""

# Install dependencies if node_modules don't exist
if [ ! -d "node_modules" ] || [ ! -d "frontend/node_modules" ] || [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    echo ""
    
    # Root dependencies
    if [ ! -d "node_modules" ]; then
        echo "Installing root dependencies..."
        npm install
    fi
    
    # Frontend dependencies
    if [ ! -d "frontend/node_modules" ]; then
        echo "Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
    
    # Backend dependencies
    if [ ! -d "backend/node_modules" ]; then
        echo "Installing backend dependencies..."
        cd backend && npm install && cd ..
    fi
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

echo ""
echo "🎯 Starting development servers..."
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:4000"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo ""

# Check if ports are available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use. Please stop the process or use a different port.${NC}"
fi

if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 4000 is already in use. Please stop the process or use a different port.${NC}"
fi

# Start the development servers
NODE_ENV=development npm run dev:local
