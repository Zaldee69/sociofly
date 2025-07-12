import { Queue, Worker } from 'bullmq';
import { RedisManager } from '../src/lib/services/redis-manager';

async function stopNotificationsQueue() {
  console.log('🔄 Stopping notifications queue and worker...');
  
  try {
    // Get Redis connection
    const redisManager = RedisManager.getInstance();
    const connectionOptions = redisManager.getConnectionOptions();
    
    console.log('📡 Connecting to Redis...');
    
    // Create queue instance
    const notificationsQueue = new Queue('notifications', {
      connection: connectionOptions,
    });
    
    console.log('🔍 Checking notifications queue status...');
    
    // Get queue stats
    const waiting = await notificationsQueue.getWaiting();
    const active = await notificationsQueue.getActive();
    const delayed = await notificationsQueue.getDelayed();
    const completed = await notificationsQueue.getCompleted();
    const failed = await notificationsQueue.getFailed();
    
    console.log(`📊 Queue stats:`);
    console.log(`  - Waiting jobs: ${waiting.length}`);
    console.log(`  - Active jobs: ${active.length}`);
    console.log(`  - Delayed jobs: ${delayed.length}`);
    console.log(`  - Completed jobs: ${completed.length}`);
    console.log(`  - Failed jobs: ${failed.length}`);
    
    // Remove all repeatable jobs
    const repeatableJobs = await notificationsQueue.getRepeatableJobs();
    console.log(`🔄 Found ${repeatableJobs.length} repeatable jobs`);
    
    for (const job of repeatableJobs) {
      await notificationsQueue.removeRepeatableByKey(job.key);
      console.log(`❌ Removed repeatable job: ${job.key}`);
    }
    
    // Clean up all jobs in different states
    console.log('🧹 Cleaning up all jobs...');
    
    // Remove waiting jobs
    if (waiting.length > 0) {
      for (const job of waiting) {
        await job.remove();
      }
      console.log(`❌ Removed ${waiting.length} waiting jobs`);
    }
    
    // Remove active jobs (force)
    if (active.length > 0) {
      for (const job of active) {
        await job.remove();
      }
      console.log(`❌ Removed ${active.length} active jobs`);
    }
    
    // Remove delayed jobs
    if (delayed.length > 0) {
      for (const job of delayed) {
        await job.remove();
      }
      console.log(`❌ Removed ${delayed.length} delayed jobs`);
    }
    
    // Clean completed and failed jobs
    await notificationsQueue.clean(0, 1000, 'completed');
    await notificationsQueue.clean(0, 1000, 'failed');
    console.log('🧹 Cleaned completed and failed jobs');
    
    // Obliterate the queue (removes all data)
    await notificationsQueue.obliterate({ force: true });
    console.log('💥 Queue obliterated');
    
    // Close the queue
    await notificationsQueue.close();
    console.log('🔒 Queue connection closed');
    
    console.log('✅ Notifications queue stopped successfully!');
    console.log('📝 Note: The notificationWorker in notification.service.ts should also be removed or commented out');
    
  } catch (error) {
    console.error('❌ Error stopping notifications queue:', error);
    process.exit(1);
  }
}

// Run the script
stopNotificationsQueue()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });