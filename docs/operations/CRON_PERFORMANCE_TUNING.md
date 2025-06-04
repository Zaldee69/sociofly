# Cron Job Performance Tuning Guide

Panduan lengkap untuk mengoptimalkan performance cron job dan mengurangi beban sistem.

## 🚨 Masalah Performance yang Diperbaiki

### ❌ Masalah Sebelumnya:

- **Interval terlalu jarang**: Publish due posts setiap 5 menit → timing tidak akurat
- **Query tidak eficient**: Banyak query database per post
- **Logging berlebihan**: Setiap post membuat log entry terpisah
- **Sequential processing**: Posts diproses satu per satu
- **Tidak ada batasan**: Semua due posts diproses sekaligus

### ✅ Optimisasi yang Diterapkan:

- **Interval optimal**: 1 menit untuk timing yang akurat
- **Batch processing**: Maksimal 10 posts per batch (configurable)
- **Parallel processing**: Posts diproses secara paralel
- **Single batch logging**: Satu log entry per batch
- **Efficient queries**: Optimized database queries dengan proper joins

## ⚙️ Konfigurasi Performance

### Environment Variables

```bash
# Performance Tuning
CRON_BATCH_SIZE=10              # Posts per batch (default: 10)
CRON_PUBLISH_ENABLED=true       # Enable/disable publish cron
CRON_EDGE_CASES_ENABLED=true    # Enable/disable edge cases
CRON_TOKEN_CHECK_ENABLED=true   # Enable/disable token checks
CRON_HEALTH_CHECK_ENABLED=true  # Enable/disable health checks
CRON_CLEANUP_ENABLED=true       # Enable/disable log cleanup

# Timezone
TZ=Asia/Jakarta                 # Timezone for cron jobs
```

### Batch Size Recommendations

```bash
# System Load vs Batch Size
# Low Load (< 50 pending posts)
CRON_BATCH_SIZE=15

# Normal Load (50-100 pending posts)
CRON_BATCH_SIZE=10              # Default

# High Load (100+ pending posts)
CRON_BATCH_SIZE=5

# Overloaded System
CRON_BATCH_SIZE=3
```

## 📊 Performance Monitoring

### Commands untuk Monitoring

```bash
# Analyze cron performance (last 24 hours)
npm run cron:monitor

# Real-time status monitoring
npm run cron:watch

# Quick status check
npm run cron:status

# Statistics
npm run cron:stats
```

### Performance Metrics

```bash
# Cron Monitor Output Example
📊 Cron Job Performance Analysis

📈 Performance Summary (Last 24 Hours):
──────────────────────────────────────

✅ PUBLISH_DUE_POSTS_BATCH
   Runs: 1440                    # Every minute = 1440 runs/day
   Success Rate: 98.5%           # Target: >95%
   Avg Execution: 2,150ms        # Target: <5000ms
   Last Run: 12/15/2024, 2:30:00 PM

🟡 SYSTEM_HEALTH_CHECK
   Runs: 96                      # Every 15 minutes = 96 runs/day
   Success Rate: 100%
   Avg Execution: 890ms
   Last Run: 12/15/2024, 2:30:00 PM
```

## 🔧 Troubleshooting Performance Issues

### 1. High Execution Time (>10 seconds)

**Symptoms:**

- Cron jobs taking longer than 10 seconds
- System becoming unresponsive
- High CPU/Memory usage

**Solutions:**

```bash
# Reduce batch size
export CRON_BATCH_SIZE=5

# Disable non-critical jobs temporarily
export CRON_HEALTH_CHECK_ENABLED=false
export CRON_EDGE_CASES_ENABLED=false

# Check database performance
npm run test:cluster  # Check Redis cluster
npm run queue:metrics # Check queue performance
```

### 2. High Failure Rate (>5%)

**Symptoms:**

- Success rate below 95%
- Many posts failing to publish
- Error logs increasing

**Solutions:**

```bash
# Check recent errors
npm run cron:monitor

# Test publishing manually
npm run test:facebook
npm run test:instagram

# Check social account tokens
curl 'localhost:3000/api/cron-manager?action=trigger&jobName=check_expired_tokens&apiKey=test-scheduler-key'

# Review system health
npm run monitor:health
```

### 3. Memory Leaks

**Symptoms:**

- Memory usage increasing over time
- System becoming slower
- Out of memory errors

**Solutions:**

```bash
# Restart cron jobs
npm run cron:restart

# Clean old logs
curl -X POST localhost:3000/api/cron-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger", "jobName": "cleanup_old_logs", "apiKey": "test-scheduler-key"}'

# Monitor memory usage
npm run monitor:system
```

