# BullMQ Integration Documentation

## Overview

Sistem job queue yang terintegrasi dengan **BullMQ** dan **Redis** untuk menjalankan tugas-tugas asinkron dengan lebih robust dan scalable dibandingkan node-cron tradisional.

### Features yang Ditambahkan:

- ✅ **Queue Management** - Multiple queues dengan prioritas berbeda
- 🔄 **Job Retry Logic** - Automatic retry dengan exponential backoff
- 📊 **Queue Monitoring** - Real-time metrics dan status
- ⚡ **Scalability** - Support multiple workers dan horizontal scaling
- 🔒 **Reliability** - Job persistence di Redis
- 🎯 **Job Types** - Berbagai jenis job dengan type safety
- 📈 **Performance** - Concurrency control dan load balancing

## Quick Start

### 1. Environment Variables

Tambahkan ke file `.env`:

```bash
# Redis Configuration (Required for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password  # Optional
REDIS_DB=0                          # Optional

# Existing Cron Configuration
ENABLE_CRON_JOBS=true
CRON_API_KEY=your-secure-cron-api-key
TZ=Asia/Jakarta
```

### 2. Start Redis Server

```bash
# Using Docker
docker run -d -p 6379:6379 --name redis redis:latest

# Using Homebrew (macOS)
brew install redis
brew services start redis

# Using apt (Ubuntu/Debian)
sudo apt install redis-server
sudo systemctl start redis
```

### 3. Start Development Server

```bash
npm run dev:cron
```

Sistem akan:

- ✅ Mengecek koneksi Redis
- 🚀 Initialize BullMQ jika Redis tersedia
- ⚠️ Fallback ke node-cron jika Redis tidak tersedia

## Queue Architecture

### Available Queues

| Queue Name      | Priority | Concurrency | Description                     |
| --------------- | -------- | ----------- | ------------------------------- |
| `high-priority` | High     | 5           | Critical tasks yang butuh cepat |
| `scheduler`     | Medium   | 3           | Post publishing dan scheduling  |
| `notifications` | Medium   | 10          | Email, push notifications       |
| `webhooks`      | Medium   | 5           | Webhook processing              |
| `reports`       | Low      | 2           | Report generation               |
| `social-sync`   | Low      | 3           | Social media synchronization    |
| `maintenance`   | Low      | 1           | Cleanup dan maintenance tasks   |

### Job Types

```typescript
enum JobType {
  PUBLISH_POST = "publish_post",
  PROCESS_APPROVAL = "process_approval",
  CHECK_EXPIRED_TOKENS = "check_expired_tokens",
  SYSTEM_HEALTH_CHECK = "system_health_check",
  CLEANUP_OLD_LOGS = "cleanup_old_logs",
  SEND_NOTIFICATION = "send_notification",
  PROCESS_WEBHOOK = "process_webhook",
  GENERATE_REPORT = "generate_report",
  SOCIAL_MEDIA_SYNC = "social_media_sync",
}
```

## API Usage

### 1. Queue Management

#### Get Queue Status

```bash
curl "http://localhost:3000/api/queue-manager?action=status&apiKey=your-key"
```

#### Get Queue Metrics

```bash
curl "http://localhost:3000/api/queue-manager?action=queue_metrics&apiKey=your-key"
```

#### Pause/Resume Queue

```bash
# Pause queue
curl -X POST http://localhost:3000/api/queue-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "pause_queue",
    "queueName": "scheduler",
    "apiKey": "your-key"
  }'

# Resume queue
curl -X POST http://localhost:3000/api/queue-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "resume_queue",
    "queueName": "scheduler",
    "apiKey": "your-key"
  }'
```

### 2. Job Scheduling

#### Schedule Post Publishing

```bash
curl -X POST http://localhost:3000/api/queue-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "schedule_post_publish",
    "postId": "post_123",
    "platform": "facebook",
    "userId": "user_456",
    "scheduledAt": "2024-12-01T10:00:00Z",
    "content": {
      "text": "Hello World!",
      "hashtags": ["#test", "#bullmq"]
    },
    "delay": 300000,
    "priority": 5,
    "apiKey": "your-key"
  }'
```

#### Schedule Health Check

```bash
curl -X POST http://localhost:3000/api/queue-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "schedule_health_check",
    "checkType": "full",
    "alertThreshold": 70,
    "apiKey": "your-key"
  }'
```

#### Schedule Notification

```bash
curl -X POST http://localhost:3000/api/queue-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "schedule_notification",
    "userId": "user_123",
    "type": "email",
    "template": "post_published",
    "data": {
      "postTitle": "My Post",
      "platform": "Facebook"
    },
    "priority": "urgent",
    "delay": 5000,
    "apiKey": "your-key"
  }'
```

### 3. Custom Job Queuing

