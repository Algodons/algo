#!/bin/bash

# Vercel Setup Helper Script
# This script helps prepare your project for Vercel deployment
#
# Usage: ./setup-vercel.sh
# Note: Make sure this script is executable: chmod +x setup-vercel.sh

set -e

echo "🚀 Algo Cloud IDE - Vercel Setup Helper"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the repository root.${NC}"
    exit 1
fi

echo "Step 1: Checking prerequisites..."
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js version 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js version: $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm version: $(npm -v)"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Vercel CLI is not installed."
    echo ""
    read -p "Do you want to install Vercel CLI globally? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install -g vercel
        echo -e "${GREEN}✓${NC} Vercel CLI installed"
    else
        echo -e "${YELLOW}⚠${NC} Vercel CLI not installed. You can install it later with: npm install -g vercel"
    fi
else
    echo -e "${GREEN}✓${NC} Vercel CLI is installed"
fi

echo ""
echo "Step 2: Installing frontend dependencies..."
echo ""

cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies (this may take a few minutes)..."
    npm install
    echo -e "${GREEN}✓${NC} Frontend dependencies installed"
else
    echo -e "${GREEN}✓${NC} Frontend dependencies already installed"
fi

echo ""
echo "Step 3: Testing frontend build..."
echo ""

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend builds successfully!"
else
    echo -e "${RED}✗${NC} Frontend build failed. Please check the errors above."
    exit 1
fi

cd ..

echo ""
echo "Step 4: Environment variables setup..."
echo ""

if [ ! -f ".env.vercel.example" ]; then
    echo -e "${RED}Error: .env.vercel.example not found.${NC}"
    exit 1
fi

echo "Template file .env.vercel.example is available for reference."
echo ""
echo -e "${YELLOW}Important:${NC} You need to configure environment variables in Vercel dashboard."
echo ""
echo "Required environment variables:"
echo "  • NEXTAUTH_URL (your Vercel app URL)"
echo "  • NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
echo "  • JWT_SECRET (generate with: openssl rand -base64 32)"
echo "  • API_URL (your backend API URL)"
echo "  • NEXT_PUBLIC_API_URL (your backend API URL)"
echo ""

# Generate sample secrets
echo "Generating sample secrets for you:"
echo ""
echo -e "${GREEN}NEXTAUTH_SECRET:${NC}"
openssl rand -base64 32 2>/dev/null || echo "Run: openssl rand -base64 32"
echo ""
echo -e "${GREEN}JWT_SECRET:${NC}"
openssl rand -base64 32 2>/dev/null || echo "Run: openssl rand -base64 32"
echo ""

echo "Step 5: Vercel configuration check..."
echo ""

if [ -f "vercel.json" ]; then
    echo -e "${GREEN}✓${NC} vercel.json found"
else
    echo -e "${RED}✗${NC} vercel.json not found"
fi

if [ -f ".vercelignore" ]; then
    echo -e "${GREEN}✓${NC} .vercelignore found"
else
    echo -e "${YELLOW}⚠${NC} .vercelignore not found (optional)"
fi

if [ -f "frontend/next.config.js" ]; then
    echo -e "${GREEN}✓${NC} next.config.js found"
else
    echo -e "${RED}✗${NC} frontend/next.config.js not found"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Deploy your backend to Railway, Render, or Fly.io"
echo "   See: VERCEL_DEPLOYMENT.md for backend deployment options"
echo ""
echo "2. Deploy to Vercel:"
echo "   Option A - Using Vercel CLI:"
echo "     cd frontend"
echo "     vercel --prod"
echo ""
echo "   Option B - Using Vercel Dashboard:"
echo "     • Go to https://vercel.com/new"
echo "     • Import your repository"
echo "     • Set root directory to 'frontend'"
echo "     • Configure environment variables"
echo "     • Deploy!"
echo ""
echo "3. Configure environment variables in Vercel:"
echo "   • Go to Project Settings → Environment Variables"
echo "   • Add the variables listed above"
echo "   • Use the generated secrets"
echo ""
echo "📚 Documentation:"
echo "   • Full guide: VERCEL_DEPLOYMENT.md"
echo "   • Troubleshooting: VERCEL_TROUBLESHOOTING.md"
echo ""
echo "Good luck! 🚀"
echo ""
