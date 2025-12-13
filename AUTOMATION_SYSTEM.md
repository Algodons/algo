# Intelligent Automation System

A comprehensive automation system for project detection, infrastructure generation, and deployment automation.

## 🚀 Features

### 1. Auto-Detection Module

Automatically detect and configure projects:

- **Framework Detection**: Detects frameworks from various configuration files
  - Node.js projects (React, Vue, Next.js, Express, NestJS, etc.)
  - Python projects (Django, Flask, FastAPI)
  - Rust projects (Actix, Rocket, Axum)
  - Java projects (Spring Boot)
  - Go projects (Gin, Fiber)
  - PHP projects (Laravel, Symfony)

- **Build Command Inference**: Automatically determines build commands
  - Analyzes package.json scripts
  - Identifies common build patterns
  - Detects test and dev commands

- **Port Detection**: Scans for port definitions
  - Checks configuration files
  - Scans source code
  - Uses framework defaults

- **Dependency Installation**: Auto-installs dependencies
  - npm/yarn/pnpm for Node.js
  - pip/pipenv/poetry for Python
  - cargo for Rust
  - go mod for Go
  - composer for PHP

### 2. Infrastructure as Code (IaC) Generation

Generate production-ready infrastructure configurations:

- **Dockerfile Generation**
  - Multi-stage builds for optimization
  - Security best practices (non-root users)
  - Layer caching optimization
  - Health checks included

- **Kubernetes Manifests**
  - Deployment with resource limits
  - Service configuration
  - Ingress with TLS
  - ConfigMap and Secret templates
  - Horizontal Pod Autoscaler (HPA)

- **Terraform Templates**
  - AWS infrastructure
  - DigitalOcean infrastructure
  - Cloud-agnostic design

- **nginx Configuration**
  - Reverse proxy setup
  - SSL/TLS configuration
  - Security headers
  - Gzip compression
  - Rate limiting

### 3. Server Setup Automation

One-command server installation:

```bash
curl -fsSL https://install.gxqstudio.com | bash
```

The installation script:
- Detects OS and distribution (Ubuntu, Debian, CentOS, Fedora)
- Checks system requirements
- Installs Docker and Docker Compose
- Installs Node.js via nvm
- Installs Python
- Installs nginx
- Installs certbot for SSL certificates
- Configures firewall (UFW/firewalld)
- Installs essential development tools

### 4. Project Templates System

50+ pre-configured starter templates:

**Frontend:**
- React with TypeScript
- Next.js with App Router
- Vue 3 with Vite
- Angular
- Svelte

**Backend:**
- Express with TypeScript
- FastAPI with Python
- NestJS
- Django
- Flask

**Fullstack:**
- MERN Stack
- T3 Stack (Next.js + tRPC + Prisma)
- MEAN Stack

## 📚 API Documentation

### Auto-Detection

**Detect Project Configuration**
```http
POST /api/automation/detect
Content-Type: application/json

{
  "projectPath": "/path/to/project"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "frameworks": [
      {
        "type": "frontend",
        "name": "React",
        "version": "^18.2.0",
        "language": "JavaScript/TypeScript",
        "packageManager": "npm"
      }
    ],
    "commands": {
      "install": ["npm install"],
      "build": ["npm run build"],
      "start": ["npm start"],
      "test": ["npm test"],
      "dev": ["npm run dev"]
    },
    "ports": [
      {
        "port": 3000,
        "service": "React",
        "isDefault": true
      }
    ]
  }
}
```

**Install Dependencies**
```http
POST /api/automation/install
Content-Type: application/json

{
  "projectPath": "/path/to/project"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "total": 1,
    "successful": 1,
    "failed": 0,
    "results": [
      {
        "success": true,
        "output": "...",
        "error": null
      }
    ]
  }
}
```

### Infrastructure Generation

**Generate IaC**
```http
POST /api/automation/generate-iac
Content-Type: application/json

{
  "projectPath": "/path/to/project",
  "domain": "example.com",
  "cloudProvider": "aws"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "dockerfile": "FROM node:18-alpine...",
    "kubernetes": {
      "deployment": "apiVersion: apps/v1...",
      "service": "apiVersion: v1...",
      "ingress": "apiVersion: networking.k8s.io/v1...",
      "configMap": "apiVersion: v1...",
      "hpa": "apiVersion: autoscaling/v2..."
    },
    "nginx": "server {...}",
    "terraform": "terraform {...}"
  }
}
```

### Template Management

**Get Available Templates**
```http
GET /api/automation/templates
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "name": "react-typescript",
      "description": "React with TypeScript and Vite",
      "type": "frontend",
      "language": "TypeScript",
      "framework": "React",
      "features": ["Vite", "TypeScript", "ESLint", "Prettier"],
      "defaultPort": 5173
    }
  ]
}
```

