# Redis-Only System Migration

## Overview

Sistem scheduling telah dimigrasi dari hybrid system (Redis BullMQ + node-cron fallback) menjadi **Redis-only system**. Perubahan ini meningkatkan konsistensi dan menghilangkan kompleksitas dari dual system.

## Key Changes

### 1. Removed Fallback System

- ❌ Removed node-cron fallback jobs
- ❌ Removed `switchToFallbackMode()` method
- ❌ Removed all fallback job execution methods
- ✅ Now requires Redis to be available for all operations

### 2. Enhanced Error Handling

- System akan throw error jika Redis tidak tersedia
- Tidak ada fallback ke node-cron lagi
- Clear error messages untuk troubleshooting

### 3. Simplified Architecture

```
Before: Redis BullMQ + node-cron fallback
After:  Redis BullMQ only
```

## Benefits

### ✅ Consistency

- Single system untuk semua job scheduling
- Konsisten job execution behavior
- Tidak ada job duplication issues

### ✅ Reliability

- Better job persistence dengan Redis
- Built-in retry mechanisms dari BullMQ
- Job queue metrics dan monitoring

### ✅ Scalability

- Redis dapat di-cluster untuk high availability
- Better horizontal scaling
- Job distribution across workers

## Requirements

### Redis Server

```bash
# Install Redis (macOS)
brew install redis

# Start Redis
brew services start redis

# Check Redis status
redis-cli ping
```

## API Changes

### Status Response

```json
{
  "initialized": true,
  "useQueues": true,
  "redisAvailable": true,
  "queueManagerReady": true,
  "queueMetrics": { ... },
  "cronJobs": [
    {"name": "publish_due_posts", "running": true},
    {"name": "check_expired_tokens", "running": true}
  ]
}
```

### Error Handling

```json
// When Redis unavailable during initialization
{
  "success": false,
  "error": "Redis is required for job scheduling. Please ensure Redis is running."
}
```

## Migration Steps

1. **Ensure Redis is Running**

   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. **Restart Application**

   ```bash
   npm run dev
   ```

3. **Verify System Status**
   ```bash
   curl "http://localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key"
   ```

## Job Operations

### Initialize System

```bash
curl -X POST "http://localhost:3000/api/cron-manager" \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize", "apiKey": "test-scheduler-key"}'
```

### Trigger Job Manually

```bash
curl -X POST "http://localhost:3000/api/cron-manager" \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger", "jobName": "publish_due_posts", "apiKey": "test-scheduler-key"}'
```

### Stop All Jobs

```bash
curl -X POST "http://localhost:3000/api/cron-manager" \
  -H "Content-Type: application/json" \
  -d '{"action": "stop_all", "apiKey": "test-scheduler-key"}'
```

## Monitoring

### Frontend

- Cron Job Monitor dashboard menampilkan status 7/7 jobs
- Real-time job metrics dan statistics
- Manual job trigger dari UI

### Logs

```bash
# Check application logs
tail -f logs/app.log

# Check Redis logs
redis-cli monitor
```

## Troubleshooting

### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# Check Redis configuration
redis-cli config get '*'

# Restart Redis
brew services restart redis
```

### Job Not Running

1. Check Redis availability
2. Check queue status via API
3. Check application logs
4. Verify job configuration

## Performance Benefits

### Before (Hybrid System)

- ⚠️ Double job execution risks
- ⚠️ Inconsistent job status
- ⚠️ Complex error handling
- ⚠️ Resource overhead from dual systems

### After (Redis-Only)

- ✅ Single source of truth
- ✅ Consistent job execution
- ✅ Better error tracking
- ✅ Reduced resource usage
- ✅ Improved monitoring capabilities

## Next Steps

1. **Monitor System Performance**

   - Track job success rates
   - Monitor Redis memory usage
   - Watch for any scheduling issues

2. **Consider Redis High Availability**

   - Setup Redis Sentinel for failover
   - Consider Redis Cluster for scaling
   - Implement backup strategies

3. **Enhanced Monitoring**
   - Add Prometheus metrics
   - Setup alerting for Redis downtime
   - Dashboard untuk job performance tracking
