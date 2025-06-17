import { Redis } from "ioredis";

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  connectTimeout: 10000,
  commandTimeout: 5000,
  lazyConnect: true,
};

// Create Redis connection
export const redis = new Redis(redisConfig);

// Handle connection events
redis.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redis.on("error", (error) => {
  console.error("❌ Redis connection error:", error);
});

redis.on("reconnecting", () => {
  console.log("🔄 Redis reconnecting...");
});

redis.on("ready", () => {
  console.log("🚀 Redis ready for operations");
});

// Export connection options for BullMQ
export const redisConnectionOptions = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: redisConfig.retryDelayOnFailover,
  connectTimeout: 10000,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
};

// Health check function
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}
