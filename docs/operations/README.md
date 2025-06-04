# Operations & Monitoring Documentation

Dokumentasi untuk operasional sistem, monitoring, dan management.

## 📋 Daftar Dokumentasi

### 📊 System Monitoring

- **[Monitoring System](POST_MONITORING_SYSTEM.md)** - Komprehensif system monitoring dengan alerting dan auto-scaling
- **[Cron Performance Tuning](CRON_PERFORMANCE_TUNING.md)** - Optimasi performance cron job dan batch processing

## 🔍 Operations Overview

### System Monitoring

- **Real-time metrics**: Redis, queues, system resources
- **Health scoring**: 0-100 dengan automated assessment
- **Alert system**: 8 default alert rules dengan cooldown
- **Auto-scaling**: Dynamic worker scaling berdasarkan load

### Performance Monitoring

- **Redis performance**: Memory usage, throughput, hit rate
- **Queue metrics**: Job counts, processing time, error rates
- **System resources**: CPU, memory, disk, network
- **Application metrics**: Response time, error rates

## 🚀 Quick Start

### Start Monitoring

```bash
# Start system monitoring
npm run monitor:start

# Check system health
npm run monitor:health

# Monitor Redis cluster
npm run monitor:redis

# Monitor queue performance
npm run monitor:queues
```

### Auto-scaling

```bash
# Start auto-scaling
npm run scaling:start

# Check scaling status
npm run scaling:status

# Manual scaling
npm run scaling:manual
```

## 📊 Monitoring Components

### System Monitor

- **Health assessment**: Overall system health scoring
- **Issue detection**: Automatic problem identification
- **Recommendations**: Actionable improvement suggestions
- **Alert triggering**: Rule-based alerting dengan cooldown

### Worker Auto-Scaler

- **Load monitoring**: Queue load factor calculation
- **Dynamic scaling**: Automatic worker adjustment
- **Scaling policies**: Per-queue scaling configuration
- **Manual override**: Manual scaling capabilities

### Redis Cluster Monitor

- **Node health**: Individual node status monitoring
- **Performance metrics**: Memory, connections, throughput
- **Cluster topology**: Master/slave relationship tracking
- **Failover detection**: Automatic failover monitoring

## 🔧 Configuration

### Environment Variables

```bash
# Monitoring
ENABLE_SYSTEM_MONITORING=true
ENABLE_AUTO_SCALING=true

# API Access
CRON_API_KEY=your-secure-api-key

# Intervals
MONITORING_INTERVAL_MINUTES=5
SCALING_INTERVAL_MINUTES=2
```

### Default Alert Rules

| Alert                 | Condition                 | Severity | Cooldown |
| --------------------- | ------------------------- | -------- | -------- |
| Redis Connection Down | Redis tidak dapat diakses | Critical | 5 min    |
| Cluster Node Down     | Node cluster tidak sehat  | High     | 10 min   |
| High Memory Usage     | Redis memory > 80%        | Medium   | 15 min   |
| Queue System Down     | BullMQ tidak responding   | Critical | 5 min    |
| High Failed Jobs      | Failed jobs > 100         | Medium   | 30 min   |

## 📱 API Endpoints

### Monitoring API

```bash
# System health
GET /api/monitoring?action=health_check

# System metrics
GET /api/monitoring?action=system_metrics

# Redis cluster status
GET /api/monitoring?action=redis_cluster

# Queue metrics
GET /api/monitoring?action=queue_metrics

# Scaling status
GET /api/monitoring?action=scaling_status
```

### Control Actions

```bash
# Start monitoring
POST /api/monitoring
{
  "action": "start_monitoring",
  "intervalMinutes": 5
}

# Start auto-scaling
POST /api/monitoring
{
  "action": "start_autoscaling",
  "intervalMinutes": 2
}

# Manual scaling
POST /api/monitoring
{
  "action": "manual_scale",
  "queueName": "notifications",
  "targetWorkers": 10
}
```

## 📈 Metrics & KPIs

### System Health Score

- **90-100**: Healthy (hijau)
- **70-89**: Warning (kuning)
- **0-69**: Critical (merah)

### Key Metrics

- **Redis health**: Connection status, memory usage
- **Queue performance**: Job throughput, error rates
- **System resources**: CPU load, memory usage
- **Application health**: Response time, availability

### Scaling Metrics

- **Load factor**: Queue load calculation (0-1)
- **Worker utilization**: Active workers vs capacity
- **Throughput**: Jobs processed per minute
- **Response time**: Average job processing time

## 🚨 Troubleshooting

### Common Issues

```bash
# Monitoring not starting
npm run monitor:status
npm run monitor:start

# High memory usage
npm run monitor:redis
# Check Redis memory and cleanup

# Queue processing slow
npm run monitor:queues
npm run scaling:manual

# Auto-scaling not working
npm run scaling:status
npm run scaling:start
```

### Log Analysis

```bash
# System monitoring logs
tail -f logs/monitoring.log

# Redis cluster logs
tail -f redis-cluster/redis-*.log

# Application logs
tail -f logs/scheduler.log
```

## 🔍 Performance Tuning

### Monitoring Optimization

```bash
# Adjust monitoring intervals
MONITORING_INTERVAL_MINUTES=3  # More frequent monitoring
SCALING_INTERVAL_MINUTES=1     # Faster scaling response
```

### Scaling Optimization

```typescript
// Aggressive scaling configuration
{
  scaleUpThreshold: 1.2,    // Scale up faster
  scaleDownThreshold: 0.5,  // Scale down slower
  cooldownPeriod: 2,        # Shorter cooldown
  maxWorkers: 50            # Higher ceiling
}
```

## 📚 Related Documentation

- **[Infrastructure Guide](../infrastructure/)** - Redis cluster dan BullMQ setup
- **[Development Guide](../development/)** - Development best practices
- **[Troubleshooting](../troubleshooting/)** - Common issues dan solutions

---

**Operations Status**: Production Ready  
**Monitoring**: Active  
**Last Updated**: December 2024
