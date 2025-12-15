#!/bin/bash

# Test script for development environment setup
# This script verifies that the development environment is properly configured

set -e

echo "🧪 Testing Development Environment Setup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Test 1: Check environment files exist
echo "Test 1: Checking environment files..."
if [ -f ".env.development" ]; then
    echo -e "${GREEN}✅ .env.development exists${NC}"
else
    echo -e "${RED}❌ .env.development missing${NC}"
    ERRORS=$((ERRORS+1))
fi

if [ -f "frontend/.env.development" ]; then
    echo -e "${GREEN}✅ frontend/.env.development exists${NC}"
else
    echo -e "${RED}❌ frontend/.env.development missing${NC}"
    ERRORS=$((ERRORS+1))
fi

if [ -f "backend/.env.development" ]; then
    echo -e "${GREEN}✅ backend/.env.development exists${NC}"
else
    echo -e "${RED}❌ backend/.env.development missing${NC}"
    ERRORS=$((ERRORS+1))
fi

echo ""

# Test 2: Check key configurations in environment files
echo "Test 2: Checking environment configurations..."

if grep -q "COPILOT_ENABLED=true" .env.development 2>/dev/null; then
    echo -e "${GREEN}✅ Copilot enabled in .env.development${NC}"
else
    echo -e "${YELLOW}⚠️  Copilot not enabled in .env.development${NC}"
fi

if grep -q "NEXT_PUBLIC_API_URL=http://localhost:4000" frontend/.env.development 2>/dev/null; then
    echo -e "${GREEN}✅ Frontend API URL configured correctly${NC}"
else
    echo -e "${RED}❌ Frontend API URL not configured correctly${NC}"
    ERRORS=$((ERRORS+1))
fi

if grep -q "PORT=4000" backend/.env.development 2>/dev/null; then
    echo -e "${GREEN}✅ Backend port configured correctly${NC}"
else
    echo -e "${RED}❌ Backend port not configured correctly${NC}"
    ERRORS=$((ERRORS+1))
fi

echo ""

# Test 3: Check package.json scripts
echo "Test 3: Checking package.json scripts..."

if grep -q '"dev:local"' package.json 2>/dev/null; then
    echo -e "${GREEN}✅ dev:local script exists in root package.json${NC}"
else
    echo -e "${RED}❌ dev:local script missing in root package.json${NC}"
    ERRORS=$((ERRORS+1))
fi

if grep -q '"dev:local"' frontend/package.json 2>/dev/null; then
    echo -e "${GREEN}✅ dev:local script exists in frontend package.json${NC}"
else
    echo -e "${YELLOW}⚠️  dev:local script missing in frontend package.json${NC}"
fi

if grep -q '"dev:local"' backend/package.json 2>/dev/null; then
    echo -e "${GREEN}✅ dev:local script exists in backend package.json${NC}"
else
    echo -e "${YELLOW}⚠️  dev:local script missing in backend package.json${NC}"
fi

echo ""

# Test 4: Check documentation
echo "Test 4: Checking documentation..."

if [ -f "DEV_SETUP.md" ]; then
    echo -e "${GREEN}✅ DEV_SETUP.md exists${NC}"
    
    if grep -q "Copilot SaaS Testing" DEV_SETUP.md 2>/dev/null; then
        echo -e "${GREEN}✅ DEV_SETUP.md includes Copilot testing section${NC}"
    else
        echo -e "${YELLOW}⚠️  Copilot testing section not found in DEV_SETUP.md${NC}"
    fi
else
    echo -e "${RED}❌ DEV_SETUP.md missing${NC}"
    ERRORS=$((ERRORS+1))
fi

if grep -q "DEV_SETUP.md" README.md 2>/dev/null; then
    echo -e "${GREEN}✅ README.md references DEV_SETUP.md${NC}"
else
    echo -e "${YELLOW}⚠️  README.md doesn't reference DEV_SETUP.md${NC}"
fi

echo ""

# Test 5: Check backend files
echo "Test 5: Checking backend implementation files..."

if [ -f "backend/src/config/environment.ts" ]; then
    echo -e "${GREEN}✅ Environment config module exists${NC}"
else
    echo -e "${RED}❌ Environment config module missing${NC}"
    ERRORS=$((ERRORS+1))
fi

if [ -f "backend/src/services/copilot-service.ts" ]; then
    echo -e "${GREEN}✅ Copilot service module exists${NC}"
else
    echo -e "${RED}❌ Copilot service module missing${NC}"
    ERRORS=$((ERRORS+1))
fi

if [ -f "backend/src/routes/copilot-routes.ts" ]; then
    echo -e "${GREEN}✅ Copilot routes module exists${NC}"
else
    echo -e "${RED}❌ Copilot routes module missing${NC}"
    ERRORS=$((ERRORS+1))
fi

echo ""

# Test 6: Check startup script
echo "Test 6: Checking startup script..."

if [ -f "dev-start.sh" ]; then
    echo -e "${GREEN}✅ dev-start.sh exists${NC}"
    
    if [ -x "dev-start.sh" ]; then
        echo -e "${GREEN}✅ dev-start.sh is executable${NC}"
    else
        echo -e "${YELLOW}⚠️  dev-start.sh is not executable (run: chmod +x dev-start.sh)${NC}"
    fi
else
    echo -e "${RED}❌ dev-start.sh missing${NC}"
    ERRORS=$((ERRORS+1))
fi

echo ""

# Test 7: Verify TypeScript compilation (optional)
echo "Test 7: Checking TypeScript files..."

if [ -f "backend/tsconfig.json" ]; then
    echo -e "${GREEN}✅ Backend tsconfig.json exists${NC}"
else
    echo -e "${YELLOW}⚠️  Backend tsconfig.json missing${NC}"
fi

if [ -f "frontend/tsconfig.json" ]; then
    echo -e "${GREEN}✅ Frontend tsconfig.json exists${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend tsconfig.json missing${NC}"
fi

echo ""

# Summary
echo "========================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    echo ""
    echo "Your development environment is properly configured."
    echo "You can start the dev server with: ./dev-start.sh or npm run dev:local"
    exit 0
else
    echo -e "${RED}❌ $ERRORS critical test(s) failed${NC}"
    echo ""
    echo "Please review the errors above and fix them before starting development."
    exit 1
fi
