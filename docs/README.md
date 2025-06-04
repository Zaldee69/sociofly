# My Scheduler App - Documentation

Komprehensif dokumentasi untuk aplikasi scheduler dengan BullMQ, Redis Cluster, dan sistem monitoring yang canggih.

## 📋 Daftar Isi

### 🚀 Getting Started

- [Project Overview](#project-overview)
- [Quick Start Guide](#quick-start-guide)
- [Installation & Setup](#installation--setup)

### 🏗️ Architecture & Infrastructure

- [Redis Cluster & High Availability](infrastructure/REDIS_CLUSTER_SETUP.md)
- [BullMQ Integration](infrastructure/BULLMQ_INTEGRATION.md)
- [Cron Job System](infrastructure/CRON_SETUP.md)
- [Monitoring System](operations/POST_MONITORING_SYSTEM.md)

### 🔧 Development & Operations

- [Best Practices](development/best-practices.md)
- [Migration Scripts](development/migration-scripts.md)
- [File Structure](development/file-restructure-plan.md)
- [Import Fixes](development/import-fixes.md)

### 🎯 Features & Workflows

- [Approval Workflow](features/APPROVAL_WORKFLOW.md)
- [Social Media Integration](features/SOCIAL_MEDIA_INTEGRATION.md)
- [Edge Cases Handling](features/APPROVAL_EDGE_CASES.md)
- [UI Improvements](features/UI_IMPROVEMENTS.md)

### 🚨 Troubleshooting & Fixes

- [Cron Troubleshooting](troubleshooting/CRON_TROUBLESHOOTING.md)
- [Quick Cron Fix](troubleshooting/QUICK_CRON_FIX.md)
- [Permission Fixes](troubleshooting/README-PERMISSION-FIXES.md)

### 👥 Team & Migration

- [Team Migration Guide](TEAM_MIGRATION.md)
- [Restructure Report](development/restructure-report.md)

## 🎯 Project Overview

My Scheduler App adalah aplikasi penjadwalan posting social media yang canggih dengan fitur:

### Core Features

- ✅ **Multi-platform Posting** - Facebook, Instagram, Twitter, LinkedIn
- ✅ **Advanced Scheduling** - Cron-based dengan BullMQ
- ✅ **Approval Workflow** - Multi-level approval system
- ✅ **High Availability** - Redis cluster dengan automatic failover
- ✅ **Real-time Monitoring** - System health dan performance metrics
- ✅ **Auto-scaling** - Dynamic worker scaling berdasarkan load

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, tRPC, Prisma ORM
- **Database**: PostgreSQL
- **Queue System**: BullMQ dengan Redis Cluster
- **Authentication**: Clerk
- **Scheduling**: node-cron + BullMQ hybrid system
- **Monitoring**: Custom system monitor dengan alerting

## 🚀 Quick Start Guide

### Prerequisites

```bash
Node.js 18+
Redis 7.0+
PostgreSQL 14+
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd my-scheduler-app

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configurations

# Setup database
npm run db:push

# Setup Redis cluster (optional)
npm run cluster:setup
```

### Development

```bash
# Start development server
npm run dev

# Start with cron jobs
npm run dev:cron

# Start with full cluster support
npm run dev:cluster
```

### Testing

```bash
# Run tests
npm test

# Test cron system
npm run test:cron

# Test BullMQ integration
npm run test:bullmq

# Test cluster integration
npm run test:cluster
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Next.js App  │  tRPC API  │  Approval   │  Social Media   │
│  Frontend     │  Backend   │  Workflow   │  Integration    │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   Scheduling & Queue Layer                 │
├─────────────────────────────────────────────────────────────┤
│  Enhanced Cron │  BullMQ     │  Queue      │  Auto-scaling │
│  Manager       │  Integration│  Management │  Workers      │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Redis Cluster │  PostgreSQL │  Monitoring │  Alert        │
│  (6 nodes)     │  Database   │  System     │  System       │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Monitoring & Operations

### System Health Monitoring

```bash
# Monitor system health
npm run monitor:health

# Check Redis cluster status
npm run cluster:status

# Monitor queue metrics
npm run monitor:queues

# Start auto-scaling
npm run scaling:start
```

### Queue Management

```bash
# Initialize queues
npm run queue:init

# Check queue status
npm run queue:status

# Monitor queue performance
npm run queue:metrics

# Clean completed jobs
npm run queue:clean
```

### Cron Management

```bash
# Check cron status
npm run cron:status

# Restart cron jobs
npm run cron:restart

# Monitor cron activities
npm run cron:monitor
```

## 🔧 Configuration

### Environment Variables

#### Core Application

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Social Media APIs
FACEBOOK_APP_ID="..."
FACEBOOK_APP_SECRET="..."
```

#### Redis & Queue System

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# Redis Cluster (for high availability)
REDIS_USE_CLUSTER=true
REDIS_CLUSTER_HOST_1=localhost
REDIS_CLUSTER_PORT_1=7001
REDIS_CLUSTER_HOST_2=localhost
REDIS_CLUSTER_PORT_2=7002
REDIS_CLUSTER_HOST_3=localhost
REDIS_CLUSTER_PORT_3=7003
```

#### Monitoring & Scaling

```bash
# Cron & Monitoring
ENABLE_CRON_JOBS=true
ENABLE_SYSTEM_MONITORING=true
ENABLE_AUTO_SCALING=true
CRON_API_KEY=your-secure-api-key
TZ=Asia/Jakarta
```

## 📱 API Reference

### Queue Management API

```bash
Base URL: /api/queue-manager
```

### Monitoring API

```bash
Base URL: /api/monitoring
```

### Cron Management API

```bash
Base URL: /api/cron-manager
```

Lihat dokumentasi lengkap di [BullMQ Integration](../BULLMQ_INTEGRATION.md) dan [Redis Cluster Setup](../REDIS_CLUSTER_SETUP.md).

## 🚨 Common Issues & Solutions

### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# Restart Redis
npm run cluster:restart

# Check connection from app
npm run test:cluster
```

### Queue Processing Issues

```bash
# Check queue status
npm run queue:status

# Clean stuck jobs
npm run queue:clean

# Restart queue system
npm run queue:init
```

### Cron Job Issues

```bash
# Check cron status
npm run cron:status

# Restart cron system
npm run cron:restart

# Check logs
tail -f logs/scheduler.log
```

## 📝 Development Workflow

### 1. Feature Development

1. Create feature branch from `main`
2. Implement feature following [Best Practices](./best-practices.md)
3. Add tests for new functionality
4. Update documentation if needed
5. Create pull request

### 2. Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests (if available)
npm run test:e2e
```

### 3. Deployment

```bash
# Build application
npm run build

# Start production server
npm start

# Or using PM2
pm2 start ecosystem.config.js
```

## 🤝 Contributing

1. Read [Best Practices](./best-practices.md)
2. Follow [File Structure Guidelines](./file-restructure-plan.md)
3. Check [Migration Scripts](./migration-scripts.md) for database changes
4. Update documentation for new features

## 🆘 Support

### Documentation Links

- [Redis Cluster Setup](../REDIS_CLUSTER_SETUP.md) - Komprehensif guide untuk high availability
- [BullMQ Integration](../BULLMQ_INTEGRATION.md) - Queue system documentation
- [Troubleshooting Guide](../CRON_TROUBLESHOOTING.md) - Common issues dan solutions

### Team Resources

- [Team Migration Guide](./TEAM_MIGRATION.md) - Onboarding untuk team members baru
- [Approval Workflow](./APPROVAL_WORKFLOW.md) - Business logic documentation

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainers**: Development Team
