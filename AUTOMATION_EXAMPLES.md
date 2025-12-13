# Automation System Examples

This document provides practical examples of using the Intelligent Automation System.

## Example 1: Auto-Detect and Setup React Project

### Create a sample React project
```bash
mkdir my-react-app
cd my-react-app
npm init -y
npm install react react-dom
npm install -D @types/react @types/react-dom typescript vite
```

### Create package.json with build scripts
```json
{
  "name": "my-react-app",
  "version": "1.0.0",
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
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### Auto-detect the project
```bash
curl -X POST http://localhost:4000/api/automation/detect \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "/workspace/my-react-app"
  }'
```

### Expected Response
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
        "packageManager": "npm",
        "dependencies": ["react", "react-dom", "@types/react", "@types/react-dom", "typescript", "vite"]
      }
    ],
    "commands": {
      "install": ["npm install"],
      "build": ["npm run build"],
      "start": [],
      "test": [],
      "dev": ["npm run dev"]
    },
    "ports": [
      {
        "port": 5173,
        "service": "React",
        "isDefault": true
      }
    ]
  }
}
```

## Example 2: Generate Infrastructure for FastAPI Project

### Sample FastAPI project structure
```
my-fastapi-app/
├── main.py
├── requirements.txt
└── .env
```

### main.py
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### requirements.txt
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
```

### Generate IaC
```bash
curl -X POST http://localhost:4000/api/automation/generate-iac \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "/workspace/my-fastapi-app",
    "domain": "api.example.com",
    "cloudProvider": "digitalocean"
  }'
```

### Response includes:
- **Dockerfile**: Multi-stage Python container optimized for FastAPI
- **Kubernetes manifests**: Deployment, Service, Ingress, ConfigMap, HPA
- **nginx config**: Reverse proxy with SSL
- **Terraform**: DigitalOcean droplet and firewall configuration

## Example 3: Initialize from Template

### Create a new project from template
```bash
curl -X POST http://localhost:4000/api/automation/init-template \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "express-api",
    "targetDir": "/workspace/my-api",
    "customization": {
      "projectName": "my-api",
      "features": ["auth", "validation"],
      "addDatabase": true,
      "databaseType": "postgres",
      "addDocker": true,
      "envVars": {
        "PORT": "3000",
        "DATABASE_URL": "postgresql://localhost:5432/mydb",
        "JWT_SECRET": "your-secret-key"
      }
    }
  }'
```

### This creates a complete Express API project with:
- TypeScript configuration
- Express server setup
- Docker and docker-compose files
- .env file with specified variables
- Basic health check endpoint

## Example 4: Import from GitHub and Setup

### Import a public repository
```bash
curl -X POST http://localhost:4000/api/automation/import-github \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/vercel/next.js/tree/canary/examples/hello-world",
    "targetDir": "/workspace/nextjs-example"
  }'
```

### Then run full setup
```bash
curl -X POST http://localhost:4000/api/automation/setup \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "/workspace/nextjs-example",
    "options": {
      "installDependencies": true,
      "generateIaC": true,
      "domain": "example.com",
      "cloudProvider": "aws"
    }
  }'
```

### This will:
1. Auto-detect the Next.js framework
2. Install all dependencies (npm install)
3. Generate complete infrastructure:
   - Dockerfile optimized for Next.js
   - Kubernetes manifests
   - nginx configuration with SSL
   - AWS Terraform templates

## Example 5: Full Stack MERN Application

### Initialize MERN template
```bash
curl -X POST http://localhost:4000/api/automation/init-template \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "mern-stack",
    "targetDir": "/workspace/mern-app",
    "customization": {
      "projectName": "mern-app",
      "features": ["auth", "api", "database"],
      "addDatabase": true,
      "databaseType": "mongodb",
      "addTesting": true,
      "addDocker": true,
      "envVars": {
        "MONGO_URI": "mongodb://localhost:27017/mernapp",
        "JWT_SECRET": "your-jwt-secret",
        "NODE_ENV": "development"
      }
    }
  }'
```

## Example 6: Server Setup Script

### One-command server setup
```bash
# On a fresh Ubuntu/Debian/CentOS server
curl -fsSL https://install.gxqstudio.com | bash
```

### This installs:
- Docker and Docker Compose
- Node.js (via nvm)
- Python 3
- nginx
- certbot (for SSL certificates)
- Essential development tools
- Configures firewall (ports 22, 80, 443)

### After installation, deploy your app:
```bash
# Clone your repo
git clone https://github.com/yourusername/your-app.git
cd your-app

# Auto-detect and install dependencies
curl -X POST http://localhost:4000/api/automation/install \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/root/your-app"}'

# Generate and apply nginx config
curl -X POST http://localhost:4000/api/automation/generate-iac \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "/root/your-app",
    "domain": "yourdomain.com"
  }' | jq -r '.data.nginx' > /etc/nginx/sites-available/your-app

