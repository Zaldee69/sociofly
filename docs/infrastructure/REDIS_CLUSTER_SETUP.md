# Redis Cluster Setup & High Availability Guide

Panduan lengkap untuk setup Redis cluster dengan high availability, monitoring system yang comprehensive, dan auto-scaling workers berdasarkan load.

## 🎯 Overview

Sistem ini menyediakan:

- **Redis Cluster** dengan 3 master nodes dan 3 replica nodes untuk high availability
- **System Monitoring** dengan real-time metrics dan alerting
- **Auto-scaling Workers** berdasarkan queue load
- **Comprehensive API** untuk monitoring dan management

## 📋 Prerequisites

- Node.js 18+
- Redis 7.0+ (akan diinstall otomatis oleh script)
- Linux/macOS environment
- Minimal 2GB RAM untuk cluster
- Port 7001-7006 tersedia

## 🚀 Quick Start

### 1. Setup Redis Cluster

```bash
# Jalankan script setup cluster
chmod +x scripts/setup-redis-cluster.sh
./scripts/setup-redis-cluster.sh setup
```

Script akan:

- ✅ Install Redis jika belum ada
- ✅ Setup 6 Redis nodes (3 master, 3 replica)
- ✅ Configure cluster dengan automatic failover
- ✅ Test cluster functionality
- ✅ Create systemd service (Linux)

### 2. Configure Environment Variables

Tambahkan ke `.env`:

```bash
# Redis Cluster Configuration
REDIS_USE_CLUSTER=true
REDIS_CLUSTER_HOST_1=localhost
REDIS_CLUSTER_PORT_1=7001
REDIS_CLUSTER_HOST_2=localhost
REDIS_CLUSTER_PORT_2=7002
REDIS_CLUSTER_HOST_3=localhost
REDIS_CLUSTER_PORT_3=7003
REDIS_PASSWORD=your-secure-password  # Optional

# Monitoring & Scaling
ENABLE_SYSTEM_MONITORING=true
ENABLE_AUTO_SCALING=true
CRON_API_KEY=your-secure-api-key
```

### 3. Start Application with Monitoring

```bash
# Start dengan monitoring dan auto-scaling
npm run dev:cluster
```

## 🏗️ Architecture

### Redis Cluster Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Redis Cluster                           │
├─────────────────────────────────────────────────────────────┤
│  Master 1 (7001) ←→ Replica 1 (7004)                      │
│  Master 2 (7002) ←→ Replica 2 (7005)                      │
│  Master 3 (7003) ←→ Replica 3 (7006)                      │
└─────────────────────────────────────────────────────────────┘
```

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │  Redis Cluster  │    │   Monitoring    │
│                 │    │                 │    │                 │
│ • Queue Manager │◄──►│ • 6 Nodes       │◄──►│ • System Monitor│
│ • Job Processor │    │ • Auto Failover │    │ • Auto Scaler   │
│ • Auto Scaler   │    │ • Load Balance  │    │ • Alert System │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Monitoring System

### System Metrics

Monitor mengumpulkan metrics untuk:

- **Redis Cluster**

  - Node health dan status
  - Memory usage dan performance
  - Connection count dan throughput
  - Cluster topology changes

- **Queue Performance**

  - Job counts per queue (waiting, active, completed, failed)
  - Worker utilization
  - Processing throughput
  - Error rates

- **System Resources**
  - CPU usage dan load average
  - Memory usage (system & Node.js heap)
  - Disk I/O dan network
  - Process uptime

### Health Scoring

Sistem menggunakan health score 0-100:

- **90-100**: Healthy (hijau)
- **70-89**: Warning (kuning)
- **0-69**: Critical (merah)

### Alert Rules

Default alert rules:

| Alert                 | Condition                 | Severity | Cooldown |
| --------------------- | ------------------------- | -------- | -------- |
| Redis Connection Down | Redis tidak dapat diakses | Critical | 5 min    |
| Cluster Node Down     | Node cluster tidak sehat  | High     | 10 min   |
| High Memory Usage     | Redis memory > 80%        | Medium   | 15 min   |
| Queue System Down     | BullMQ tidak responding   | Critical | 5 min    |
| High Failed Jobs      | Failed jobs > 100         | Medium   | 30 min   |
| System Memory Low     | Free memory < 10%         | High     | 15 min   |
| High System Load      | Load > 2x CPU cores       | Medium   | 20 min   |
| Health Score Critical | Overall score < 50        | Critical | 10 min   |

## ⚡ Auto-scaling Workers

### Scaling Configuration

Default scaling configs per queue:

```typescript
{
  queueName: "high-priority",
  minWorkers: 2,
  maxWorkers: 10,
  targetWaitingJobs: 5,
  scaleUpThreshold: 2.0,    // Scale up when waiting > 2x target
  scaleDownThreshold: 0.3,  // Scale down when waiting < 30% target
  cooldownPeriod: 5,        // 5 minutes between actions
  enabled: true
}
```

### Scaling Logic

**Scale Up Conditions:**

- Waiting jobs > target × scaleUpThreshold
- Load factor > 0.8 dan ada waiting jobs
- Current workers < maxWorkers

**Scale Down Conditions:**

- Waiting jobs = 0 dan load factor < 0.2
- Waiting jobs < target × scaleDownThreshold
- Current workers > minWorkers

### Load Factor Calculation

```typescript
loadFactor = Math.min(1, (waitingJobs + activeJobs) / workers / 10);
```

## 🔧 API Endpoints

### Monitoring API

Base URL: `/api/monitoring`

#### GET Endpoints

```bash
# Overall system status
GET /api/monitoring?apiKey=your-key

