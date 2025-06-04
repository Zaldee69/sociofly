import { Cluster, Redis } from "ioredis";

interface RedisClusterNode {
  host: string;
  port: number;
}

// Redis Cluster Configuration
const redisClusterNodes: RedisClusterNode[] = [
  {
    host: process.env.REDIS_CLUSTER_HOST_1 || "localhost",
    port: parseInt(process.env.REDIS_CLUSTER_PORT_1 || "7001"),
  },
  {
    host: process.env.REDIS_CLUSTER_HOST_2 || "localhost",
    port: parseInt(process.env.REDIS_CLUSTER_PORT_2 || "7002"),
  },
  {
    host: process.env.REDIS_CLUSTER_HOST_3 || "localhost",
    port: parseInt(process.env.REDIS_CLUSTER_PORT_3 || "7003"),
  },
];

// Cluster configuration options
const clusterOptions = {
  password: process.env.REDIS_PASSWORD || undefined,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  retryDelayOnClusterDown: 100,
  connectTimeout: 10000,
  commandTimeout: 5000,
  lazyConnect: true,
  enableOfflineQueue: false,
  redisOptions: {
    password: process.env.REDIS_PASSWORD || undefined,
    connectTimeout: 10000,
    commandTimeout: 5000,
    maxRetriesPerRequest: 3,
  },
  clusterRetryStatusCodes: [
    "CLUSTERDOWN",
    "CONNECTIONTIMEOUT",
    "NOREPLICAS",
    "MASTERDOWN",
  ],
  // Enable automatic failover
  enableAutoPipelining: true,
  // Scaling options
  scaleReads: "slave" as const,
  // Connection pool
  maxCommandsBeforeClosing: 100,
  // Health monitoring
  redisHealthCheck: async (redis: Redis) => {
    try {
      const result = await redis.ping();
      return result === "PONG";
    } catch (error) {
      return false;
    }
  },
};

// Determine if we should use cluster mode
const useClusterMode = process.env.REDIS_USE_CLUSTER === "true";

// Create Redis connection (cluster or single)
let redisConnection: Cluster | Redis;

if (useClusterMode) {
  console.log("🔗 Initializing Redis Cluster mode...");
  redisConnection = new Cluster(redisClusterNodes, clusterOptions);
} else {
  console.log("🔗 Initializing Redis Single mode...");
  // Fallback to single Redis instance
  redisConnection = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    commandTimeout: 5000,
    lazyConnect: true,
  });
}

// Connection event handlers
redisConnection.on("connect", () => {
  console.log(
    `✅ Redis ${useClusterMode ? "Cluster" : "Single"} connected successfully`
  );
});

redisConnection.on("error", (error) => {
  console.error(
    `❌ Redis ${useClusterMode ? "Cluster" : "Single"} connection error:`,
    error
  );
});

redisConnection.on("reconnecting", () => {
  console.log(
    `🔄 Redis ${useClusterMode ? "Cluster" : "Single"} reconnecting...`
  );
});

redisConnection.on("ready", () => {
  console.log(
    `🚀 Redis ${useClusterMode ? "Cluster" : "Single"} ready for operations`
  );
});

// Cluster-specific events
if (useClusterMode && redisConnection instanceof Cluster) {
  redisConnection.on("node error", (error, node) => {
    console.error(
      `❌ Redis cluster node error on ${node.options.host}:${node.options.port}:`,
      error
    );
  });

  redisConnection.on("+node", (node) => {
    console.log(
      `➕ Redis cluster node added: ${node.options.host}:${node.options.port}`
    );
  });

  redisConnection.on("-node", (node) => {
    console.log(
      `➖ Redis cluster node removed: ${node.options.host}:${node.options.port}`
    );
  });

  redisConnection.on("failover", () => {
    console.log("🔄 Redis cluster failover detected");
  });
}

// Export the connection
export const redis = redisConnection;

// Connection options for BullMQ
export const redisConnectionOptions = useClusterMode
  ? {
      cluster: {
        enableReadyCheck: false,
        redisOptions: {
          password: process.env.REDIS_PASSWORD || undefined,
        },
        clusterRetryStatusCodes: [
          "CLUSTERDOWN",
          "CONNECTIONTIMEOUT",
          "NOREPLICAS",
          "MASTERDOWN",
        ],
      },
    }
  : {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || "0"),
      maxRetriesPerRequest: null,
      retryDelayOnClusterDown: 100,
    };

// Health check functions
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const result = await redisConnection.ping();
    return result === "PONG";
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}