```bash
curl -X POST http://localhost:3000/api/queue-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "queue_job",
    "queueName": "notifications",
    "jobType": "send_notification",
    "data": {
      "userId": "user_123",
      "type": "email",
      "template": "welcome",
      "data": {"name": "John Doe"}
    },
    "options": {
      "delay": 10000,
      "attempts": 3,
      "priority": 5
    },
    "apiKey": "your-key"
  }'
```

## Programmatic Usage

### Initialize Enhanced Cron Manager

```typescript
import { EnhancedCronManager } from "@/lib/services/enhanced-cron-manager";

// Initialize (automatically detects Redis availability)
await EnhancedCronManager.initialize();

// Check status
const status = await EnhancedCronManager.getEnhancedStatus();
console.log(status);
```

### Queue Jobs Programmatically

```typescript
import { QueueManager } from "@/lib/queue/queue-manager";
import { JobType } from "@/lib/queue/job-types";

// Queue a post for publishing
await EnhancedCronManager.queueJob(
  QueueManager.QUEUES.SCHEDULER,
  JobType.PUBLISH_POST,
  {
    postId: "post_123",
    userId: "user_456",
    platform: "facebook",
    scheduledAt: new Date(),
    content: {
      text: "Hello World!",
      hashtags: ["#test"],
    },
  },
  {
    delay: 5 * 60 * 1000, // 5 minutes delay
    attempts: 3,
    priority: 5,
  }
);
```

### Queue Management

```typescript
const queueManager = EnhancedCronManager.getQueueManager();

if (queueManager) {
  // Get metrics
  const metrics = await queueManager.getQueueMetrics("scheduler");

  // Pause queue
  await queueManager.pauseQueue("scheduler");

  // Resume queue
  await queueManager.resumeQueue("scheduler");

  // Clean completed jobs
  await queueManager.cleanQueue("scheduler", "completed", 3600000);
}
```

## Monitoring & Dashboard

### Queue Metrics

```typescript
{
  "scheduler": {
    "waiting": 5,      // Jobs waiting to be processed
    "active": 2,       // Jobs currently being processed
    "completed": 150,  // Completed jobs
    "failed": 3,       // Failed jobs
    "delayed": 10,     // Delayed jobs
    "paused": 0        // Whether queue is paused
  }
}
```

### Enhanced Status

```typescript
{
  "initialized": true,
  "useQueues": true,
  "cronJobs": [
    {
      "name": "publish_due_posts",
      "running": true,
      "type": "cron"
    }
  ],
  "queueMetrics": {
    "scheduler": { /* metrics */ },
    "notifications": { /* metrics */ }
  },
  "totalJobs": 5,
  "runningJobs": 5
}
```

## Fallback Strategy

### Redis Tidak Tersedia

Jika Redis tidak tersedia, sistem akan:

1. ⚠️ **Fallback ke node-cron** - Semua recurring jobs tetap berjalan
2. 🚫 **Disable queue features** - Job queuing tidak tersedia
3. ✅ **Continue operation** - App tetap berjalan normal
4. 📝 **Log warnings** - Warning di console tentang Redis status

```bash
⚠️  Redis not available - Using node-cron fallback only
🕒 Registered cron job: publish_due_posts (*/5 * * * *) - Publish posts that are due for publication
```

## Job Configuration Examples

### High Priority Job (Critical)

```typescript
await EnhancedCronManager.queueJob(
  QueueManager.QUEUES.HIGH_PRIORITY,
  JobType.PROCESS_APPROVAL,
  { postId: "urgent_post_123" },
  {
    priority: 10, // Highest priority
    attempts: 5, // More retry attempts
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  }
);
```

### Delayed Job (Schedule for later)

```typescript
await EnhancedCronManager.queueJob(
  QueueManager.QUEUES.SCHEDULER,
  JobType.PUBLISH_POST,
  { postId: "post_123" },
  {
    delay: 24 * 60 * 60 * 1000, // 24 hours delay
    priority: 1,
  }
);
```

### Recurring Job (Custom pattern)

```typescript
const queueManager = EnhancedCronManager.getQueueManager();
if (queueManager) {
  await queueManager.scheduleRecurringJob(
    QueueManager.QUEUES.MAINTENANCE,
    JobType.CLEANUP_OLD_LOGS,
    { olderThanDays: 7 },
    "0 2 * * *" // Daily at 2 AM
  );
}
```

## Error Handling & Retry Logic

### Automatic Retry

```typescript
// Jobs automatically retry with exponential backoff
{
  attempts: 3,
  backoff: {
    type: 'exponential',  // or 'fixed'
    delay: 2000          // Base delay in ms
  }
}
```

### Retry Pattern

1. **First Attempt** - Immediate execution
2. **First Retry** - After 2 seconds
3. **Second Retry** - After 4 seconds
4. **Third Retry** - After 8 seconds
5. **Failed** - Job marked as failed

### Failed Job Handling

```typescript
// Jobs that fail after all retries are:
// 1. Logged to database
// 2. Kept in Redis for inspection
// 3. Available in queue metrics
```

## Production Deployment

### 1. Redis Setup

