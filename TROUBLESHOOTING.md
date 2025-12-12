# Troubleshooting Guide

This guide helps you resolve common issues with Algo Cloud IDE.

## Table of Contents
- [Installation Issues](#installation-issues)
- [Docker Issues](#docker-issues)
- [Database Connection Issues](#database-connection-issues)
- [Frontend Issues](#frontend-issues)
- [Backend Issues](#backend-issues)
- [Authentication Issues](#authentication-issues)
- [Container Execution Issues](#container-execution-issues)
- [Performance Issues](#performance-issues)

## Installation Issues

### npm install fails

**Problem:** Dependencies fail to install

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
rm -rf backend/node_modules backend/package-lock.json

# Reinstall
npm install
cd frontend && npm install
cd ../backend && npm install
```

### Permission denied errors

**Problem:** Permission errors during installation

**Solution:**
```bash
# Fix permissions
sudo chown -R $USER:$USER .

# Or use sudo (not recommended)
sudo npm install
```

## Docker Issues

### Docker containers won't start

**Problem:** `docker-compose up` fails

**Solution:**
```bash
# Check Docker daemon
sudo systemctl status docker

# Start Docker daemon
sudo systemctl start docker

# Check logs
docker-compose logs

# Restart containers
docker-compose down
docker-compose up -d
```

### Port already in use

**Problem:** `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solution:**
```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Out of disk space

**Problem:** Docker runs out of disk space

**Solution:**
```bash
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune

# Check disk usage
docker system df
```

## Database Connection Issues

### PostgreSQL connection refused

**Problem:** Cannot connect to PostgreSQL

**Solution:**
```bash
# Check if PostgreSQL container is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Test connection
docker-compose exec postgres psql -U algo_user -d algo_ide
```

### Redis connection issues

**Problem:** Cannot connect to Redis

**Solution:**
```bash
# Check Redis container
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping

# Check password
docker-compose exec redis redis-cli -a your_password ping
```

### MongoDB connection issues

**Problem:** Cannot connect to MongoDB

**Solution:**
```bash
# Check MongoDB container
docker-compose ps mongodb

# Test connection
docker-compose exec mongodb mongosh

# Check logs
docker-compose logs mongodb
```

## Frontend Issues

### Page not loading

**Problem:** Frontend shows blank page or errors

**Solution:**
```bash
# Check browser console for errors
# Check if backend is running

# Rebuild frontend
cd frontend
rm -rf .next
npm run build
npm run dev
```

### Module not found errors

**Problem:** Import errors in frontend

**Solution:**
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### Hot reload not working

**Problem:** Changes don't reflect immediately

**Solution:**
```bash
# Check file watching limits (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Restart dev server
```

## Backend Issues

### API endpoints not responding

**Problem:** Backend API returns errors

**Solution:**
```bash
# Check backend logs
cd backend
npm run dev

# Check environment variables
cat .env

# Test API endpoint
curl http://localhost:4000/health
```

### WebSocket connection fails

**Problem:** Terminal or collaboration doesn't work

**Solution:**
```bash
# Check WebSocket URL in frontend/.env
# Ensure NEXT_PUBLIC_WS_URL is correct

# Check backend WebSocket server
# Look for "WebSocket server initialized" in logs
```

## Authentication Issues

### Cannot login

**Problem:** Login fails with valid credentials

**Solution:**
```bash
# Check backend logs for errors
docker-compose logs backend

# Verify user exists in database
docker-compose exec postgres psql -U algo_user -d algo_ide \
  -c "SELECT email FROM users;"

# Check JWT secret is set
echo $JWT_SECRET
```

### Session expires immediately

**Problem:** User gets logged out immediately

**Solution:**
```bash
# Check Redis is running
docker-compose ps redis

# Verify NEXTAUTH_SECRET is set
# Check session expiration settings
```

## Container Execution Issues

### Code execution fails

**Problem:** Running code in containers doesn't work

**Solution:**
```bash
# Check Docker socket is accessible
ls -la /var/run/docker.sock

# Grant permissions
sudo chmod 666 /var/run/docker.sock

# Check Docker service
sudo systemctl status docker
```

### Container resource limits

**Problem:** Containers are killed or slow

**Solution:**
```bash
# Check container resources
docker stats

# Increase limits in backend/src/services/docker.js
# Memory: 512MB -> 1024MB
# CPU: 0.5 -> 1.0
```

## Performance Issues

### Slow page loads

**Problem:** Application is slow

**Solution:**
```bash
# Check resource usage
docker stats

# Check database query performance
# Add indexes to frequently queried fields

# Enable Redis caching
# Optimize bundle size
```

### High memory usage

**Problem:** System runs out of memory

**Solution:**
```bash
# Check memory usage
free -h
docker stats

# Reduce container replicas
# Increase system RAM
# Add swap space
```

### Database slow queries

**Problem:** Database queries are slow

**Solution:**
```sql
-- Check slow queries (PostgreSQL)
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add missing indexes
CREATE INDEX idx_name ON table_name(column_name);

-- Analyze tables
ANALYZE table_name;
```

## Network Issues

### Cannot access from other devices

**Problem:** Can't access IDE from network

**Solution:**
```bash
# Bind to all interfaces
# In docker-compose.yml, change:
# ports:
#   - "0.0.0.0:3000:3000"

# Check firewall
sudo ufw status
sudo ufw allow 3000
```

### SSL certificate errors

**Problem:** HTTPS certificate issues

**Solution:**
```bash
# Check certificate expiration
openssl x509 -in cert.pem -noout -dates

# Renew Let's Encrypt certificate
certbot renew

# Check ingress configuration
kubectl get ingress -n algo-ide
```

## Logs and Debugging

### Enable debug logging

```bash
# Backend
LOG_LEVEL=debug npm run dev

# Frontend
DEBUG=* npm run dev
```

### View all logs

```bash
# Docker Compose logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Kubernetes logs
kubectl logs -f deployment/backend -n algo-ide
```

### Export logs

```bash
# Export to file
docker-compose logs > logs.txt

# Export specific service
docker-compose logs backend > backend-logs.txt
```

## Getting Help

If you can't resolve your issue:

1. **Check documentation**: Review README.md and other docs
2. **Search issues**: Look for similar issues on GitHub
3. **Create issue**: Open a new issue with:
   - Detailed description
   - Steps to reproduce
   - Error messages
   - Environment details
   - Logs

## Common Error Messages

### "EADDRINUSE: address already in use"
Port conflict - change port or kill process using it

### "ECONNREFUSED"
Service not running - start the service

### "Cannot find module"
Missing dependency - run `npm install`

### "Permission denied"
Permissions issue - check file/directory permissions

### "Out of memory"
Insufficient RAM - increase memory or optimize

### "Connection timeout"
Network issue - check firewall and network settings

---

Last updated: December 2024

For more help, visit our [GitHub Issues](https://github.com/Algodons/algo/issues)