export async function getRedisClusterStatus(): Promise<{
  isCluster: boolean;
  nodes: Array<{
    host: string;
    port: number;
    status: string;
    role: string;
    health: boolean;
  }>;
  totalNodes: number;
  masterNodes: number;
  slaveNodes: number;
}> {
  try {
    if (useClusterMode && redisConnection instanceof Cluster) {
      const nodes = redisConnection.nodes();
      const nodeStatus = await Promise.all(
        nodes.map(async (node) => {
          try {
            const info = await node.info("replication");
            const role = info.includes("role:master") ? "master" : "slave";
            const health = (await node.ping()) === "PONG";

            return {
              host: node.options.host || "unknown",
              port: node.options.port || 0,
              status: node.status,
              role,
              health,
            };
          } catch (error) {
            return {
              host: node.options.host || "unknown",
              port: node.options.port || 0,
              status: "error",
              role: "unknown",
              health: false,
            };
          }
        })
      );

      return {
        isCluster: true,
        nodes: nodeStatus,
        totalNodes: nodeStatus.length,
        masterNodes: nodeStatus.filter((n) => n.role === "master").length,
        slaveNodes: nodeStatus.filter((n) => n.role === "slave").length,
      };
    } else {
      // Single Redis instance
      const health = await checkRedisConnection();

      return {
        isCluster: false,
        nodes: [
          {
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            status: health ? "ready" : "error",
            role: "master",
            health,
          },
        ],
        totalNodes: 1,
        masterNodes: 1,
        slaveNodes: 0,
      };
    }
  } catch (error) {
    console.error("Failed to get Redis cluster status:", error);
    return {
      isCluster: useClusterMode,
      nodes: [],
      totalNodes: 0,
      masterNodes: 0,
      slaveNodes: 0,
    };
  }
}

// Performance monitoring
export async function getRedisPerformanceMetrics(): Promise<{
  memoryUsage: {
    used: number;
    peak: number;
    rss: number;
    overhead: number;
  };
  keyCount: number;
  connections: {
    connected: number;
    blocked: number;
  };
  throughput: {
    commandsProcessed: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    hitRate: number;
  };
}> {
  try {
    let info: string;

    if (useClusterMode && redisConnection instanceof Cluster) {
      // Get info from master node
      const masterNode = redisConnection
        .nodes()
        .find((node) => node.status === "ready");
      info = masterNode ? await masterNode.info() : "";
    } else {
      info = await (redisConnection as Redis).info();
    }

    // Parse memory info
    const memoryUsed = parseInt(info.match(/used_memory:(\d+)/)?.[1] || "0");
    const memoryPeak = parseInt(
      info.match(/used_memory_peak:(\d+)/)?.[1] || "0"
    );
    const memoryRss = parseInt(info.match(/used_memory_rss:(\d+)/)?.[1] || "0");
    const memoryOverhead = parseInt(
      info.match(/used_memory_overhead:(\d+)/)?.[1] || "0"
    );

    // Parse connection info
    const connectedClients = parseInt(
      info.match(/connected_clients:(\d+)/)?.[1] || "0"
    );
    const blockedClients = parseInt(
      info.match(/blocked_clients:(\d+)/)?.[1] || "0"
    );

    // Parse stats info
    const commandsProcessed = parseInt(
      info.match(/total_commands_processed:(\d+)/)?.[1] || "0"
    );
    const keyspaceHits = parseInt(
      info.match(/keyspace_hits:(\d+)/)?.[1] || "0"
    );
    const keyspaceMisses = parseInt(
      info.match(/keyspace_misses:(\d+)/)?.[1] || "0"
    );
    const hitRate =
      keyspaceHits + keyspaceMisses > 0
        ? (keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100
        : 0;

    // Get key count
    let keyCount = 0;
    try {
      if (useClusterMode && redisConnection instanceof Cluster) {
        // For cluster, sum keys from all nodes
        const nodes = redisConnection.nodes();
        for (const node of nodes) {
          const dbsize = await node.dbsize();
          keyCount += dbsize;
        }
      } else {
        keyCount = await (redisConnection as Redis).dbsize();
      }
    } catch (error) {
      console.warn("Failed to get key count:", error);
    }

    return {
      memoryUsage: {
        used: memoryUsed,
        peak: memoryPeak,
        rss: memoryRss,
        overhead: memoryOverhead,
      },
      keyCount,
      connections: {
        connected: connectedClients,
        blocked: blockedClients,
      },
      throughput: {
        commandsProcessed,
        keyspaceHits,
        keyspaceMisses,
        hitRate,
      },
    };
  } catch (error) {
    console.error("Failed to get Redis performance metrics:", error);
    return {
      memoryUsage: { used: 0, peak: 0, rss: 0, overhead: 0 },
      keyCount: 0,
      connections: { connected: 0, blocked: 0 },
      throughput: {
        commandsProcessed: 0,
        keyspaceHits: 0,
        keyspaceMisses: 0,
        hitRate: 0,
      },
    };
  }
}

export { useClusterMode };
