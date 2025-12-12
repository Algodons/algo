# Production Deployment Guide

This guide covers deploying the Algo Cloud IDE platform to production environments.

## Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- Docker registry access
- Domain name with DNS access
- SSL certificates or cert-manager

## Step 1: Prepare Container Images

### Build and Tag Images

```bash
# Build frontend
cd frontend
docker build -t your-registry.com/algo-frontend:v1.0.0 .
docker push your-registry.com/algo-frontend:v1.0.0

# Build backend
cd ../backend
docker build -t your-registry.com/algo-backend:v1.0.0 .
docker push your-registry.com/algo-backend:v1.0.0
```

## Step 2: Configure Kubernetes

### Update Image References

Edit `k8s/frontend.yaml` and `k8s/backend.yaml` to use your registry:

```yaml
spec:
  containers:
  - name: frontend
    image: your-registry.com/algo-frontend:v1.0.0
```

### Update Secrets

Edit `k8s/secrets.yaml` with production values:

```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For NEXTAUTH_SECRET
```

### Update Ingress

Edit `k8s/ingress.yaml` with your domain:

```yaml
spec:
  rules:
  - host: your-domain.com
```

## Step 3: Set Up cert-manager (SSL)

### Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Create ClusterIssuer

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

## Step 4: Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Wait for deployments
kubectl wait --for=condition=available --timeout=600s \
  deployment/frontend deployment/backend -n algo-ide

# Check status
kubectl get pods -n algo-ide
kubectl get ingress -n algo-ide
```

## Step 5: Configure DNS

Point your domain to the LoadBalancer IP:

```bash
# Get LoadBalancer IP
kubectl get ingress -n algo-ide

# Add A record in your DNS provider:
# A record: your-domain.com -> LoadBalancer-IP
```

## Step 6: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n algo-ide

# Check logs
kubectl logs -f deployment/frontend -n algo-ide
kubectl logs -f deployment/backend -n algo-ide

# Test endpoints
curl https://your-domain.com/health
```

## Scaling

### Horizontal Scaling

```bash
# Scale frontend
kubectl scale deployment/frontend --replicas=5 -n algo-ide

# Scale backend
kubectl scale deployment/backend --replicas=3 -n algo-ide
```

### Vertical Scaling

Edit resource limits in deployment manifests:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Monitoring

### Set Up Prometheus & Grafana

```bash
# Install Prometheus operator
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml

# Create ServiceMonitor
kubectl apply -f k8s/monitoring/
```

### View Metrics

```bash
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# Access: http://localhost:9090

kubectl port-forward svc/grafana 3001:3000 -n monitoring
# Access: http://localhost:3001
```

## Backup & Recovery

### Database Backups

```bash
# Backup PostgreSQL
kubectl exec -n algo-ide postgres-0 -- pg_dump -U algo_user algo_ide > backup.sql

# Restore PostgreSQL
kubectl exec -i -n algo-ide postgres-0 -- psql -U algo_user algo_ide < backup.sql
```

### Storage Backups

Configure S3 bucket versioning and lifecycle policies:

```bash
aws s3api put-bucket-versioning \
  --bucket algo-projects \
  --versioning-configuration Status=Enabled
```

## Security Hardening

### Network Policies

```bash
kubectl apply -f k8s/security/network-policies.yaml
```

### Pod Security Policies

```bash
kubectl apply -f k8s/security/pod-security-policies.yaml
```

### Secrets Management

Consider using external secrets management:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault

## Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod <pod-name> -n algo-ide
kubectl logs <pod-name> -n algo-ide
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
kubectl exec -it postgres-0 -n algo-ide -- psql -U algo_user -d algo_ide

# Test Redis connection
kubectl exec -it redis-0 -n algo-ide -- redis-cli
```

### Ingress Issues

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress logs
kubectl logs -n ingress-nginx <ingress-controller-pod>
```

## Performance Optimization

### Enable Caching

Configure Redis caching for API responses:

```javascript
// In backend configuration
app.use(cacheMiddleware({
  ttl: 300, // 5 minutes
  redis: redisClient
}));
```

### CDN Integration

Configure CloudFlare or AWS CloudFront for static assets:

```yaml
# In frontend deployment
env:
- name: NEXT_PUBLIC_CDN_URL
  value: https://cdn.your-domain.com
```

## Updates & Rollbacks

### Rolling Update

```bash
# Update frontend
kubectl set image deployment/frontend \
  frontend=your-registry.com/algo-frontend:v1.1.0 -n algo-ide

# Monitor rollout
kubectl rollout status deployment/frontend -n algo-ide
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/frontend -n algo-ide

# Rollback to specific revision
kubectl rollout undo deployment/frontend --to-revision=2 -n algo-ide
```

## Maintenance Windows

### Planned Downtime

```bash
# Drain nodes
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Perform maintenance

# Uncordon nodes
kubectl uncordon <node-name>
```

## Cost Optimization

1. **Right-size resources**: Monitor actual usage and adjust limits
2. **Use node autoscaling**: Enable cluster autoscaler
3. **Schedule non-critical workloads**: Use lower-cost instances for dev/test
4. **Implement resource quotas**: Prevent resource sprawl

## Compliance & Auditing

### Enable Audit Logging

```yaml
# In backend configuration
auditLog:
  enabled: true
  level: metadata
  destination: /var/log/audit/audit.log
```

### GDPR Compliance

- Implement data deletion endpoints
- Add data export functionality
- Document data retention policies

## Support & Escalation

For production issues:
1. Check monitoring dashboards
2. Review application logs
3. Check system metrics
4. Contact DevOps team
5. Escalate to development team if needed

---

Last updated: December 2024
