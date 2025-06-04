# Infrastructure Documentation

Dokumentasi untuk infrastruktur sistem dan arsitektur backend.

## 📋 Daftar Dokumentasi

### 🔴 Redis & Queue System

- **[Redis Cluster Setup](REDIS_CLUSTER_SETUP.md)** - Setup Redis cluster untuk high availability dengan monitoring dan auto-scaling
- **[BullMQ Integration](BULLMQ_INTEGRATION.md)** - Integrasi BullMQ untuk queue management dan job processing
- **[Cron System](CRON_SETUP.md)** - Setup sistem cron job untuk penjadwalan

### 📊 Monitoring & Operations

- **[Monitoring System](../operations/POST_MONITORING_SYSTEM.md)** - System monitoring, health checks, dan alerting

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Redis Cluster │ PostgreSQL │ Monitoring │ Alert System    │
│   (6 nodes)    │  Database  │   System   │    & Scaling    │
└─────────────────────────────────────────────────────────────┘
```

### Redis Cluster

- **6 nodes**: 3 master + 3 replica
- **High availability**: Automatic failover
- **Performance**: Load balancing dan scaling
- **Monitoring**: Real-time health checks

### Queue System (BullMQ)

- **7 queues**: Different priorities dan concurrency
- **Auto-scaling**: Dynamic worker scaling
- **Retry logic**: Exponential backoff
- **Monitoring**: Job metrics dan performance

### Database (PostgreSQL)

- **Primary database**: User data, posts, settings
- **Prisma ORM**: Type-safe database access
- **Migrations**: Version-controlled schema changes

## 🚀 Quick Setup

### Prerequisites

```bash
Node.js 18+
Redis 7.0+
PostgreSQL 14+
```

### Installation

```bash
# Setup Redis cluster
npm run cluster:setup

# Initialize database
npm run db:push

# Start with full infrastructure
npm run dev:cluster
```

### Verification

```bash
# Test Redis cluster
npm run test:cluster

# Check monitoring
npm run monitor:health

# Verify queues
npm run queue:status
```

## 📊 Key Features

### High Availability

- ✅ Redis cluster dengan automatic failover
- ✅ Health monitoring dengan alerting
- ✅ Graceful degradation fallback
- ✅ Load balancing dan scaling

### Performance

- ✅ Auto-scaling workers berdasarkan queue load
- ✅ Optimized Redis configurations
- ✅ Efficient job processing dengan retry logic
- ✅ Real-time performance metrics

### Reliability

- ✅ Comprehensive error handling
- ✅ Job persistence dalam Redis
- ✅ System health monitoring
- ✅ Alert system untuk issues

## 🔧 Configuration

### Environment Variables

```bash
# Redis Cluster
REDIS_USE_CLUSTER=true
REDIS_CLUSTER_HOST_1=localhost
REDIS_CLUSTER_PORT_1=7001

# Monitoring
ENABLE_SYSTEM_MONITORING=true
ENABLE_AUTO_SCALING=true

# Database
DATABASE_URL="postgresql://..."
```

### Key Commands

```bash
# Infrastructure management
npm run cluster:setup      # Setup Redis cluster
npm run monitor:start      # Start monitoring
npm run scaling:start      # Start auto-scaling
npm run queue:init         # Initialize queues
```

## 📚 Related Documentation

- **[Operations Guide](../operations/)** - System monitoring dan management
- **[Development Guide](../development/)** - Development best practices
- **[Troubleshooting](../troubleshooting/)** - Common issues dan solutions

---

**Infrastructure Status**: Production Ready  
**Last Updated**: December 2024
