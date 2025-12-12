# Algo Cloud IDE

A production-grade cloud IDE and deployment platform similar to Replit, built with modern technologies and best practices.

## 🚀 Features

### Core Features
- **Multi-language Code Editor**: Monaco Editor with IntelliSense support for JavaScript, TypeScript, Python, Go, Rust, and more
- **Real-time Collaborative Editing**: Built with Yjs/CRDT protocol for seamless multi-user editing
- **Integrated Terminal**: Full-featured terminal with WebSocket connection for real-time command execution
- **Git Integration**: Complete Git workflow support (clone, commit, push, pull, branches)
- **Package Manager Integration**: Support for npm, pip, cargo, and other package managers
- **Hot Reload & Live Preview**: Instant preview with iframe sandboxing
- **Database GUI**: Management interfaces for PostgreSQL, MySQL, and MongoDB
- **Environment Variables Management**: Secure storage and management of environment variables
- **Custom Domain Mapping**: SSL auto-provisioning with Let's Encrypt
- **Resource Monitoring**: Real-time CPU, RAM, and bandwidth usage tracking

### Security Features
- **Container Sandboxing**: Isolated Docker containers with resource quotas (512MB RAM, 0.5 CPU)
- **Rate Limiting**: Protection on all API endpoints (100 requests per 15 minutes)
- **SQL Injection & XSS Prevention**: Input validation and sanitization
- **API Key Encryption**: Encrypted storage at rest
- **RBAC System**: Role-Based Access Control for fine-grained permissions
- **Audit Logging**: Complete logging of administrative actions

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui components
- Monaco Editor
- Yjs for collaboration
- Socket.IO for WebSockets

**Backend:**
- Node.js/Express
- WebSocket support (Socket.IO)
- JWT authentication

**Databases:**
- PostgreSQL (user data, projects)
- Redis (sessions, caching)
- MongoDB (logs, analytics)

**Storage:**
- S3-compatible storage (AWS S3/MinIO)

**Container Orchestration:**
- Docker
- Kubernetes

## 📋 Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Kubernetes cluster (for production deployment)
- PostgreSQL 15+
- Redis 7+
- MongoDB 6+
- MinIO or S3-compatible storage

## 🚀 Quick Start

### Development with Docker Compose

1. Clone the repository:
```bash
git clone https://github.com/Algodons/algo.git
cd algo
```

2. Copy environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- MinIO Console: http://localhost:9001

### Local Development

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
npm install
npm run dev
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `POSTGRES_*`: PostgreSQL connection settings
- `REDIS_*`: Redis connection settings
- `MONGODB_URI`: MongoDB connection string
- `S3_*`: S3/MinIO storage configuration
- `JWT_SECRET`: Secret key for JWT tokens
- `NEXTAUTH_SECRET`: Secret for NextAuth.js

### Resource Limits

Container resource limits (configurable):
- Memory: 512MB per container
- CPU: 0.5 cores per container
- Process limit: 100 processes

## 🐳 Docker Deployment

Build and run with Docker Compose:

```bash
# Build images
npm run docker:build

# Start services
npm run docker:up

# Stop services
npm run docker:down
```

## ☸️ Kubernetes Deployment

1. Configure your Kubernetes context:
```bash
kubectl config use-context your-cluster
```

2. Deploy to Kubernetes:
```bash
npm run k8s:deploy
```

3. Access the application:
```bash
kubectl get ingress -n algo-ide
```

### Kubernetes Resources

The platform includes the following Kubernetes resources:
- Namespace: `algo-ide`
- Deployments: Frontend (2 replicas), Backend (2 replicas)
- StatefulSets: PostgreSQL, Redis, MongoDB
- Services: LoadBalancer for frontend, ClusterIP for backend
- Ingress: NGINX with SSL/TLS support
- PersistentVolumeClaims: For database storage

## 🔐 Security

### Authentication

The platform uses NextAuth.js with JWT tokens for authentication. Tokens expire after 7 days by default.

### Rate Limiting

API endpoints are protected with rate limiting:
- 100 requests per 15 minutes per IP address
- Configurable via environment variables

### Container Security

All code execution containers are:
- Sandboxed with resource limits
- Running with `no-new-privileges` security option
- Isolated on a bridge network
- Limited to 100 processes

### Data Encryption

- API keys: Encrypted at rest in PostgreSQL
- Passwords: Hashed with bcrypt (10 rounds)
- JWT tokens: Signed with HS256 algorithm

## 📊 Monitoring

Resource monitoring is available through:
- Real-time dashboard for CPU, RAM, and storage
- Container stats API endpoints
- Audit logs for administrative actions

## 🧪 API Documentation

### Authentication Endpoints

**POST /api/auth/register**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Project Endpoints

**GET /api/projects** - List all projects (authenticated)

**POST /api/projects** - Create new project (authenticated)
```json
{
  "name": "My Project",
  "description": "A sample project",
  "language": "javascript"
}
```

**GET /api/projects/:id** - Get project details

**PUT /api/projects/:id** - Update project

