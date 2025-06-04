# Troubleshooting & Fixes Documentation

Komprehensif guide untuk mengatasi masalah umum dan errors.

## 📋 Daftar Dokumentasi

### 🚨 Common Issues & Solutions

- **[Cron Troubleshooting](CRON_TROUBLESHOOTING.md)** - Masalah cron job dan penjadwalan
- **[Quick Cron Fix](QUICK_CRON_FIX.md)** - Quick fixes untuk cron issues
- **[Permission Fixes](README-PERMISSION-FIXES.md)** - Permission dan authentication issues

## 🔍 Quick Diagnostics

### System Health Check

```bash
# Overall system health
npm run monitor:health

# Redis cluster status
npm run cluster:status

# Queue system status
npm run queue:status

# Cron job status
npm run cron:status
```

### Component Testing

```bash
# Test Redis connection
npm run test:cluster

# Test BullMQ integration
npm run test:bullmq

# Test cron system
npm run test:cron
```

## 🚨 Common Issues

### 1. Redis Connection Issues

**Symptoms:**

- Connection timeouts
- Queue jobs not processing
- Monitoring system down

**Quick Diagnosis:**

```bash
# Check Redis status
redis-cli ping

# Check cluster nodes
npm run cluster:status

# Test from application
npm run test:cluster
```

**Solutions:**

```bash
# Restart Redis cluster
npm run cluster:restart

# Reset Redis configuration
npm run cluster:clean
npm run cluster:setup

# Check Redis logs
tail -f redis-cluster/redis-*.log
```

### 2. Queue Processing Problems

**Symptoms:**

- Jobs stuck in waiting state
- High failed job count
- Slow processing times

**Quick Diagnosis:**

```bash
# Check queue metrics
npm run queue:metrics

# Monitor queue performance
npm run queue:monitor

# Check worker status
npm run scaling:status
```

**Solutions:**

```bash
# Clean stuck jobs
npm run queue:clean

# Restart queue system
npm run queue:init

# Manual scaling
npm run scaling:manual

# Check job processor logs
tail -f logs/queue-processor.log
```

### 3. Cron Job Issues

**Symptoms:**

- Scheduled jobs not running
- Cron system not starting
- Job execution failures

**Quick Diagnosis:**

```bash
# Check cron status
npm run cron:status

# Check cron statistics
npm run cron:stats

# Monitor cron activities
npm run cron:monitor
```

**Solutions:**

```bash
# Restart cron system
npm run cron:restart

# Check cron configuration
npm run cron:status

# Check scheduler logs
tail -f logs/scheduler.log
```

### 4. High Memory Usage

**Symptoms:**

- System slow performance
- Out of memory errors
- Redis memory warnings

**Quick Diagnosis:**

```bash
# Check system metrics
npm run monitor:system

# Check Redis memory
npm run monitor:redis

# Check application memory
htop
```

**Solutions:**

```bash
# Clean Redis data
redis-cli flushdb

# Clean completed jobs
npm run queue:clean

# Restart application
pm2 restart scheduler-app

# Optimize Redis configuration
redis-cli config set maxmemory-policy allkeys-lru
```

### 5. Auto-scaling Not Working

**Symptoms:**

- Workers not scaling up/down
- High queue load persists
- Scaling system inactive

**Quick Diagnosis:**

```bash
# Check scaling status
npm run scaling:status

# Check scaling metrics
npm run scaling:metrics

# Check load metrics
npm run monitor:queues
```

**Solutions:**

```bash
# Restart auto-scaling
npm run scaling:stop
npm run scaling:start

# Manual scaling
npm run scaling:manual

# Update scaling configuration
npm run scaling:config

# Check scaling logs
tail -f logs/autoscaler.log
```

## 🔧 Debugging Tools

### Log Analysis

```bash
# Application logs
tail -f logs/scheduler.log
tail -f logs/monitoring.log
tail -f logs/autoscaler.log

# Redis cluster logs
tail -f redis-cluster/redis-*.log

# System logs (Linux)
journalctl -f -u redis-cluster
```

### Performance Analysis

```bash
# Redis performance
redis-cli --latency-history -i 1

# System performance
htop
iostat -x 1
vmstat 1

# Network performance
netstat -i
ss -tuln
```

### Memory Analysis

```bash
# Redis memory
redis-cli info memory

# System memory
free -h
cat /proc/meminfo

# Node.js memory
node --inspect app.js
# Use Chrome DevTools for memory profiling
```

## 🔍 Advanced Troubleshooting

### Redis Cluster Issues

```bash
# Check cluster nodes
redis-cli -p 7001 cluster nodes

# Check cluster info
redis-cli -p 7001 cluster info

# Fix cluster state
redis-cli -p 7001 cluster fix

# Reshard cluster (if needed)
redis-cli --cluster reshard 127.0.0.1:7001
```

### Database Issues

```bash
# Check database connections
npx prisma studio

# Run database migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Performance Issues

```bash
# Profile application
node --prof app.js
# Process profile: node --prof-process isolate-*.log

# Monitor database queries
npx prisma studio
# Enable query logging

# Monitor API performance
curl -w "@curl-format.txt" -o /dev/null -s "localhost:3000/api/health"
```

## 📋 Troubleshooting Checklist

### Before Reporting Issues

- [ ] Check system health: `npm run monitor:health`
- [ ] Review error logs: `tail -f logs/*.log`
- [ ] Test basic connectivity: `npm run test:cluster`
- [ ] Check resource usage: `htop` / `free -h`
- [ ] Verify configuration: Environment variables set
- [ ] Try restarting services: `npm run cluster:restart`

### Information to Collect

- System health output
- Error messages from logs
- Environment configuration
- Resource usage statistics
- Recent changes or deployments
- Steps to reproduce the issue

## 🆘 Emergency Procedures

### System Down

```bash
# 1. Quick health check
npm run monitor:health

# 2. Restart critical services
npm run cluster:restart
npm run queue:init
npm run monitor:start

# 3. Check logs for errors
tail -f logs/scheduler.log

# 4. Enable fallback mode (if needed)
export REDIS_USE_CLUSTER=false
npm run dev:cron
```

### Data Recovery

```bash
# 1. Stop all services
npm run cluster:stop

# 2. Backup current state
cp -r redis-cluster redis-cluster-backup

# 3. Restore from backup (if available)
cp -r redis-cluster-backup-date redis-cluster

# 4. Restart services
npm run cluster:start
```

## 📚 Related Documentation

- **[Infrastructure Guide](../infrastructure/)** - Setup and configuration
- **[Operations Guide](../operations/)** - Monitoring and management
- **[Development Guide](../development/)** - Development best practices

## 📞 Support Resources

### Internal Documentation

- [System Architecture](../infrastructure/README.md)
- [API Documentation](../infrastructure/BULLMQ_INTEGRATION.md)
- [Configuration Guide](../README.md#configuration)

### External Resources

- [Redis Troubleshooting](https://redis.io/docs/manual/admin/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Node.js Debugging](https://nodejs.org/en/docs/guides/debugging-getting-started/)

---

**Last Updated**: December 2024  
**Status**: Comprehensive  
**Coverage**: Production Issues
