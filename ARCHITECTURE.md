# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                         │
│                    (NGINX Ingress / LB)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐         ┌────────▼───────┐
│    Frontend    │         │    Backend     │
│   (Next.js)    │◄────────┤   (Express)    │
│  React + TS    │  WebSocket  Node.js      │
└────────────────┘         └────────┬───────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            ┌───────▼──────┐  ┌────▼────┐  ┌──────▼──────┐
            │  PostgreSQL  │  │  Redis  │  │  MongoDB    │
            │  (User Data) │  │ (Cache) │  │   (Logs)    │
            └──────────────┘  └─────────┘  └─────────────┘
                    │
            ┌───────▼──────┐
            │   MinIO/S3   │
            │  (Storage)   │
            └──────────────┘
                    │
            ┌───────▼──────┐
            │    Docker    │
            │  Containers  │
            │  (Execution) │
            └──────────────┘
```

## Component Details

### Frontend Layer
- **Technology**: Next.js 14 with App Router
- **Responsibilities**:
  - User interface rendering
  - Monaco Editor integration
  - Real-time collaboration (Yjs)
  - WebSocket management
  - Authentication UI

### Backend API Layer
- **Technology**: Node.js/Express
- **Responsibilities**:
  - REST API endpoints
  - WebSocket server
  - Authentication & authorization
  - Business logic
  - Database operations
  - Container orchestration

### Database Layer

#### PostgreSQL
- **Purpose**: Primary data store
- **Stores**:
  - User accounts
  - Projects metadata
  - Environment variables
  - Custom domains
  - Audit logs

#### Redis
- **Purpose**: Caching and sessions
- **Stores**:
  - Session data
  - API response cache
  - Rate limiting data
  - Real-time collaboration state

#### MongoDB
- **Purpose**: Analytics and logs
- **Stores**:
  - Application logs
  - User activity logs
  - Performance metrics
  - Error tracking

### Storage Layer
- **Technology**: S3-compatible storage (MinIO/AWS S3)
- **Purpose**: File storage
- **Stores**:
  - Project files
  - User uploads
  - Build artifacts
  - Static assets

### Container Execution Layer
- **Technology**: Docker
- **Purpose**: Code execution environment
- **Features**:
  - Isolated execution
  - Resource limits
  - Multi-language support
  - Security sandboxing

## Data Flow

### User Authentication Flow
```
User → Frontend → Backend API → PostgreSQL
                      ↓
                  JWT Token
                      ↓
                  Redis Cache
                      ↓
                   Frontend
```

### Code Execution Flow
```
User Code → Frontend → Backend API → Docker Container
                                          ↓
                                    S3 Storage
                                          ↓
                                     Execution
                                          ↓
                                    Terminal Output
                                          ↓
                                     WebSocket
                                          ↓
                                      Frontend
```

### Collaborative Editing Flow
```
User A → Monaco Editor → Yjs CRDT → WebSocket → Backend
                                                    ↓
                                              Broadcast
                                                    ↓
                                    User B ← WebSocket ← Backend
```

## Security Architecture

### Authentication & Authorization
1. **User Registration**: Password hashing with bcrypt
2. **Login**: JWT token generation
3. **Authorization**: Token verification middleware
4. **RBAC**: Role-based access control

### API Security
- Rate limiting (100 req/15min)
- Input validation
- SQL injection prevention
- XSS protection
- CORS configuration

### Container Security
- Resource quotas
- Process limits
- Network isolation
- Read-only root filesystem (where applicable)
- Security options (no-new-privileges)

### Data Security
- Encryption at rest for sensitive data
- TLS/SSL for data in transit
- Secure credential management
- Audit logging

## Scalability

### Horizontal Scaling
- Frontend: Multiple replicas behind load balancer
- Backend: Multiple replicas with session affinity
- Database: Read replicas for PostgreSQL
- Redis: Cluster mode for high availability

### Vertical Scaling
- Configurable resource limits
- Auto-scaling based on metrics
- Database connection pooling

### Caching Strategy
- Redis for API response caching
- CDN for static assets
- Browser caching for client-side resources

## High Availability

### Database HA
- PostgreSQL: Primary-replica setup
- Redis: Sentinel or Cluster mode
- MongoDB: Replica set

### Application HA
- Multiple frontend replicas
- Multiple backend replicas
- Health checks and auto-restart
- Rolling updates for zero downtime

### Storage HA
- S3: Built-in redundancy
- Backup strategy
- Disaster recovery plan

## Monitoring & Observability

### Metrics Collection
- Application metrics (response time, error rate)
- Container metrics (CPU, memory, disk)
- Database metrics (connections, queries)

### Logging
- Application logs → MongoDB
- Audit logs → PostgreSQL
- System logs → Centralized logging

### Alerting
- Resource usage alerts
- Error rate alerts
- Downtime alerts

## Performance Optimization

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Caching strategies

### Backend
- Database indexing
- Query optimization
- Connection pooling
- Response compression

### Infrastructure
- Load balancing
- CDN integration
- Database optimization
- Caching layers

## Technology Decisions

### Why Next.js?
- Server-side rendering
- Built-in routing
- API routes
- Great developer experience
- Strong TypeScript support

### Why Express?
- Lightweight and flexible
- Large ecosystem
- Easy WebSocket integration
- Good performance

### Why PostgreSQL?
- ACID compliance
- Relational data model
- Strong consistency
- Rich feature set

### Why Redis?
- Fast in-memory storage
- Perfect for caching
- Pub/sub capabilities
- Good for sessions

### Why Docker?
- Consistent environments
- Easy isolation
- Resource management
- Wide language support

### Why Kubernetes?
- Container orchestration
- Auto-scaling
- Self-healing
- Rolling updates
- Service discovery