# System metrics
GET /api/monitoring?action=system_metrics&apiKey=your-key

# Redis cluster status
GET /api/monitoring?action=redis_cluster&apiKey=your-key

# Redis performance metrics
GET /api/monitoring?action=redis_performance&apiKey=your-key

# Queue metrics
GET /api/monitoring?action=queue_metrics&apiKey=your-key

# Auto-scaling status
GET /api/monitoring?action=scaling_status&apiKey=your-key

# Health check
GET /api/monitoring?action=health_check&apiKey=your-key
```

#### POST Endpoints

```bash
# Start system monitoring
curl -X POST /api/monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start_monitoring",
    "intervalMinutes": 5,
    "apiKey": "your-key"
  }'

# Start auto-scaling
curl -X POST /api/monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start_autoscaling",
    "intervalMinutes": 2,
    "apiKey": "your-key"
  }'

# Manual scaling
curl -X POST /api/monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "action": "manual_scale",
    "queueName": "notifications",
    "targetWorkers": 15,
    "reason": "High traffic expected",
    "apiKey": "your-key"
  }'

# Update scaling config
curl -X POST /api/monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_scaling_config",
    "queueName": "high-priority",
    "maxWorkers": 20,
    "targetWaitingJobs": 10,
    "apiKey": "your-key"
  }'
```

## 🛠️ Management Commands

### Redis Cluster Management

```bash
# Setup cluster
./scripts/setup-redis-cluster.sh setup

# Start cluster
./scripts/setup-redis-cluster.sh start

# Stop cluster
./scripts/setup-redis-cluster.sh stop

# Restart cluster
./scripts/setup-redis-cluster.sh restart

# Check status
./scripts/setup-redis-cluster.sh status

# Test functionality
./scripts/setup-redis-cluster.sh test

# Clean up
./scripts/setup-redis-cluster.sh clean
```

### Application Commands

```bash
# Start with cluster support
npm run dev:cluster

# Start monitoring only
npm run monitor:start

# Test cluster integration
npm run test:cluster

# Monitor queues
npm run monitor:queues
```

## 📈 Performance Tuning

### Redis Cluster Optimization

```bash
# Memory optimization
maxmemory 256mb
maxmemory-policy allkeys-lru

# Network optimization
tcp-keepalive 300
timeout 0

# Persistence optimization
appendonly yes
appendfsync everysec
```

### Queue Optimization

```typescript
// High-throughput queue config
{
  concurrency: 20,
  removeOnComplete: 100,
  removeOnFail: 50,
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000
  }
}
```

### Auto-scaling Optimization

```typescript
// Aggressive scaling for high-load
{
  scaleUpThreshold: 1.2,    // Scale up faster
  scaleDownThreshold: 0.5,  // Scale down slower
  cooldownPeriod: 2,        // Shorter cooldown
  maxWorkers: 50            // Higher ceiling
}
```

## 🔍 Monitoring & Debugging

### Real-time Monitoring

```bash
# Monitor cluster health
watch -n 5 'redis-cli -p 7001 cluster info'

# Monitor queue metrics
curl -s "localhost:3000/api/monitoring?action=queue_metrics&apiKey=your-key" | jq

# Monitor system health
curl -s "localhost:3000/api/monitoring?action=health_check&apiKey=your-key" | jq
```

### Log Analysis

```bash
# Redis cluster logs
tail -f redis-cluster/redis-*.log

# Application logs
tail -f logs/scheduler.log

# System monitoring logs
tail -f logs/monitoring.log
```

### Performance Analysis

```bash
# Redis performance
redis-cli -p 7001 --latency-history

# Queue performance
redis-cli -p 7001 monitor | grep bull

