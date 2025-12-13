# Project Templates

This directory contains pre-configured project templates for quick project initialization.

## Available Templates

### Frontend Templates
- **react-typescript**: React with TypeScript and Vite
- **nextjs-app**: Next.js 14 with App Router
- **vue-vite**: Vue 3 with Vite and TypeScript

### Backend Templates
- **express-api**: Express REST API with TypeScript
- **fastapi-rest**: FastAPI REST API with Python
- **nestjs-api**: NestJS REST API with TypeScript

### Fullstack Templates
- **mern-stack**: MongoDB, Express, React, Node.js
- **t3-stack**: Next.js, tRPC, Prisma, TypeScript

## Usage

Templates are automatically initialized using scaffolding tools like:
- `create-vite` for React and Vue projects
- `create-next-app` for Next.js projects
- `@nestjs/cli` for NestJS projects
- Custom generators for Express and FastAPI

## Template Structure

Each template can include:
- Source code structure
- Configuration files
- Docker support
- Environment variable templates
- Testing setup
- Documentation

## Adding New Templates

To add a new template:
1. Create a new directory under the appropriate category (frontend/backend/fullstack/mobile/devops)
2. Add the template configuration to `TemplateManager.getAvailableTemplates()`
3. Implement the initialization logic in `TemplateManager`