### 4. Database Overload

**Symptoms:**

- Slow database queries
- Connection timeouts
- High database CPU

**Solutions:**

```bash
# Reduce batch size significantly
export CRON_BATCH_SIZE=3

# Check database connections
npx prisma studio

# Optimize queries (if needed)
# Review scheduler.service.ts for query optimization
```

## 📈 Performance Optimization Strategies

### 1. Dynamic Batch Sizing

```typescript
// Auto-adjust batch size based on system load
const getCurrentLoad = async () => {
  const pendingPosts = await prisma.post.count({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
  });

  if (pendingPosts > 100) return 5; // High load
  if (pendingPosts > 50) return 10; // Normal load
  return 15; // Low load
};
```

### 2. Intelligent Scheduling

```typescript
// Prioritize posts by urgency
const duePosts = await prisma.post.findMany({
  where: {
    status: PostStatus.SCHEDULED,
    scheduledAt: { lte: now },
  },
  orderBy: [
    { scheduledAt: "asc" }, // Oldest first
    { createdAt: "asc" }, // Then by creation date
  ],
  take: BATCH_SIZE,
});
```

### 3. Error Recovery

```typescript
// Retry failed posts with exponential backoff
const retryFailedPosts = async () => {
  const failedPosts = await prisma.post.findMany({
    where: {
      status: PostStatus.FAILED,
      updatedAt: {
        lt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      },
    },
    take: 5, // Small batch for retries
  });

  // Retry logic here
};
```

## 🏆 Best Practices

### 1. **Monitoring is Essential**

```bash
# Set up daily monitoring routine
0 9 * * * npm run cron:monitor | mail -s "Daily Cron Report" admin@example.com
```

### 2. **Progressive Batch Sizing**

```bash
# Start small and increase gradually
# Week 1: CRON_BATCH_SIZE=5
# Week 2: CRON_BATCH_SIZE=8
# Week 3: CRON_BATCH_SIZE=10
# Monitor performance at each step
```

### 3. **Resource Allocation**

```bash
# For high-volume systems, consider:
# - Dedicated database for cron jobs
# - Redis cluster for queue management
# - Separate server for cron processing
```

### 4. **Graceful Degradation**

```bash
# If system is overloaded:
# 1. Reduce batch size automatically
# 2. Disable non-critical jobs
# 3. Increase interval if needed
# 4. Alert administrators
```

## 🚨 Emergency Procedures

### System Overload

```bash
# Immediate actions:
1. Stop all cron jobs
   npm run cron:stop

2. Reduce batch size
   export CRON_BATCH_SIZE=2

3. Disable non-critical jobs
   export CRON_HEALTH_CHECK_ENABLED=false
   export CRON_EDGE_CASES_ENABLED=false

4. Restart with minimal load
   npm run cron:restart

5. Monitor closely
   npm run cron:monitor
```

### Database Issues

```bash
# Database recovery:
1. Check database status
   npx prisma studio

2. Restart cron with minimal batch
   export CRON_BATCH_SIZE=1
   npm run cron:restart

3. Process posts manually if needed
   curl -X POST localhost:3000/api/cron-manager \
     -H "Content-Type: application/json" \
     -d '{"action": "trigger", "jobName": "publish_due_posts", "apiKey": "test-scheduler-key"}'
```

## 📊 Performance Benchmarks

### Target Performance Metrics

```bash
# Excellent Performance:
Success Rate: >98%
Avg Execution: <3000ms
Posts/Hour: >500

# Good Performance:
Success Rate: >95%
Avg Execution: <5000ms
Posts/Hour: >200

# Acceptable Performance:
Success Rate: >90%
Avg Execution: <10000ms
Posts/Hour: >100

# Poor Performance (needs optimization):
Success Rate: <90%
Avg Execution: >10000ms
Posts/Hour: <100
```

### Load Testing

```bash
# Simulate high load:
# 1. Create 100+ scheduled posts
# 2. Set all to publish in next 5 minutes
# 3. Monitor performance during processing
# 4. Adjust batch size accordingly
```

## 🔗 Related Documentation

- **[Cron Troubleshooting](../troubleshooting/CRON_TROUBLESHOOTING.md)** - Masalah umum cron job
- **[System Monitoring](SYSTEM_MONITORING.md)** - Monitoring sistem secara keseluruhan
- **[Database Optimization](../infrastructure/DATABASE_OPTIMIZATION.md)** - Optimasi database

---

**Last Updated**: December 2024  
**Status**: Optimized Performance  
**Batch Processing**: ✅ Implemented  
**Monitoring**: ✅ Available
