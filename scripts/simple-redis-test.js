#!/usr/bin/env node

/**
 * Simple Redis Connection Test
 * 
 * Test Redis connection without TypeScript dependencies
 * Usage: node scripts/simple-redis-test.js
 */

const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('🧪 Testing Redis Connection...\n');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  try {
    console.log('1️⃣  Connecting to Redis...');
    await redis.connect();
    console.log('✅ Connected to Redis successfully');

    console.log('\n2️⃣  Testing PING command...');
    const pong = await redis.ping();
    console.log(`✅ PING response: ${pong}`);

    console.log('\n3️⃣  Testing basic operations...');
    await redis.set('test:redis-only-migration', 'success');
    const value = await redis.get('test:redis-only-migration');
    console.log(`✅ SET/GET test: ${value}`);

    console.log('\n4️⃣  Testing Redis info...');
    const info = await redis.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    console.log(`✅ Redis version: ${version}`);

    console.log('\n5️⃣  Cleaning up test data...');
    await redis.del('test:redis-only-migration');
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Redis connection test completed successfully!');
    console.log('✅ Redis is ready for job scheduling');
    
    await redis.disconnect();
    return true;
  } catch (error) {
    console.error('\n❌ Redis connection test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   • Ensure Redis is running: brew services start redis');
    console.log('   • Check Redis status: redis-cli ping');
    console.log('   • Verify Redis configuration');
    
    try {
      await redis.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    
    return false;
  }
}

if (require.main === module) {
  testRedisConnection()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testRedisConnection }; 