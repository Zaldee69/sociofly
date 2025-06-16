// unified-redis-manager.ts - Fixed version
import { Redis, Cluster } from "ioredis";

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

interface RedisClusterNode {
  host: string;
  port: number;
}

export class UnifiedRedisManager {
  private static instance: UnifiedRedisManager;
  private connection: Redis | Cluster | null = null;
  private isClusterMode = false;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): UnifiedRedisManager {
    if (!UnifiedRedisManager.instance) {
      UnifiedRedisManager.instance = new UnifiedRedisManager();
    }
    return UnifiedRedisManager.instance;
  }

  /**
   * Initialize Redis connection based on environment
   */
  public async initialize(): Promise<void> {
    console.log("🔗 Initializing Unified Redis Manager...");

    try {
      // Temporarily disable cluster mode to avoid infinite reconnection issues
      // TODO: Fix cluster configuration once Redis cluster is properly set up
      this.isClusterMode = false; // process.env.REDIS_USE_CLUSTER === "true";

      if (this.isClusterMode) {
        await this.initializeCluster();
      } else {
        await this.initializeSingle();
      }

      this.setupEventHandlers();

      // Test connection with timeout
      await Promise.race([
        this.testConnection(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 5000)
        ),
      ]);

      this.isConnected = true;

      console.log(
        `✅ Redis ${this.isClusterMode ? "Cluster" : "Single"} initialized successfully`
      );
    } catch (error) {
      console.error("❌ Failed to initialize Redis:", error);
      this.isConnected = false;

      // If cluster mode failed, try falling back to single mode
      if (this.isClusterMode) {
        console.log("🔄 Cluster failed, trying single mode fallback...");
        try {
          await this.fallbackToSingle();
        } catch (fallbackError) {
          console.error(
            "❌ Fallback to single mode also failed:",
            fallbackError
          );
          throw error; // Throw original error
        }
      } else {
        throw error;
      }
    }
  }

  private async initializeSingle(): Promise<void> {
    const config: RedisConfig = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || "0"),
    };

    this.connection = new Redis({
      ...config,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: true,
    });
  }

  private async initializeCluster(): Promise<void> {
    const nodes: RedisClusterNode[] = [
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

    this.connection = new Cluster(nodes, {
      enableReadyCheck: true,
      enableOfflineQueue: false, // Prevent command queueing during failures
      scaleReads: "slave",
      retryDelayOnFailover: 100,
      lazyConnect: true, // Don't auto-connect
      redisOptions: {
        maxRetriesPerRequest: 2,
        connectTimeout: 3000,
        commandTimeout: 2000,
      },
    });
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.on("connect", () => {
      console.log(
        `✅ Redis ${this.isClusterMode ? "Cluster" : "Single"} connected`
      );
      this.isConnected = true;
    });

    this.connection.on("error", (error) => {
      console.error(
        `❌ Redis ${this.isClusterMode ? "Cluster" : "Single"} error:`,
        error
      );
      this.isConnected = false;
    });

    this.connection.on("reconnecting", () => {
      console.log(
        `🔄 Redis ${this.isClusterMode ? "Cluster" : "Single"} reconnecting...`
      );
    });

    this.connection.on("ready", () => {
      console.log(
        `🚀 Redis ${this.isClusterMode ? "Cluster" : "Single"} ready`
      );
      this.isConnected = true;
    });

    // Cluster-specific events with better error handling
    if (this.isClusterMode && this.connection instanceof Cluster) {
      this.connection.on("node error", (error, node) => {
        const nodeInfo =
          node?.options?.host && node?.options?.port
            ? `${node.options.host}:${node.options.port}`
            : "unknown node";
        console.error(`❌ Redis cluster node error on ${nodeInfo}:`, error);
      });

      this.connection.on("+node", (node) => {
        const nodeInfo =
          node?.options?.host && node?.options?.port
            ? `${node.options.host}:${node.options.port}`
            : "unknown node";
        console.log(`➕ Redis cluster node added: ${nodeInfo}`);
      });

      this.connection.on("-node", (node) => {
        const nodeInfo =
          node?.options?.host && node?.options?.port
            ? `${node.options.host}:${node.options.port}`
            : "unknown node";
        console.log(`➖ Redis cluster node removed: ${nodeInfo}`);
      });
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.connection) {
      throw new Error("Redis connection not initialized");
    }

    const result = await this.connection.ping();
    if (result !== "PONG") {
      throw new Error("Redis ping failed");
    }
  }

  /**
   * Get Redis connection for direct use
   */
  public getConnection(): Redis | Cluster | null {
    return this.connection;
  }

  /**
   * Get connection options for BullMQ
   */
  public getConnectionOptions(): any {
    if (this.isClusterMode) {
      return {
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
      };
    } else {
      return {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || "0"),
        maxRetriesPerRequest: null, // Required for BullMQ
        retryDelayOnFailover: 100,
      };
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.connection) return false;
      const result = await this.connection.ping();
      return result === "PONG";
    } catch (error) {
      console.error("Redis health check failed:", error);
      return false;
    }
  }

  /**
   * Check if Redis is available and connected
   */
  public isAvailable(): boolean {
    return this.isConnected && this.connection !== null;
  }

  /**
   * Get cluster mode status
   */
  public isCluster(): boolean {
    return this.isClusterMode;
  }

  /**
   * Get connection info
   */
  public getConnectionInfo(): {
    isConnected: boolean;
    isCluster: boolean;
    host?: string;
    port?: number;
    nodes?: Array<{ host: string; port: number }>;
  } {
    const info = {
      isConnected: this.isConnected,
      isCluster: this.isClusterMode,
    };

    if (this.isClusterMode) {
      return {
        ...info,
        nodes: [
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
        ],
      };
    } else {
      return {
        ...info,
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      };
    }
  }

  /**
   * Performance metrics
   */
  public async getPerformanceMetrics(): Promise<{
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
      if (!this.connection) {
        throw new Error("Redis connection not available");
      }

      let info: string;

      if (this.isClusterMode && this.connection instanceof Cluster) {
        // Get info from master node
        const masterNode = this.connection
          .nodes()
          .find((node) => node.status === "ready");
        info = masterNode ? await masterNode.info() : "";
      } else {
        info = await (this.connection as Redis).info();
      }

      // Parse memory info
      const memoryUsed = parseInt(info.match(/used_memory:(\d+)/)?.[1] || "0");
      const memoryPeak = parseInt(
        info.match(/used_memory_peak:(\d+)/)?.[1] || "0"
      );
      const memoryRss = parseInt(
        info.match(/used_memory_rss:(\d+)/)?.[1] || "0"
      );
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
        if (this.isClusterMode && this.connection instanceof Cluster) {
          // For cluster, sum keys from all nodes
          const nodes = this.connection.nodes();
          for (const node of nodes) {
            const dbsize = await node.dbsize();
            keyCount += dbsize;
          }
        } else {
          keyCount = await (this.connection as Redis).dbsize();
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

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
      this.isConnected = false;
      console.log("✅ Redis connection closed");
    }
  }

  private async fallbackToSingle(): Promise<void> {
    console.log(
      "🔄 Forcing cluster disconnect and switching to single mode..."
    );

    // Force disconnect cluster connection
    if (this.connection) {
      try {
        // Remove all listeners to prevent further events
        this.connection.removeAllListeners();

        // Force disconnect without graceful shutdown
        if (this.connection instanceof Cluster) {
          this.connection.disconnect(false);
        } else {
          await this.connection.disconnect();
        }
      } catch (e) {
        console.log(
          "⚠️ Ignoring cluster disconnect error:",
          e instanceof Error ? e.message : String(e)
        );
      }
      this.connection = null;
    }

    // Switch to single mode
    this.isClusterMode = false;
    await this.initializeSingle();
    this.setupEventHandlers();
    await this.testConnection();
    this.isConnected = true;

    console.log("✅ Successfully fell back to single Redis mode");
  }
}
