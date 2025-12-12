# Deployment Guide

## Table of Contents
1. [Development Setup](#development-setup)
2. [Production Deployment](#production-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Platform Deployment](#cloud-platform-deployment)
5. [Troubleshooting](#troubleshooting)

## Development Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Git
- (Optional) Docker and Docker Compose

### Step-by-Step Setup

1. **Clone the Repository**
```bash
git clone https://github.com/Algodons/algo.git
cd algo
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
```bash
cp .env.example .env
```

Edit `.env` file:
```env
PORT=5000
WORKSPACE_DIR=./workspaces
```

4. **Start Development Servers**
```bash
npm run dev
```

This starts:
- Frontend (Vite): http://localhost:3000
- Backend (Express): http://localhost:5000

### Development Workflow

- **Hot Reload**: Both frontend and backend support hot reload
- **TypeScript**: Type checking happens during build
- **Terminal**: WebSocket connects to backend terminal server
- **Editor**: Yjs provides collaborative editing via WebSocket

## Production Deployment

### Build for Production

1. **Build the Application**
```bash
npm run build
```

This creates:
- `dist/client/` - Frontend static files
- `dist/server/` - Compiled backend code

2. **Start Production Server**
```bash
npm start
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
WORKSPACE_DIR=/var/lib/cloud-ide/workspaces

# Optional: Database connections
POSTGRES_HOST=your-db-host
POSTGRES_PORT=5432
POSTGRES_DB=mydb
POSTGRES_USER=user
POSTGRES_PASSWORD=secure_password

MYSQL_HOST=your-db-host
MYSQL_PORT=3306
MYSQL_DB=mydb
MYSQL_USER=user
MYSQL_PASSWORD=secure_password

MONGODB_URI=mongodb://user:password@host:27017
MONGODB_DB=mydb
```

### Nginx Configuration

For production, use Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /path/to/algo/dist/client;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket connections
    location /yjs {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    location /terminal {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### PM2 Process Manager

Use PM2 for process management:

```bash
npm install -g pm2

# Start application
pm2 start dist/server/index.js --name cloud-ide

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Start all services**
```bash
docker-compose up -d
```

Services included:
- Cloud IDE application (ports 3000, 5000)
- PostgreSQL (port 5432)
- MySQL (port 3306)
- MongoDB (port 27017)

2. **View logs**
```bash
docker-compose logs -f app
```

3. **Stop services**
```bash
docker-compose down
```

### Using Docker Only

1. **Build image**
```bash
docker build -t cloud-ide .
```

2. **Run container**
```bash
docker run -d \
  -p 3000:3000 \
  -p 5000:5000 \
  -v $(pwd)/workspaces:/app/workspaces \
  --name cloud-ide \
  cloud-ide
```

## Cloud Platform Deployment

### AWS (EC2 + RDS)

1. **Launch EC2 instance** (t3.medium or larger)
2. **Install dependencies**
```bash
sudo apt update
sudo apt install -y nodejs npm git nginx
```

3. **Clone and build**
```bash
git clone https://github.com/Algodons/algo.git
cd algo
npm install
npm run build
```

4. **Configure RDS** for PostgreSQL/MySQL
5. **Setup Nginx** (see configuration above)
6. **Use PM2** for process management

### Heroku

1. **Create app**
```bash
heroku create your-cloud-ide
```

2. **Add buildpack**
```bash
heroku buildpacks:add heroku/nodejs
```

3. **Configure environment**
```bash
heroku config:set NODE_ENV=production
```

4. **Deploy**
```bash
git push heroku main
```

### DigitalOcean

1. **Create Droplet** (2GB RAM minimum)
2. **Use Docker Compose** method (recommended)
3. **Configure domain** and SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Kubernetes

See `k8s/` directory for Kubernetes manifests (if provided).

## Troubleshooting

### Common Issues

**1. WebSocket Connection Failed**
- Check if backend is running on correct port
- Verify no firewall blocking WebSocket connections
- Ensure Nginx WebSocket proxy is configured

**2. Terminal Not Working**
- Ensure node-pty is properly installed
- Check platform compatibility (Windows/Linux/Mac)
- Verify shell path in terminal-server.ts

**3. Yjs Sync Issues**
- Check WebSocket connection to /yjs endpoint
- Verify document names are correct
- Check browser console for errors

**4. Database Connection Failed**
- Verify database credentials
- Check network connectivity
- Ensure database server is running

**5. Build Errors**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version: `node -v` (should be 18+)
- Verify TypeScript is installed

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

### Health Check

Check if services are running:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Performance Optimization

### Production Tips

1. **Enable compression**
```javascript
// In server/index.ts
import compression from 'compression';
app.use(compression());
```

2. **Use CDN** for static assets
3. **Enable caching** for API responses
4. **Monitor with PM2**
```bash
pm2 monit
```

5. **Database connection pooling**
- Configure max connections in database clients

## Security Considerations

1. **Enable HTTPS** in production
2. **Set CORS** appropriately
3. **Validate all inputs**
4. **Use environment variables** for secrets
5. **Regular security updates**
```bash
npm audit
npm audit fix
```

## Scaling

### Horizontal Scaling
- Use Redis for session storage
- Implement sticky sessions for WebSocket
- Use load balancer (Nginx/HAProxy)

### Vertical Scaling
- Increase server resources (CPU/RAM)
- Optimize database queries
- Use caching (Redis/Memcached)

## Monitoring

Recommended tools:
- **PM2**: Process monitoring
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Sentry**: Error tracking

## Backup

Important directories to backup:
- `workspaces/` - User workspaces
- Database backups
- Configuration files

## Support

For issues and questions:
- GitHub Issues: https://github.com/Algodons/algo/issues
- Documentation: See README.md
