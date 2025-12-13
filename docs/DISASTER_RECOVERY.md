# Disaster Recovery Runbook

This document provides comprehensive disaster recovery procedures for the Algo Cloud IDE platform.

## Table of Contents

1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Backup System](#backup-system)
4. [Recovery Procedures](#recovery-procedures)
5. [Multi-Region Redundancy](#multi-region-redundancy)
6. [Incident Response](#incident-response)
7. [Testing & Validation](#testing--validation)
8. [Contact Information](#contact-information)

## Overview

The disaster recovery plan ensures business continuity in the event of:
- Hardware failures
- Data center outages
- Security breaches
- Natural disasters
- Human errors
- Software failures

## Recovery Objectives

### Recovery Time Objective (RTO)

**Target: 4 hours**

Maximum acceptable time to restore services after a disaster.

| Component | RTO Target |
|-----------|-----------|
| Critical Services (Auth, API) | 1 hour |
| Application Servers | 2 hours |
| Database | 2 hours |
| User Workspaces | 4 hours |

### Recovery Point Objective (RPO)

**Target: 24 hours**

Maximum acceptable data loss measured in time.

| Data Type | RPO Target | Backup Frequency |
|-----------|-----------|------------------|
| Application Code | 24 hours | Daily |
| Database | 1 hour | Hourly snapshots |
| User Workspaces | 24 hours | Daily |
| Configuration | Immediate | Version controlled |

## Backup System

### Automated Backups

Backups run automatically according to the schedule:

```yaml
Daily:   2:00 AM UTC (project code, database, workspaces)
Weekly:  3:00 AM UTC Sunday
Monthly: 4:00 AM UTC 1st of month
```

### Backup Components

1. **Project Code**
   - Application source code
   - Configuration files
   - Dependencies manifest
   
2. **Database**
   - PostgreSQL database dump
   - Transaction logs
   - Schema and data

3. **User Workspaces**
   - User project files
   - Container images
   - Workspace configurations

### Backup Locations

- **Primary**: Local storage `/var/backups/algo/`
- **Secondary**: Cloud storage (S3, Azure Blob, GCS)
- **Tertiary**: Off-site tape backup (optional)

### Encryption

All backups are encrypted using AES-256-CBC:

```bash
# Encryption key location
/etc/algo/backup.key

# Key rotation
Every 90 days
```

### Retention Policy

| Backup Type | Retention Period |
|-------------|------------------|
| Daily | 7 days |
| Weekly | 30 days |
| Monthly | 365 days |
| Archive | 5 years (compliance) |

## Recovery Procedures

### Quick Reference

```bash
# List available backups
./backup/scripts/restore.sh list

# Full disaster recovery
./backup/scripts/restore.sh full daily

# Restore specific components
./backup/scripts/restore.sh restore-database <backup_file>
./backup/scripts/restore.sh restore-project <backup_file>
./backup/scripts/restore.sh restore-workspaces <backup_file>

# Point-in-time recovery
./backup/scripts/restore.sh pitr "2024-12-01 14:30:00"
```

### Scenario 1: Complete Data Center Failure

**Severity: CRITICAL**

#### Detection
- All services unresponsive
- Monitoring alerts triggered
- Unable to reach data center

#### Response (Execute immediately)

**Step 1: Assess Situation (5 minutes)**
```bash
# Check system status
ping production-server.example.com
ssh admin@production-server.example.com

# Check monitoring dashboard
# Confirm data center outage with provider
```

**Step 2: Activate DR Site (15 minutes)**
```bash
# SSH to DR site
ssh admin@dr-server.example.com

# Navigate to restore location
cd /var/restore/algo

# Set environment variables
export RESTORE_DIR=/var/restore/algo
export DB_HOST=dr-database.example.com
export DB_NAME=algo
export DB_USER=algo
export DB_PASSWORD="<secure_password>"
```

**Step 3: Restore from Backup (2 hours)**
```bash
# Run full disaster recovery
sudo ./backup/scripts/restore.sh full daily

# Verify restoration
ls -la /var/restore/algo/project
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM users;"
```

**Step 4: Update DNS (30 minutes)**
```bash
# Update DNS to point to DR site
# Example using Cloudflare CLI
cloudflare-cli dns update --name algo.example.com --type A --content <DR_IP>

# Wait for propagation
dig algo.example.com
```

**Step 5: Start Services (30 minutes)**
```bash
# Start application
cd /var/restore/algo/project
npm install
npm run build
pm2 start ecosystem.config.js

# Verify services
curl https://algo.example.com/health
```

**Step 6: Verify Functionality (30 minutes)**
```bash
# Test critical paths
curl -X POST https://algo.example.com/api/auth/login
curl -X GET https://algo.example.com/api/projects

# Test user login
# Test workspace creation
# Test project execution
```

**Step 7: Notify Stakeholders (15 minutes)**
```bash
# Send status updates
# - Customers: "Service restored"
# - Team: Recovery progress
# - Management: Incident summary
```

### Scenario 2: Database Corruption

**Severity: HIGH**

#### Detection
- Database errors in logs
- Failed transactions
- Data integrity issues

#### Response

**Step 1: Stop Application (Immediate)**
```bash
# Stop all application servers
pm2 stop all

# Prevent further damage
```

**Step 2: Assess Damage (15 minutes)**
```bash
# Check database status
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Run integrity checks
SELECT pg_catalog.pg_check_all();

# Identify corrupted tables
```

**Step 3: Restore Database (1 hour)**
```bash
# List recent backups
./backup/scripts/restore.sh list

# Choose backup before corruption
BACKUP_FILE="/var/backups/algo/daily/database_20241213_020000.sql.gz.enc"

# Restore database (drops existing)
./backup/scripts/restore.sh restore-database $BACKUP_FILE true
```

**Step 4: Verify Data (30 minutes)**
```bash
# Run data validation queries
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
  SELECT COUNT(*) FROM users;
  SELECT COUNT(*) FROM projects;
  SELECT COUNT(*) FROM workspaces;
EOF

# Compare with expected counts
```

**Step 5: Restart Application (15 minutes)**
```bash
# Start services
pm2 start all

# Monitor logs
pm2 logs
```

### Scenario 3: Ransomware Attack

**Severity: CRITICAL**

#### Detection
- Files encrypted with unusual extensions
- Ransom note on servers
- Cannot access files

#### Response

**IMPORTANT: DO NOT PAY RANSOM**

**Step 1: Isolate Systems (Immediate)**
```bash
# Disconnect from network
sudo ifconfig eth0 down

# Stop all services
sudo systemctl stop algo
pm2 stop all

# Prevent spread
```

**Step 2: Preserve Evidence (15 minutes)**
```bash
# Take disk snapshots
sudo dd if=/dev/sda of=/mnt/forensics/disk.img

# Save logs
cp -r /var/log/algo /mnt/forensics/logs/
cp -r /var/log/syslog /mnt/forensics/

# Document everything
```

**Step 3: Notify Authorities (30 minutes)**
```bash
# Contact:
# - Law enforcement
# - Cybersecurity insurance
# - Legal team
# - Incident response team
```

**Step 4: Clean Rebuild (4 hours)**
```bash
# Provision new clean servers
# DO NOT restore from potentially infected backups

# Restore from known-good backup (before infection)
# Verify backup integrity
sha256sum /var/backups/algo/daily/database_20241201_*.enc

# Restore on new servers
./backup/scripts/restore.sh full daily
```

**Step 5: Security Hardening (2 hours)**
```bash
# Update all systems
sudo apt update && sudo apt upgrade -y

# Change all credentials
# Rotate encryption keys
# Update firewall rules
# Enable additional monitoring
```

### Scenario 4: Accidental Data Deletion

**Severity: MEDIUM**

#### Detection
- User reports missing data
- Empty tables in database
- Deleted files

#### Response

**Step 1: Stop Further Changes (Immediate)**
```bash
# Put application in read-only mode
# or stop the application
pm2 stop all
```

**Step 2: Identify Deletion Timestamp (15 minutes)**
```bash
# Check audit logs
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
  SELECT * FROM audit_logs 
  WHERE action = 'delete' 
  ORDER BY timestamp DESC 
  LIMIT 100;
EOF

# Identify when data was deleted
```

**Step 3: Point-in-Time Recovery (1 hour)**
```bash
# Restore to point before deletion
./backup/scripts/restore.sh pitr "2024-12-13 10:30:00"

# Note: Requires transaction log backups
```

**Step 4: Selective Restore (30 minutes)**
```bash
# If full restore not needed, restore specific tables

# Extract from backup
./backup/scripts/restore.sh restore-database <backup_file> false

# Restore specific tables only
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -t users -t projects backup.dump
```

## Multi-Region Redundancy

### Architecture

```
Primary Region (us-east-1)
├── Application Servers (active)
├── Database (primary)
└── Storage (primary)

Secondary Region (us-west-2)
├── Application Servers (standby)
├── Database (replica)
└── Storage (replicated)

Tertiary Region (eu-west-1)
├── Application Servers (standby)
├── Database (replica)
└── Storage (replicated)
```

### Failover Procedure

**Automatic Failover (if configured)**
```yaml
# Configured in cloudflare.yaml
load_balancing:
  health_check:
    interval: 60s
    timeout: 5s
    threshold: 3
  auto_failover: true
```

**Manual Failover**
```bash
# 1. Stop primary region (if still running)
ssh admin@primary.example.com
pm2 stop all

# 2. Promote secondary database
ssh admin@secondary.example.com
sudo -u postgres psql -c "SELECT pg_promote();"

# 3. Start application on secondary
pm2 start all

# 4. Update DNS
cloudflare-cli dns update --name algo.example.com --content <secondary_ip>

# 5. Monitor replication lag
psql -c "SELECT NOW() - pg_last_xact_replay_timestamp() AS lag;"
```

## Incident Response

### Communication Plan

**Internal Communication**
- **Incident Commander**: Coordinates response
- **Technical Lead**: Executes recovery
- **Communications Lead**: Updates stakeholders

**External Communication Templates**

**Initial Notification:**
```
Subject: Service Disruption - Algo Cloud IDE

We are currently experiencing a service disruption affecting [components].

Estimated Recovery Time: [time]
Status Updates: Every 30 minutes

We apologize for the inconvenience and are working to restore service.

Status Page: https://status.example.com
```

**Progress Update:**
```
Subject: Service Recovery Update

Current Status: [Recovery in progress / 50% complete]
Actions Taken: [Restored database, restarting services]
Next Steps: [Verify functionality, resume normal operations]

ETA: [time]
```

**Resolution:**
```
Subject: Service Restored - Algo Cloud IDE

Service has been fully restored as of [time].

Root Cause: [Brief explanation]
Measures Taken: [Preventive actions]

We apologize for the disruption. If you experience any issues, please contact support@example.com.
```

### Escalation Matrix

| Time Elapsed | Action | Contact |
|--------------|--------|---------|
| 0 min | Incident detected | On-call engineer |
| 15 min | Escalate if unresolved | Team lead |
| 30 min | Escalate if critical | Engineering manager |
| 1 hour | Escalate if ongoing | VP Engineering, CTO |
| 2 hours | Executive notification | CEO |

## Testing & Validation

### Disaster Recovery Drills

**Schedule: Quarterly**

**Drill 1: Database Restore**
```bash
# Test database restore process
# Duration: 1 hour
./backup/scripts/restore.sh restore-database <test_backup> true
```

**Drill 2: Full System Recovery**
```bash
# Test complete system restore
# Duration: 4 hours
./backup/scripts/restore.sh full daily
```

**Drill 3: Failover Test**
```bash
# Test multi-region failover
# Duration: 2 hours
# Simulate primary region failure
# Execute failover procedure
```

### Validation Checklist

After recovery, verify:

- [ ] Application accessible via URL
- [ ] Users can log in
- [ ] Database queries work
- [ ] File operations work
- [ ] API endpoints respond
- [ ] Workspaces accessible
- [ ] Monitoring alerts working
- [ ] Backups resume automatically
- [ ] SSL certificates valid
- [ ] DNS resolves correctly

### Test Results Documentation

Document each test in `/docs/dr-tests/`:

```markdown
# DR Test - [Date]

**Type**: Full System Recovery
**Duration**: 3 hours 45 minutes
**RTO Target**: 4 hours
**Status**: PASSED

## Issues Found
1. DNS propagation took longer than expected
2. Monitoring alerts not working

## Actions Taken
1. Pre-configure DNS failover
2. Fix monitoring configuration

## Lessons Learned
- Need better automation for DNS updates
- Should test monitoring separately
```

## Contact Information

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Incident Commander | [Name] | [Phone] | [Email] |
| DBA | [Name] | [Phone] | [Email] |
| DevOps Lead | [Name] | [Phone] | [Email] |
| Security Lead | [Name] | [Phone] | [Email] |

### Vendor Contacts

| Vendor | Service | Support | SLA |
|--------|---------|---------|-----|
| AWS | Cloud Infrastructure | 1-800-XXX-XXXX | 24/7 |
| Cloudflare | DDoS Protection | support@cloudflare.com | 24/7 |
| Database Provider | Managed PostgreSQL | [Contact] | 24/7 |

### External Resources

- **Status Page**: https://status.example.com
- **Incident Log**: https://incidents.example.com
- **Documentation**: https://docs.example.com/dr
- **Runbooks**: https://runbooks.example.com

## Appendix

### Backup File Naming Convention

```
{component}_{timestamp}.{extension}.enc

Examples:
- project_20241213_020000.tar.gz.enc
- database_20241213_020000.sql.gz.enc
- workspaces_20241213_020000.tar.gz.enc
```

### Environment Variables

Required for disaster recovery:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=algo
DB_USER=algo
DB_PASSWORD=<secure_password>

# Restore locations
RESTORE_DIR=/var/restore/algo
BACKUP_ROOT=/var/backups/algo

# Encryption
ENCRYPTION_KEY_FILE=/etc/algo/backup.key

# Cloud storage
AWS_REGION=us-east-1
BACKUP_S3_BUCKET=algo-backups
```

### Checklist: Before Disaster

Preparation steps:

- [ ] Backups running on schedule
- [ ] Backup verification passing
- [ ] Encryption keys secured
- [ ] Cloud storage configured
- [ ] Multi-region replication active
- [ ] Monitoring and alerting working
- [ ] DR drills completed
- [ ] Contact list updated
- [ ] Runbooks reviewed
- [ ] Team trained on procedures

---

**Last Updated**: 2024-12-13  
**Next Review**: 2025-03-13  
**Document Owner**: DevOps Team