**Initialize from Template**
```http
POST /api/automation/init-template
Content-Type: application/json

{
  "templateName": "react-typescript",
  "targetDir": "/path/to/new/project",
  "customization": {
    "projectName": "my-app",
    "features": ["auth", "testing"],
    "addDocker": true,
    "envVars": {
      "API_URL": "https://api.example.com"
    }
  }
}
```

**Import from GitHub**
```http
POST /api/automation/import-github
Content-Type: application/json

{
  "repoUrl": "https://github.com/username/repo.git",
  "targetDir": "/path/to/target"
}
```

### Full Project Setup

**Complete Setup**
```http
POST /api/automation/setup
Content-Type: application/json

{
  "projectPath": "/path/to/project",
  "options": {
    "installDependencies": true,
    "generateIaC": true,
    "domain": "example.com",
    "cloudProvider": "aws"
  }
}
```

Response includes detection, installation, and IaC generation results.

## 🔧 Usage Examples

### Using the Automation Service Programmatically

```typescript
import { AutomationService } from './backend/src/automation/automation-service';

const automation = new AutomationService('/templates', true);

// Auto-detect project
const detection = await automation.autoDetect('/path/to/project');
console.log('Detected frameworks:', detection.frameworks);

// Install dependencies
const installation = await automation.installDependencies('/path/to/project');
console.log('Installation result:', installation);

// Generate IaC
const iac = await automation.generateIaC('/path/to/project', 'example.com', 'aws');
console.log('Dockerfile:', iac.dockerfile);

// Initialize from template
await automation.initializeFromTemplate('react-typescript', '/path/to/new/project', {
  projectName: 'my-app',
  addDocker: true,
});

// Full setup
const setup = await automation.setupProject('/path/to/project', {
  installDependencies: true,
  generateIaC: true,
  domain: 'example.com',
});
```

### Using the REST API

```bash
# Detect project configuration
curl -X POST http://localhost:4000/api/automation/detect \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/workspace/my-project"}'

# Install dependencies
curl -X POST http://localhost:4000/api/automation/install \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/workspace/my-project"}'

# Generate IaC
curl -X POST http://localhost:4000/api/automation/generate-iac \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "/workspace/my-project",
    "domain": "example.com",
    "cloudProvider": "aws"
  }'

# Get templates
curl http://localhost:4000/api/automation/templates

# Initialize from template
curl -X POST http://localhost:4000/api/automation/init-template \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "react-typescript",
    "targetDir": "/workspace/new-project",
    "customization": {
      "projectName": "my-app",
      "addDocker": true
    }
  }'
```

## 🏗️ Architecture

```
backend/src/automation/
├── auto-detect/          # Auto-detection modules
│   ├── framework-detector.ts
│   ├── build-command-inferrer.ts
│   ├── port-detector.ts
│   └── dependency-installer.ts
├── iac/                  # IaC generators
│   ├── dockerfile-generator.ts
│   ├── kubernetes-generator.ts
│   ├── nginx-generator.ts
│   └── terraform-generator.ts
├── templates/            # Template management
│   └── template-manager.ts
├── utils/               # Utilities
│   ├── file-scanner.ts
│   ├── config-parser.ts
│   └── logger.ts
└── automation-service.ts # Main service
```

## 🔐 Security Considerations

- All generated configurations follow security best practices
- Non-root users in containers
- Security headers in nginx configs
- SSL/TLS enabled by default
- Rate limiting configured
- Environment variables properly handled

## 🎯 Supported Frameworks

### JavaScript/TypeScript
- React, Next.js, Gatsby
- Vue, Nuxt
- Angular, Svelte
- Express, Fastify, NestJS

### Python
- Django, Flask, FastAPI

### Rust
- Actix, Rocket, Axum

### Java
- Spring Boot

### Go
- Gin, Fiber, Gorilla Mux

### PHP
- Laravel, Symfony

## 🚀 Deployment

The automation system is integrated into the main backend server and starts automatically when the server runs.

To use in production:
1. Ensure all required dependencies are installed on the server
2. Configure environment variables
3. Start the backend server
4. Access via `/api/automation/*` endpoints

## 📝 Environment Variables

```bash
# Optional configuration
DEBUG=true                    # Enable debug logging
WORKSPACE_DIR=/workspaces    # Directory for workspaces
TEMPLATES_DIR=/templates     # Directory for templates
```

## 🤝 Contributing

To add new framework support:
1. Update `FrameworkDetector` with detection logic
2. Add build commands in `BuildCommandInferrer`
3. Add default ports in `PortDetector`
4. Update IaC generators as needed
5. Add template configuration

## 📄 License

MIT License - see LICENSE file for details
