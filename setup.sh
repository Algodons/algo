#!/bin/bash

# Algo Cloud IDE - Setup Script
# This script sets up the development environment

set -e

echo "=========================================="
echo "  Algo Cloud IDE - Development Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_success "Docker is installed"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_success "Docker Compose is installed"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_warning "Node.js is not installed. Some features may not work."
else
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION is installed"
fi

echo ""
echo "Step 1: Setting up environment variables..."

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    print_success "Created .env file from .env.example"
    print_warning "Please update .env file with your configuration"
else
    print_warning ".env file already exists, skipping..."
fi

echo ""
echo "Step 2: Creating necessary directories..."

# Create directories
mkdir -p backend/logs
mkdir -p frontend/.next
mkdir -p /tmp/git-repos
mkdir -p data/postgres
mkdir -p data/redis
mkdir -p data/mongodb
mkdir -p data/minio

print_success "Directories created"

echo ""
echo "Step 3: Installing dependencies..."

# Install root dependencies
if [ -f package.json ]; then
    npm install
    print_success "Root dependencies installed"
fi

# Install frontend dependencies
if [ -d frontend ] && [ -f frontend/package.json ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
fi

# Install backend dependencies
if [ -d backend ] && [ -f backend/package.json ]; then
    echo "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
fi

echo ""
echo "Step 4: Starting Docker services..."

# Start Docker Compose services
docker-compose up -d

print_success "Docker services started"

echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    print_success "Services are running"
else
    print_error "Some services failed to start"
    echo "Run 'docker-compose logs' to see the error details"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Services are running at:"
echo "  Frontend:     http://localhost:3000"
echo "  Backend API:  http://localhost:4000"
echo "  MinIO:        http://localhost:9001"
echo ""
echo "Database connections:"
echo "  PostgreSQL:   localhost:5432"
echo "  Redis:        localhost:6379"
echo "  MongoDB:      localhost:27017"
echo ""
echo "To start development:"
echo "  cd frontend && npm run dev    # Start frontend"
echo "  cd backend && npm run dev     # Start backend"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
echo "For more information, see README.md"
echo ""
