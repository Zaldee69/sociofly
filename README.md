# My Scheduler App

**Aplikasi penjadwalan posting social media yang canggih dengan high availability, monitoring, dan auto-scaling.**

[![Status](https://img.shields.io/badge/status-production--ready-green)](/)
[![Node.js](https://img.shields.io/badge/node.js-18+-blue)](/)
[![Redis](https://img.shields.io/badge/redis-7.0+-red)](/)
[![BullMQ](https://img.shields.io/badge/BullMQ-integrated-orange)](/)

## 🚀 Quick Start

```bash
# Clone dan setup
git clone <repository-url>
cd my-scheduler-app
npm install

# Setup environment
cp .env.example .env

# Setup database
npm run db:push

# Setup Redis cluster (optional)
npm run cluster:setup

# Start development
npm run dev:cluster
```

## 🎯 Key Features

### Core Features

- ✅ **Multi-platform Social Media Posting** (Facebook, Instagram, Twitter, LinkedIn)
- ✅ **Advanced Scheduling System** (Cron + BullMQ hybrid)
- ✅ **High Availability** (Redis cluster dengan automatic failover)
- ✅ **Real-time Monitoring** (System health & performance metrics)
- ✅ **Auto-scaling Workers** (Dynamic scaling berdasarkan queue load)
- ✅ **Approval Workflow** (Multi-level approval system)
- ✅ **Team Collaboration** (Role-based access control)

### Post Management & Publishing

- **Smart Loading States**: Calendar dan post dialog dengan loading indicators
- **Published Post Protection**: Enhanced UX untuk posts yang sudah published
  - 🔒 **Read-only mode** untuk published posts
  - ⚠️ **Enhanced delete warnings** dengan detailed implications
  - 📱 **Visual indicators** menunjukkan status publikasi post
- **Loading States Implementation**: Comprehensive loading feedback
- **Form Disable States**: All inputs disabled during processing

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                        │
│  Next.js 15 │ React 19 │ TypeScript │ Tailwind CSS        │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                  Scheduling & Queue Layer                  │
│  Enhanced Cron │ BullMQ │ Queue Management │ Auto-scaling │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                      │
│ Redis Cluster │ PostgreSQL │ Monitoring │ Alert System    │
│   (6 nodes)   │  Database  │   System   │    & Scaling    │
└─────────────────────────────────────────────────────────────┘
```

## 📚 Documentation

### 🚀 Getting Started

- **[Complete Documentation](docs/README.md)** - Komprehensif guide dan index
- **[Environment Configuration](#configuration)** - Essential setup

### 🏗️ Infrastructure & Architecture

- **[Redis Cluster Setup](docs/infrastructure/REDIS_CLUSTER_SETUP.md)** - High availability dengan monitoring
- **[BullMQ Integration](docs/infrastructure/BULLMQ_INTEGRATION.md)** - Queue system dan job processing
- **[Cron System](docs/infrastructure/CRON_SETUP.md)** - Scheduling infrastructure
- **[Monitoring System](docs/operations/POST_MONITORING_SYSTEM.md)** - Health monitoring dan alerting

### 🔧 Operations & Management

- **[System Monitoring](docs/operations/)** - Monitoring, scaling, dan performance
- **[Troubleshooting](docs/troubleshooting/)** - Common issues dan solutions

### 🎯 Features & Development

- **[Feature Documentation](docs/features/)** - Social media integration, approval workflow
- **[Development Guide](docs/development/)** - Best practices, file structure

## ⚡ Management Commands

### Development

```bash
npm run dev              # Basic development
npm run dev:cron         # With cron jobs enabled
npm run dev:cluster      # Full cluster support
```

### Redis Cluster

```bash
npm run cluster:setup    # Initial cluster setup
npm run cluster:start    # Start cluster
npm run cluster:status   # Check cluster health
npm run test:cluster     # Test cluster integration
```

### Queue Management

```bash
npm run queue:status     # Check queue status
npm run queue:metrics    # Queue performance metrics
npm run queue:monitor    # Real-time monitoring
```

### System Monitoring

```bash
npm run monitor:start    # Start system monitoring
npm run monitor:health   # Health check
npm run scaling:start    # Start auto-scaling
```

## 🔧 Configuration

### Core Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Redis & Queue System
REDIS_USE_CLUSTER=true
REDIS_CLUSTER_HOST_1=localhost
REDIS_CLUSTER_PORT_1=7001

# Monitoring & Scaling
ENABLE_CRON_JOBS=true
ENABLE_SYSTEM_MONITORING=true
ENABLE_AUTO_SCALING=true
CRON_API_KEY=your-secure-api-key
```

Lihat [Environment Configuration Guide](docs/README.md#configuration) untuk konfigurasi lengkap.

## 📊 Monitoring Dashboard

### Real-time Monitoring

```bash
# System health overview
curl "localhost:3000/api/monitoring?action=health_check&apiKey=your-key"

# Redis cluster status
curl "localhost:3000/api/monitoring?action=redis_cluster&apiKey=your-key"

# Queue performance metrics
curl "localhost:3000/api/monitoring?action=queue_metrics&apiKey=your-key"
```

### Web Dashboard

- **System Health**: `http://localhost:3000/dashboard/monitoring`
- **Queue Management**: `http://localhost:3000/dashboard/queues`
- **Performance Metrics**: `http://localhost:3000/dashboard/metrics`

## 🚨 Production Readiness

### High Availability Features

- ✅ Redis cluster dengan automatic failover
- ✅ Health monitoring dengan alerting
- ✅ Auto-scaling workers berdasarkan load
- ✅ Graceful degradation (fallback ke node-cron)
- ✅ Comprehensive error handling
- ✅ Performance metrics dan logging

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Redis cluster setup dan tested
- [ ] Database migrations applied
- [ ] Monitoring system active
- [ ] API keys secured
- [ ] SSL certificates configured
- [ ] Backup strategy implemented

## 💡 Post Status Behavior

### Published Posts (Status: PUBLISHED)

- **Edit Restrictions**: Form fields become read-only, media upload disabled
- **Delete Behavior**: Shows enhanced warning dialog
- **Reasoning**: Maintains consistency between database and live social media content

### Draft/Scheduled Posts

- **Full Editing**: All features available
- **Standard Actions**: Publish, Schedule, Save Draft, Request Review
- **Media Management**: Upload, reorder, remove media files

## 🤝 Contributing

1. Read [Development Guidelines](docs/development/best-practices.md)
2. Follow [File Structure Guide](docs/development/file-restructure-plan.md)
3. Check [Migration Scripts](docs/development/migration-scripts.md)
4. Update documentation for new features

## 📞 Support & Troubleshooting

### Common Issues

- **[Redis Connection Issues](docs/troubleshooting/CRON_TROUBLESHOOTING.md)**
- **[Queue Processing Problems](docs/troubleshooting/QUICK_CRON_FIX.md)**
- **[Permission Errors](docs/troubleshooting/README-PERMISSION-FIXES.md)**

### Resources

- **[Complete Documentation](docs/README.md)** - Comprehensive guide
- **[Troubleshooting Guide](docs/troubleshooting/)** - Issue resolution
- **[API Documentation](docs/infrastructure/BULLMQ_INTEGRATION.md)** - API reference
- **[Team Migration](docs/TEAM_MIGRATION.md)** - Onboarding guide

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready

![My Scheduler App](https://img.shields.io/badge/My%20Scheduler%20App-Production%20Ready-success)