# System performance
htop
iostat -x 1
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Cluster Formation Failed

```bash
# Check if all nodes are running
for port in 7001 7002 7003 7004 7005 7006; do
  redis-cli -p $port ping
done

# Reset cluster if needed
./scripts/setup-redis-cluster.sh clean
./scripts/setup-redis-cluster.sh setup
```

#### 2. High Memory Usage

```bash
# Check memory usage
redis-cli -p 7001 info memory

# Clean old data
redis-cli -p 7001 flushdb

# Adjust maxmemory policy
redis-cli -p 7001 config set maxmemory-policy allkeys-lru
```

#### 3. Queue Processing Slow

```bash
# Check queue metrics
curl "localhost:3000/api/monitoring?action=queue_metrics&apiKey=your-key"

# Increase workers manually
curl -X POST localhost:3000/api/monitoring \
  -d '{"action":"manual_scale","queueName":"slow-queue","targetWorkers":10,"apiKey":"your-key"}'
```

#### 4. Auto-scaling Not Working

```bash
# Check scaling status
curl "localhost:3000/api/monitoring?action=scaling_status&apiKey=your-key"

# Restart auto-scaling
curl -X POST localhost:3000/api/monitoring \
  -d '{"action":"stop_autoscaling","apiKey":"your-key"}'
curl -X POST localhost:3000/api/monitoring \
  -d '{"action":"start_autoscaling","apiKey":"your-key"}'
```

## 🔒 Security Considerations

### Redis Security

```bash
# Enable authentication
requirepass your-strong-password

# Bind to specific interfaces
bind 127.0.0.1 10.0.0.1

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
```

### API Security

```bash
# Use strong API keys
CRON_API_KEY=$(openssl rand -hex 32)

# Enable HTTPS in production
HTTPS=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### Network Security

```bash
# Firewall rules (iptables)
iptables -A INPUT -p tcp --dport 7001:7006 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 7001:7006 -j DROP

# Use VPN for remote access
# Configure Redis AUTH for additional security
```

## 📊 Production Deployment

### Docker Deployment

```dockerfile
# Dockerfile.cluster
FROM node:18-alpine

# Install Redis
RUN apk add --no-cache redis

# Copy application
COPY . /app
WORKDIR /app

# Install dependencies
RUN npm ci --only=production

# Setup cluster
RUN chmod +x scripts/setup-redis-cluster.sh

# Start services
CMD ["sh", "-c", "./scripts/setup-redis-cluster.sh start && npm start"]
```

### Kubernetes Deployment

```yaml
# redis-cluster.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
            - containerPort: 16379
          command:
            - redis-server
            - /etc/redis/redis.conf
          volumeMounts:
            - name: redis-config
              mountPath: /etc/redis
            - name: redis-data
              mountPath: /data
      volumes:
        - name: redis-config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
```

### Load Balancer Configuration

```nginx
# nginx.conf
upstream redis_cluster {
    server 127.0.0.1:7001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:7002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:7003 max_fails=3 fail_timeout=30s;
}

server {
    listen 6379;
    proxy_pass redis_cluster;
    proxy_timeout 1s;
    proxy_responses 1;
}
```

## 📝 Best Practices

### 1. Monitoring

- ✅ Set up alerts untuk semua critical metrics
- ✅ Monitor cluster topology changes
- ✅ Track queue performance trends
- ✅ Set up log aggregation (ELK stack)

### 2. Scaling

- ✅ Start dengan conservative scaling settings
- ✅ Monitor scaling actions dan adjust thresholds
- ✅ Set appropriate min/max worker limits
- ✅ Use manual scaling untuk traffic spikes

### 3. Maintenance

- ✅ Regular backup Redis data
- ✅ Monitor disk space dan memory usage
- ✅ Update Redis dan dependencies regularly
- ✅ Test failover scenarios

### 4. Performance

- ✅ Optimize job processing logic
- ✅ Use appropriate queue priorities
- ✅ Monitor dan optimize database queries
- ✅ Implement caching strategies

## 🎯 Conclusion

Setup ini memberikan:

- **High Availability** dengan Redis cluster dan automatic failover
- **Scalability** dengan auto-scaling workers berdasarkan load
- **Observability** dengan comprehensive monitoring dan alerting
- **Reliability** dengan health checks dan error handling
- **Performance** dengan optimized configurations

Sistem ini siap untuk production dengan load tinggi dan memberikan foundation yang solid untuk aplikasi scheduler yang scalable dan reliable.

## 📞 Support

Untuk pertanyaan atau issues:

1. Check troubleshooting section
2. Review logs untuk error details
3. Test dengan script diagnostics
4. Monitor API endpoints untuk status

Happy scaling! 🚀