```bash
# Production Redis with persistence
redis-server --appendonly yes --appendfsync everysec

# Or using Redis Cloud/ElastiCache
REDIS_HOST=your-redis-cluster.redis.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-production-password
```

### 2. Environment Variables

```bash
# Production settings
NODE_ENV=production
ENABLE_CRON_JOBS=true

# Redis configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0

# Security
CRON_API_KEY=your-very-secure-api-key
```

### 3. Process Management

```bash
# Using PM2 for process management
pm2 start npm --name "scheduler-app" -- run start

# Monitor processes
pm2 monit

# View logs
pm2 logs scheduler-app
```

### 4. Scaling Workers

```typescript
// Increase concurrency for high-load queues
const queueConfigs = [
  { name: "notifications", concurrency: 20 }, // Increased from 10
  { name: "scheduler", concurrency: 10 }, // Increased from 3
];
```

## Performance Optimization

### 1. Queue Separation

- **High-priority**: Critical tasks only
- **Scheduler**: Time-sensitive publishing
- **Notifications**: Bulk notifications
- **Maintenance**: Background cleanup

### 2. Concurrency Tuning

```typescript
// Adjust based on your server capacity
const workerConfigs = [
  { name: "high-priority", concurrency: 5 },
  { name: "scheduler", concurrency: 3 },
  { name: "notifications", concurrency: 10 },
];
```

### 3. Job Cleanup

```typescript
// Automatically clean old jobs
defaultJobOptions: {
  removeOnComplete: 50,  // Keep last 50 completed
  removeOnFail: 20,      // Keep last 20 failed
}
```

## Troubleshooting

### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# Check connection from app
curl "localhost:3000/api/queue-manager?action=status&apiKey=your-key"
```

### Queue Stuck Issues

```bash
# Clean stuck jobs
curl -X POST localhost:3000/api/queue-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "clean_queue",
    "queueName": "scheduler",
    "cleanType": "active",
    "age": 300000,
    "apiKey": "your-key"
  }'
```

### High Memory Usage

```bash
# Monitor Redis memory
redis-cli info memory

# Clean old jobs
curl -X POST localhost:3000/api/queue-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "clean_queue",
    "queueName": "scheduler",
    "cleanType": "completed",
    "age": 86400000,
    "apiKey": "your-key"
  }'
```

## Migration Guide

### From node-cron to BullMQ

1. **Install Dependencies**

   ```bash
   npm install bullmq ioredis @types/ioredis
   ```

2. **Setup Redis**

   ```bash
   docker run -d -p 6379:6379 redis:latest
   ```

3. **Update Environment**

   ```bash
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

4. **Replace Imports**

   ```typescript
   // Old
   import { CronManager } from "@/lib/services/cron-manager";

   // New
   import { EnhancedCronManager } from "@/lib/services/enhanced-cron-manager";
   ```

5. **Update Initialization**

   ```typescript
   // Old
   await CronManager.initialize();

   // New
   await EnhancedCronManager.initialize();
   ```

## Advanced Features

### Custom Job Processing

```typescript
// Extend JobProcessor for custom logic
class CustomJobProcessor extends JobProcessor {
  static async processCustomJob(data: any): Promise<any> {
    // Your custom logic here
    return { status: "completed", result: data };
  }
}
```

### Job Progress Tracking

```typescript
// Track job progress
worker.on("progress", (job, progress) => {
  console.log(`Job ${job.name} is ${progress}% complete`);
});
```

### Job Dependencies

```typescript
// Schedule dependent jobs
const job1 = await queueManager.addJob("queue1", "job1", data1);
const job2 = await queueManager.addJob("queue1", "job2", data2, {
  delay: 60000, // Wait for job1 to complete
});
```

## Best Practices

### 1. Job Design

- ✅ Keep jobs idempotent
- ✅ Handle failures gracefully
- ✅ Use appropriate queue priorities
- ✅ Set reasonable retry limits

### 2. Error Handling

- ✅ Log errors with context
- ✅ Use structured error messages
- ✅ Implement proper fallbacks
- ✅ Monitor failure rates

### 3. Performance

- ✅ Monitor queue lengths
- ✅ Adjust concurrency based on load
- ✅ Clean old jobs regularly
- ✅ Use appropriate Redis configuration

### 4. Security

- ✅ Secure Redis access
- ✅ Use strong API keys
- ✅ Validate job data
- ✅ Implement rate limiting

## Conclusion

BullMQ integration memberikan:

- 🚀 **Better Performance** - Concurrent job processing
- 🔒 **Better Reliability** - Job persistence & retry logic
- 📊 **Better Monitoring** - Real-time metrics & insights
- ⚡ **Better Scalability** - Horizontal scaling support
- 🛠️ **Better Developer Experience** - Type-safe job definitions

Sistem akan secara otomatis fallback ke node-cron jika Redis tidak tersedia, memastikan aplikasi tetap berjalan dalam segala kondisi.