# Enable site
ln -s /etc/nginx/sites-available/your-app /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com
```

## Example 7: Multi-Service Application with Docker Compose

### Generate infrastructure for microservices
```bash
# API Service
curl -X POST http://localhost:4000/api/automation/generate-iac \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "/workspace/api-service",
    "domain": "api.example.com"
  }' | jq -r '.data.dockerfile' > api-service/Dockerfile

# Frontend Service
curl -X POST http://localhost:4000/api/automation/generate-iac \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "/workspace/frontend",
    "domain": "example.com"
  }' | jq -r '.data.dockerfile' > frontend/Dockerfile
```

### Create docker-compose.yml
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://api:4000
    depends_on:
      - api
  
  api:
    build: ./api-service
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://db:5432/mydb
    depends_on:
      - db
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

## Example 8: Kubernetes Deployment

### Generate Kubernetes manifests
```bash
curl -X POST http://localhost:4000/api/automation/generate-iac \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "/workspace/my-app",
    "domain": "app.example.com"
  }' > k8s-manifests.json
```

### Extract and apply manifests
```bash
# Extract deployment
jq -r '.data.kubernetes.deployment' k8s-manifests.json > deployment.yaml
kubectl apply -f deployment.yaml

# Extract service
jq -r '.data.kubernetes.service' k8s-manifests.json > service.yaml
kubectl apply -f service.yaml

# Extract ingress
jq -r '.data.kubernetes.ingress' k8s-manifests.json > ingress.yaml
kubectl apply -f ingress.yaml

# Extract HPA
jq -r '.data.kubernetes.hpa' k8s-manifests.json > hpa.yaml
kubectl apply -f hpa.yaml
```

## Example 9: Environment Variable Detection

### Project with environment variables
```javascript
// src/config.js
const config = {
  port: process.env.PORT || 3000,
  database: process.env.DATABASE_URL,
  apiKey: process.env.API_KEY,
  jwtSecret: process.env.JWT_SECRET,
  redisUrl: process.env.REDIS_URL,
};
```

### Auto-detect will find:
- PORT
- DATABASE_URL
- API_KEY
- JWT_SECRET
- REDIS_URL

### These are automatically included in:
- Generated .env.example files
- Kubernetes ConfigMap templates
- Docker environment configuration

## Example 10: Progressive Migration

### Start with manual setup
```bash
# Create project manually
mkdir my-project
cd my-project
npm init -y
npm install express
```

### Use automation for infrastructure
```bash
# Generate Dockerfile
curl -X POST http://localhost:4000/api/automation/generate-iac \
  -H "Content-Type: application/json" \
  -d '{"projectPath": "/workspace/my-project"}' \
  | jq -r '.data.dockerfile' > Dockerfile

# Build and run
docker build -t my-project .
docker run -p 3000:3000 my-project
```

### Add Kubernetes later
```bash
# Generate K8s manifests
curl -X POST http://localhost:4000/api/automation/generate-iac \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "/workspace/my-project",
    "domain": "myproject.com"
  }' | jq '.data.kubernetes' > k8s/

# Deploy
kubectl apply -f k8s/
```

## Best Practices

1. **Start Simple**: Use auto-detect first to understand your project
2. **Incremental Adoption**: Generate one piece of infrastructure at a time
3. **Review Generated Code**: Always review Dockerfiles and configs before production
4. **Test Locally**: Test Docker and docker-compose setups locally first
5. **Version Control**: Commit generated infrastructure to version control
6. **Environment Variables**: Use .env files for local development, secrets management for production
7. **Security**: Update generated configs with your specific security requirements
8. **Monitoring**: Add your monitoring and logging solutions to generated configs

## Troubleshooting

### Issue: Auto-detect doesn't find my framework
**Solution**: Ensure your configuration files (package.json, requirements.txt, etc.) are in the project root

### Issue: Generated Dockerfile is too large
**Solution**: The generator creates multi-stage builds. You can further optimize by:
- Adding more specific .dockerignore rules
- Using alpine base images (already default)
- Removing unnecessary build dependencies

### Issue: Kubernetes deployment fails
**Solution**: Check:
- Image is pushed to registry
- Secrets and ConfigMaps are created
- Ingress controller is installed
- DNS is configured

### Issue: Port conflicts
**Solution**: The system detects ports from config files and defaults. You can override:
- In generated docker-compose.yml
- In Kubernetes service definitions
- In nginx configuration

## Next Steps

1. Explore the [API Documentation](./AUTOMATION_SYSTEM.md)
2. Check out the [Templates Directory](./templates/README.md)
3. Try the [Server Setup Script](./scripts/install.sh)
4. Read about [Security Best Practices](./SECURITY.md)
