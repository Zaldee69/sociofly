const { checkRedisConnection } = require('../src/lib/queue/redis-connection.ts');

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...');
  
  try {
    const isConnected = await checkRedisConnection();
    
    if (isConnected) {
      console.log('✅ Redis connection successful!');
      console.log('🔧 Environment variables:');
      console.log('  REDIS_HOST:', process.env.REDIS_HOST || 'localhost (default)');
      console.log('  REDIS_PORT:', process.env.REDIS_PORT || '6379 (default)');
      console.log('  REDIS_DB:', process.env.REDIS_DB || '0 (default)');
      console.log('  REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '[SET]' : '[NOT SET]');
    } else {
      console.log('❌ Redis connection failed!');
      console.log('🔧 Current configuration:');
      console.log('  REDIS_HOST:', process.env.REDIS_HOST || 'localhost (default)');
      console.log('  REDIS_PORT:', process.env.REDIS_PORT || '6379 (default)');
      console.log('  REDIS_DB:', process.env.REDIS_DB || '0 (default)');
    }
    
    process.exit(isConnected ? 0 : 1);
  } catch (error) {
    console.error('💥 Error testing Redis connection:', error);
    process.exit(1);
  }
}

testRedisConnection(); 