**DELETE /api/projects/:id** - Delete project

### Container Endpoints

**POST /api/containers/:projectId/start** - Start container

**POST /api/containers/:projectId/stop** - Stop container

**GET /api/containers/:projectId/stats** - Get container stats

### Git Endpoints

**POST /api/git/clone** - Clone repository

**POST /api/git/commit** - Commit changes

**POST /api/git/push** - Push changes

**GET /api/git/:projectId/branches** - List branches

**POST /api/git/branch** - Create new branch

### File Endpoints

**GET /api/files/:projectId** - List files

**GET /api/files/:projectId/file** - Read file content

**POST /api/files/:projectId/file** - Save file

**DELETE /api/files/:projectId/file** - Delete file

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Monaco Editor by Microsoft
- Yjs for collaborative editing
- shadcn/ui for UI components
- Next.js and React teams

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ by the Algo Team
# Algo - Comprehensive AI Integration Platform

Algo is a powerful platform that integrates various AI models and provides tools for developers to enhance their coding experience.

## Features

### Database Management Platform (NEW!)
- **Multi-Database Support**: PostgreSQL, MySQL, MongoDB, Redis, SQLite, Pinecone, Weaviate
- **Connection Management**: Unified interface with connection pooling and health monitoring
- **Query Execution**: SQL/NoSQL query execution with history tracking and performance metrics
- **Schema Management**: Complete schema introspection, modification, and comparison
- **Migrations**: Version-controlled schema changes with rollback support
- **Import/Export**: CSV, JSON, and SQL format support with compression
- **Backup Automation**: Scheduled backups with point-in-time recovery (PITR)
- **Security**: AES-256 encryption for credentials and connection pooling

📖 **[Full Database Platform Documentation](./DATABASE_PLATFORM.md)**
📚 **[API Reference](./DATABASE_API.md)**

### Built-in AI Features
- **Code Generation**: Generate code from natural language prompts
- **Bug Detection**: Automatically detect bugs and suggest fixes
- **Documentation Generator**: Create documentation for your code
- **Unit Test Auto-Generation**: Generate unit tests automatically
- **Code Review Assistant**: Get best practice suggestions for code reviews
- **SQL Query Converter**: Convert natural language to SQL queries
- **API Endpoint Generator**: Generate API endpoints from descriptions

### Custom Model Integration
- Support for OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), Google (Gemini), and local models
- Secure API key management with encrypted storage
- Usage tracking and cost estimation
- Response caching for cost reduction
- Streaming responses
- Context window optimization
- Model comparison interface

### Agent Builder
- Visual workflow designer for AI agent chains
- Pre-built templates for common agents
- Custom prompt engineering
- Testing playground
- Version control for configurations
- Marketplace for sharing custom agents

### Free Tier Strategy
- Free unlimited usage with your own API keys
- Limited monthly credits for platform models
- Pay-per-use for premium access

## Tech Stack
- Frontend: Next.js with TypeScript
- Backend: Node.js with Express
- Database: MongoDB with Mongoose
- AI Integrations: OpenAI, Anthropic, Google AI
- Payment: Stripe

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run the development server: `npm run dev`

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## Deployment System

Algo includes a comprehensive one-click deployment system for easy application deployment and management.

### Deployment Targets
- **Subdomain Hosting**: Deploy to user.gxqstudio.com with automatic SSL certificates
- **Static Site Deployment**: CDN-backed hosting for static websites
- **Full-Stack Application Hosting**: Containerized deployment for web applications
- **Serverless Function Deployment**: Deploy individual functions or APIs
- **Database Provisioning**: Automatic setup of PostgreSQL, MongoDB, or Redis instances
- **Custom Domain Mapping**: Map custom domains with integrated DNS management

### Automation Features
- **Zero-Config Deployment Detection**: Automatically detect and configure popular frameworks
- **CI/CD Pipeline Builder**: Visual interface to create deployment pipelines
- **GitHub/GitLab Integration**: Auto-deploy on push to specified branches
- **Environment-Based Deployments**: Separate dev, staging, and production environments
- **Automatic Rollback**: Rollback to previous versions on failed deployments
- **Blue-Green Deployment**: Zero-downtime deployments with traffic switching
- **Load Balancer Configuration**: Automatic load balancer setup and management
- **Auto-Scaling Rules**: Horizontal pod autoscaling based on traffic and resource usage

### Monitoring & Logs
- **Real-Time Application Logs**: Filtered logs with search and export capabilities
- **Error Tracking**: Detailed stack traces and error categorization
- **Performance Metrics**: Response time, throughput, and resource utilization
- **Custom Alerts**: Notifications via email, Slack, or webhooks
- **Analytics Dashboard**: Track visits, API calls, and bandwidth usage
- **Uptime Monitoring**: Automatic status page generation and incident tracking

### Getting Started with Deployment

1. Connect your GitHub/GitLab repository
2. Configure your deployment settings
3. Push to your repository to trigger automatic deployment
4. Monitor your application through the dashboard

Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): 2025-12-12 05:05:45
Current User's Login: SMSDAO
