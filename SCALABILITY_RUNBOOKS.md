# Scalability Operations Runbooks

Operational procedures for managing the scalability infrastructure.

## Table of Contents

- [Cache Management](#cache-management)
- [Load Balancer Operations](#load-balancer-operations)
- [Auto-Scaling Operations](#auto-scaling-operations)
- [Resource Management](#resource-management)
- [Project Suspension](#project-suspension)
- [Incident Response](#incident-response)

## Cache Management

### Clear All Caches

**When to use**: After critical data updates, cache corruption, or system issues.

```bash
# Using API
curl -X POST https://api.example.com/api/cache/clear \
  -H "Authorization: Bearer $TOKEN"

# Using Redis CLI
redis-cli -h redis.example.com -a $REDIS_PASSWORD FLUSHDB
```

**Impact**: Temporary performance degradation (1-5 minutes).

### Invalidate Specific Cache Pattern

**When to use**: After updating specific data (users, projects, etc.).

```bash
# Invalidate user cache
curl -X POST https://api.example.com/api/cache/invalidate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "user:123:*"}'

# Invalidate project cache
curl -X POST https://api.example.com/api/cache/invalidate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "project:abc:*"}'
```

### Check Cache Statistics

```bash
# Get cache stats
curl https://api.example.com/api/cache/stats \
  -H "Authorization: Bearer $TOKEN"

# Redis stats
redis-cli -h redis.example.com -a $REDIS_PASSWORD INFO stats
```

**Key metrics to monitor**:
- Hit rate (should be > 80%)
- Memory usage (should be < 90%)
- Evicted keys (should be low)

### Redis Maintenance

#### Backup Redis Data

```bash
# Manual backup
redis-cli -h redis.example.com -a $REDIS_PASSWORD BGSAVE

# Check last save time
redis-cli -h redis.example.com -a $REDIS_PASSWORD LASTSAVE

# Copy RDB file
kubectl cp algo-ide/redis-pod-name:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

#### Restore Redis Data

```bash
# Stop Redis
kubectl scale deployment redis --replicas=0 -n algo-ide

# Copy backup to pod
kubectl cp ./redis-backup.rdb algo-ide/redis-pod-name:/data/dump.rdb

# Start Redis
kubectl scale deployment redis --replicas=1 -n algo-ide
```

#### Monitor Redis Memory

```bash
# Check memory usage
redis-cli -h redis.example.com -a $REDIS_PASSWORD INFO memory

# Check keys by pattern
redis-cli -h redis.example.com -a $REDIS_PASSWORD --scan --pattern "sess:*" | wc -l
```

**Action if memory > 90%**:
1. Clear old sessions: `redis-cli --scan --pattern "sess:*" | xargs redis-cli DEL`
2. Increase max memory: Update redis deployment
3. Review cache TTLs

## Load Balancer Operations

### Check Backend Health

```bash
# List all backends with health status
kubectl get pods -n algo-ide -l app=backend -o wide

# Check specific backend
curl https://backend-1.example.com/health
```

### Drain Backend for Maintenance

**When to use**: Before updating or removing a backend instance.

```bash
# Mark backend as draining (NGINX)
# Edit nginx config to set weight=0
kubectl edit configmap nginx-config -n algo-ide

# Wait for connections to drain (5 minutes)
watch -n 5 'curl -s http://nginx/status | grep active'

# Stop backend
kubectl scale deployment backend --replicas=2 -n algo-ide
```

### Add New Backend Instance

```bash
# Scale up deployment
kubectl scale deployment backend --replicas=4 -n algo-ide

# Verify health
kubectl get pods -n algo-ide -l app=backend

# Check load balancer config
kubectl describe service backend -n algo-ide
```

### Remove Unhealthy Backend

**Automatic**: Health checks remove unhealthy backends automatically.

**Manual removal**:
```bash
# Identify unhealthy pod
kubectl get pods -n algo-ide -l app=backend

# Delete pod (will be recreated)
kubectl delete pod backend-unhealthy-pod -n algo-ide

# Force remove from service
kubectl patch endpoints backend -n algo-ide --type='json' \
  -p='[{"op": "remove", "path": "/subsets/0/addresses/0"}]'
```

### Monitor Load Distribution

```bash
# Check request distribution
kubectl logs -n algo-ide -l app=nginx --tail=100 | grep backend

# Get backend metrics
kubectl top pods -n algo-ide -l app=backend

# View service endpoints
kubectl get endpoints backend -n algo-ide -o yaml
```

## Auto-Scaling Operations

### Check Current Scale

```bash
# View HPA status
kubectl get hpa -n algo-ide

# Detailed HPA info
kubectl describe hpa backend-hpa -n algo-ide

# Current pod count
kubectl get deployment backend -n algo-ide
```

### Manually Scale

**When to use**: During maintenance, load testing, or incidents.

```bash
# Scale to specific count
kubectl scale deployment backend --replicas=5 -n algo-ide

# Disable HPA temporarily
kubectl patch hpa backend-hpa -n algo-ide -p '{"spec":{"minReplicas":5,"maxReplicas":5}}'

# Re-enable HPA
kubectl patch hpa backend-hpa -n algo-ide -p '{"spec":{"minReplicas":2,"maxReplicas":20}}'
```

### Adjust Scaling Thresholds

**When to use**: After observing scaling patterns, during traffic changes.

```bash
# Edit HPA
kubectl edit hpa backend-hpa -n algo-ide

# Change CPU target from 70% to 60%
# spec:
#   metrics:
#   - type: Resource
#     resource:
#       name: cpu
#       target:
#         type: Utilization
#         averageUtilization: 60
```

### Monitor Scaling Events

```bash
# View recent scaling events
kubectl describe hpa backend-hpa -n algo-ide | grep -A 10 "Events:"

# Watch HPA in real-time
kubectl get hpa backend-hpa -n algo-ide --watch

# View pod events
kubectl get events -n algo-ide --sort-by='.lastTimestamp' | grep backend
```

### Disable Auto-Scaling

**When to use**: During maintenance, debugging, or cost control.

```bash
# Delete HPA
kubectl delete hpa backend-hpa -n algo-ide

# Scale to desired count
kubectl scale deployment backend --replicas=3 -n algo-ide
```

### Re-enable Auto-Scaling

```bash
# Re-apply HPA
kubectl apply -f k8s/backend.yaml -n algo-ide

# Verify HPA is active
kubectl get hpa backend-hpa -n algo-ide
```

## Resource Management

### Check Resource Usage

```bash
# Node resource usage
kubectl top nodes

# Pod resource usage
kubectl top pods -n algo-ide

# Namespace resource usage
kubectl describe resourcequota -n algo-ide
```

### Identify Resource-Hungry Pods

```bash
# Sort by CPU
kubectl top pods -n algo-ide --sort-by=cpu

# Sort by memory
kubectl top pods -n algo-ide --sort-by=memory

# Pods exceeding limits
kubectl get pods -n algo-ide -o json | \
  jq '.items[] | select(.status.containerStatuses[].restartCount > 0) | .metadata.name'
```

### Handle OOM Kills

**Symptoms**: Pods restarting frequently, OOM events in logs.

```bash
# Check for OOM kills
kubectl describe pod backend-pod -n algo-ide | grep -i oom

# View pod events
kubectl get events -n algo-ide | grep -i oom

# Check logs before crash
kubectl logs backend-pod -n algo-ide --previous
```

**Resolution**:
1. Identify memory usage pattern
2. Increase memory limits in deployment
3. Investigate memory leaks if persistent

```bash
# Edit deployment
kubectl edit deployment backend -n algo-ide

# Update memory limits
# resources:
#   limits:
#     memory: "2Gi"  # Increased from 1Gi
```

### Update Resource Limits

**When to use**: After identifying resource needs, during optimization.

```bash
# Edit deployment
kubectl edit deployment backend -n algo-ide

# Or apply updated YAML
kubectl apply -f k8s/backend.yaml -n algo-ide

# Rolling update will restart pods
kubectl rollout status deployment backend -n algo-ide
```

### Check VPA Recommendations

```bash
# Get VPA recommendations
kubectl describe vpa backend-vpa -n algo-ide

# View recommended resources
kubectl get vpa backend-vpa -n algo-ide -o jsonpath='{.status.recommendation}'

# Apply VPA recommendations (if updateMode is "Auto", happens automatically)
```

### Monitor Spot Instance Usage

```bash
# Check spot instance nodes
kubectl get nodes -l node.kubernetes.io/instance-type=spot

# Check pods on spot instances
kubectl get pods -n algo-ide -o wide | grep spot-node

# Monitor interruption signals
kubectl get events -n algo-ide | grep -i "spot\|interrupt"
```

### Handle Spot Interruption

**Automatic**: System handles gracefully with 2-minute warning.

**Manual intervention**:
```bash
# Check pods being evicted
kubectl get pods -n algo-ide | grep Evicted

# Force reschedule on on-demand nodes
kubectl cordon spot-node-name
kubectl drain spot-node-name --ignore-daemonsets --delete-emptydir-data
```

## Project Suspension

### View Suspension Statistics

```bash
# Get overall stats
curl https://api.example.com/api/suspension/stats \
  -H "Authorization: Bearer $TOKEN"

# Query database
psql -h db.example.com -U algo_user -d algo_ide -c \
  "SELECT * FROM suspension_statistics;"
```

### List Projects at Risk

```bash
# Projects within 7 days of suspension
psql -h db.example.com -U algo_user -d algo_ide -c \
  "SELECT * FROM projects_at_risk;"
```

### Manually Suspend Project

**When to use**: Emergency resource freeing, policy violations.

```bash
# Via API
curl -X POST https://api.example.com/api/admin/projects/:projectId/suspend \
  -H "Authorization: Bearer $TOKEN"

# Via database
psql -h db.example.com -U algo_user -d algo_ide -c \
  "UPDATE projects SET status = 'suspended', suspended_at = NOW() 
   WHERE id = 'project-id';"
```

### Wake Up Suspended Project

```bash
# Via API
curl -X POST https://api.example.com/api/projects/:projectId/wake \
  -H "Authorization: Bearer $TOKEN"

# Check wake status
curl https://api.example.com/api/projects/:projectId/status \
  -H "Authorization: Bearer $TOKEN"
```

### Bulk Wake Projects

**When to use**: After system maintenance, bulk operations.

```bash
# Get suspended projects
PROJECTS=$(psql -h db.example.com -U algo_user -d algo_ide -t -c \
  "SELECT id FROM projects WHERE status = 'suspended' LIMIT 10;")

# Wake each project
for project in $PROJECTS; do
  curl -X POST https://api.example.com/api/projects/$project/wake \
    -H "Authorization: Bearer $TOKEN"
done
```

### Clear Suspension Notifications

```bash
# Clear all notifications for a project
psql -h db.example.com -U algo_user -d algo_ide -c \
  "DELETE FROM project_notifications WHERE project_id = 'project-id';"

# Clear old notifications (> 90 days)
psql -h db.example.com -U algo_user -d algo_ide -c \
  "DELETE FROM project_notifications WHERE sent_at < NOW() - INTERVAL '90 days';"
```

## Incident Response

### High Cache Miss Rate

**Symptoms**: Cache hit rate < 70%, slow API responses.

**Investigation**:
```bash
# Check cache stats
curl https://api.example.com/api/cache/stats

# Check Redis memory
redis-cli -h redis.example.com -a $REDIS_PASSWORD INFO memory

# Review cache keys
redis-cli -h redis.example.com -a $REDIS_PASSWORD KEYS "api:*" | head -20
```

**Resolution**:
1. Check if cache was recently cleared
2. Review TTL settings (may be too short)
3. Check for cache key generation issues
4. Increase cache memory if needed

### Backend Overload

**Symptoms**: High CPU/memory, slow responses, timeouts.

**Investigation**:
```bash
# Check pod resource usage
kubectl top pods -n algo-ide -l app=backend

# Check HPA status
kubectl get hpa backend-hpa -n algo-ide

# View recent logs
kubectl logs -n algo-ide -l app=backend --tail=100
```

**Resolution**:
1. Manually scale up: `kubectl scale deployment backend --replicas=10 -n algo-ide`
2. Check for long-running queries
3. Review application code for issues
4. Clear cache if needed

### Scaling Thrashing

**Symptoms**: Frequent scale up/down events, unstable pod count.

**Investigation**:
```bash
# View scaling events
kubectl describe hpa backend-hpa -n algo-ide | grep -A 20 "Events:"

# Check metric values
kubectl get hpa backend-hpa -n algo-ide -o yaml
```

**Resolution**:
1. Increase cooldown periods
2. Adjust threshold values
3. Increase stabilization window
4. Use target tracking instead of step scaling

### Database Connection Exhaustion

**Symptoms**: Connection errors, "too many clients" errors.

**Investigation**:
```bash
# Check active connections
psql -h db.example.com -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check connection limit
psql -h db.example.com -U postgres -c \
  "SHOW max_connections;"

# Check by application
psql -h db.example.com -U postgres -c \
  "SELECT application_name, count(*) FROM pg_stat_activity 
   GROUP BY application_name;"
```

**Resolution**:
1. Kill idle connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';`
2. Increase connection pool size
3. Implement connection pooling (PgBouncer)
4. Scale database if needed

### Redis Out of Memory

**Symptoms**: OOM errors, evictions, connection timeouts.

**Investigation**:
```bash
# Check memory usage
redis-cli -h redis.example.com -a $REDIS_PASSWORD INFO memory

# Check eviction stats
redis-cli -h redis.example.com -a $REDIS_PASSWORD INFO stats | grep evicted

# Check largest keys
redis-cli -h redis.example.com -a $REDIS_PASSWORD --bigkeys
```

**Resolution**:
1. Clear old sessions: `redis-cli --scan --pattern "sess:*" | xargs redis-cli DEL`
2. Reduce TTLs if too long
3. Increase Redis memory limits
4. Enable LRU eviction policy

### Mass Project Suspensions

**Symptoms**: Many projects suspended unexpectedly.

**Investigation**:
```bash
# Check suspension service logs
kubectl logs -n algo-ide -l app=suspension-service

# Check suspended projects
psql -h db.example.com -U algo_user -d algo_ide -c \
  "SELECT count(*), suspended_at::date 
   FROM projects WHERE status = 'suspended' 
   GROUP BY suspended_at::date;"
```

**Resolution**:
1. Check if threshold was changed
2. Verify activity tracking is working
3. Bulk wake projects if needed
4. Adjust inactivity threshold if too aggressive

## Emergency Procedures

### Complete System Overload

1. **Immediate**: Scale all services to maximum
2. **Enable**: All performance optimizations
3. **Clear**: All non-critical caches
4. **Disable**: Non-essential features
5. **Alert**: Development team

```bash
# Scale everything up
kubectl scale deployment backend --replicas=20 -n algo-ide
kubectl scale deployment frontend --replicas=10 -n algo-ide

# Clear caches
curl -X POST https://api.example.com/api/cache/clear

# Check status
kubectl get pods -n algo-ide
kubectl top nodes
```

### Database Failure

1. **Check**: Database health
2. **Failover**: To replica if available
3. **Notify**: Users of degraded service
4. **Enable**: Read-only mode if needed

```bash
# Check database
kubectl logs -n algo-ide -l app=postgres

# Failover to replica
kubectl scale statefulset postgres-replica --replicas=1 -n algo-ide
kubectl exec -it postgres-replica-0 -n algo-ide -- pg_ctl promote
```

### Redis Failure

1. **Impact**: Sessions lost, cache unavailable
2. **Fallback**: Graceful degradation (no caching)
3. **Restart**: Redis service
4. **Warm**: Cache after restart

```bash
# Restart Redis
kubectl rollout restart deployment redis -n algo-ide

# Wait for ready
kubectl rollout status deployment redis -n algo-ide

# Warm cache
curl -X POST https://api.example.com/api/cache/warm
```

## Monitoring and Alerts

### Key Metrics to Watch

1. **Cache hit rate**: Should be > 80%
2. **Backend CPU**: Should be < 70%
3. **Backend memory**: Should be < 80%
4. **Request rate**: Baseline and peaks
5. **Error rate**: Should be < 1%
6. **Response time P95**: Should be < 500ms
7. **Active sessions**: Trend over time
8. **Suspended projects**: Rate of change

### Alert Thresholds

- **Critical**: Immediate action required
- **Warning**: Investigation needed
- **Info**: FYI, no action needed

```yaml
alerts:
  - name: CacheHitRateLow
    condition: hit_rate < 0.7
    severity: warning
    
  - name: BackendCPUHigh
    condition: cpu_usage > 0.8
    severity: critical
    
  - name: HighErrorRate
    condition: error_rate > 0.05
    severity: critical
```

## Contact Information

- **On-call Engineer**: +1-555-ON-CALL
- **DevOps Team**: devops@example.com
- **Slack Channel**: #infrastructure
- **PagerDuty**: https://pagerduty.com/algo

## Additional Resources

- [Scalability Architecture](SCALABILITY.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Monitoring Dashboard](https://grafana.example.com)
- [Log Aggregation](https://kibana.example.com)
