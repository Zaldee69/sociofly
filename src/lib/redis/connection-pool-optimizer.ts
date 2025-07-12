import { Redis, RedisOptions, Cluster } from "ioredis";

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  reapIntervalMs: number;
  enableMetrics: boolean;
  connectionValidationMs: number;
}

export interface PoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingAcquires: number;
  totalAcquired: number;
  totalReleased: number;
  totalCreated: number;
  totalDestroyed: number;
  averageAcquireTime: number;
  peakConnections: number;
}

export interface ConnectionWrapper {
  connection: Redis;
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
  acquireCount: number;
}

export class RedisConnectionPool {
  private config: ConnectionPoolConfig;
  private redisOptions: RedisOptions;
  private connections: Map<string, ConnectionWrapper> = new Map();
  private availableConnections: string[] = [];
  private pendingAcquires: Array<{
    resolve: (connection: Redis) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private metrics: PoolMetrics;
  private reapInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private acquireTimes: number[] = [];
  private maxAcquireTimeHistory = 100;

  constructor(
    redisOptions: RedisOptions,
    config: Partial<ConnectionPoolConfig> = {}
  ) {
    this.redisOptions = redisOptions;
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeoutMs: 5000,
      idleTimeoutMs: 300000, // 5 minutes
      reapIntervalMs: 60000, // 1 minute
      enableMetrics: true,
      connectionValidationMs: 30000, // 30 seconds
      ...config,
    };

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      pendingAcquires: 0,
      totalAcquired: 0,
      totalReleased: 0,
      totalCreated: 0,
      totalDestroyed: 0,
      averageAcquireTime: 0,
      peakConnections: 0,
    };

    this.initialize();
  }

  /**
   * Initialize the connection pool
   */
  private async initialize(): Promise<void> {
    console.log("🏊 Initializing Redis connection pool...");

    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      await this.createConnection();
    }

    // Start reaper for idle connections
    this.startConnectionReaper();

    // Start metrics collection if enabled
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }

    console.log(
      `✅ Redis connection pool initialized with ${this.config.minConnections} connections`
    );
  }

  /**
   * Acquire a connection from the pool
   */
  public async acquire(): Promise<Redis> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Check for available connection
      const availableId = this.availableConnections.pop();

      if (availableId) {
        const wrapper = this.connections.get(availableId);
        if (wrapper && this.isConnectionValid(wrapper)) {
          this.markConnectionAsActive(wrapper);
          this.recordAcquireTime(Date.now() - startTime);
          this.metrics.totalAcquired++;
          resolve(wrapper.connection);
          return;
        } else if (wrapper) {
          // Connection is invalid, destroy it
          this.destroyConnection(wrapper.id);
        }
      }

      // No available connection, try to create new one
      if (this.connections.size < this.config.maxConnections) {
        this.createConnection()
          .then((wrapper) => {
            this.markConnectionAsActive(wrapper);
            this.recordAcquireTime(Date.now() - startTime);
            this.metrics.totalAcquired++;
            resolve(wrapper.connection);
          })
          .catch(reject);
        return;
      }

      // Pool is at capacity, queue the request
      this.pendingAcquires.push({
        resolve,
        reject,
        timestamp: Date.now(),
      });
      this.metrics.pendingAcquires++;

      // Set timeout for acquire
      setTimeout(() => {
        const index = this.pendingAcquires.findIndex(
          (req) => req.resolve === resolve
        );
        if (index !== -1) {
          this.pendingAcquires.splice(index, 1);
          this.metrics.pendingAcquires--;
          reject(
            new Error(
              `Connection acquire timeout after ${this.config.acquireTimeoutMs}ms`
            )
          );
        }
      }, this.config.acquireTimeoutMs);
    });
  }

  /**
   * Release a connection back to the pool
   */
  public async release(connection: Redis): Promise<void> {
    const wrapper = this.findConnectionWrapper(connection);

    if (!wrapper) {
      console.warn("⚠️  Attempted to release unknown connection");
      return;
    }

    // Check if there are pending acquires
    const pendingAcquire = this.pendingAcquires.shift();
    if (pendingAcquire) {
      this.metrics.pendingAcquires--;
      this.markConnectionAsActive(wrapper);
      this.metrics.totalAcquired++;
      pendingAcquire.resolve(connection);
      return;
    }

    // Mark as available
    this.markConnectionAsIdle(wrapper);
    this.availableConnections.push(wrapper.id);
    this.metrics.totalReleased++;
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<ConnectionWrapper> {
    try {
      const connection = new Redis(this.redisOptions);
      const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const wrapper: ConnectionWrapper = {
        connection,
        id,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        isActive: false,
        acquireCount: 0,
      };

      // Wait for connection to be ready
      await new Promise((resolve, reject) => {
        connection.once("ready", resolve);
        connection.once("error", reject);

        // Timeout for connection establishment
        setTimeout(() => {
          reject(new Error("Connection establishment timeout"));
        }, 10000);
      });

      this.connections.set(id, wrapper);
      this.availableConnections.push(id);
      this.metrics.totalConnections++;
      this.metrics.totalCreated++;
      this.metrics.idleConnections++;
      this.metrics.peakConnections = Math.max(
        this.metrics.peakConnections,
        this.metrics.totalConnections
      );

      console.log(`➕ Created new Redis connection: ${id}`);
      return wrapper;
    } catch (error) {
      console.error("❌ Failed to create Redis connection:", error);
      throw error;
    }
  }

  /**
   * Destroy a connection
   */
  private async destroyConnection(connectionId: string): Promise<void> {
    const wrapper = this.connections.get(connectionId);
    if (!wrapper) return;

    try {
      await wrapper.connection.quit();
    } catch (error) {
      console.warn("⚠️  Error during connection cleanup:", error);
    }

    this.connections.delete(connectionId);

    // Remove from available connections
    const availableIndex = this.availableConnections.indexOf(connectionId);
    if (availableIndex !== -1) {
      this.availableConnections.splice(availableIndex, 1);
      this.metrics.idleConnections--;
    } else {
      this.metrics.activeConnections--;
    }

    this.metrics.totalConnections--;
    this.metrics.totalDestroyed++;

    console.log(`➖ Destroyed Redis connection: ${connectionId}`);
  }

  /**
   * Check if connection is valid
   */
  private isConnectionValid(wrapper: ConnectionWrapper): boolean {
    const now = Date.now();
    const lastUsed = wrapper.lastUsedAt.getTime();

    // Check if connection is too old
    if (now - lastUsed > this.config.connectionValidationMs) {
      return false;
    }

    // Check connection status
    if (wrapper.connection.status !== "ready") {
      return false;
    }

    return true;
  }

  /**
   * Mark connection as active
   */
  private markConnectionAsActive(wrapper: ConnectionWrapper): void {
    if (!wrapper.isActive) {
      wrapper.isActive = true;
      this.metrics.activeConnections++;
      this.metrics.idleConnections--;
    }
    wrapper.lastUsedAt = new Date();
    wrapper.acquireCount++;
  }

  /**
   * Mark connection as idle
   */
  private markConnectionAsIdle(wrapper: ConnectionWrapper): void {
    if (wrapper.isActive) {
      wrapper.isActive = false;
      wrapper.lastUsedAt = new Date();
      this.metrics.activeConnections--;
      this.metrics.idleConnections++;
    }
  }

  /**
   * Find connection wrapper by Redis instance
   */
  private findConnectionWrapper(
    connection: Redis
  ): ConnectionWrapper | undefined {
    for (const wrapper of this.connections.values()) {
      if (wrapper.connection === connection) {
        return wrapper;
      }
    }
    return undefined;
  }

  /**
   * Record acquire time for metrics
   */
  private recordAcquireTime(time: number): void {
    this.acquireTimes.push(time);
    if (this.acquireTimes.length > this.maxAcquireTimeHistory) {
      this.acquireTimes.shift();
    }

    this.metrics.averageAcquireTime =
      this.acquireTimes.reduce((sum, t) => sum + t, 0) /
      this.acquireTimes.length;
  }

  /**
   * Start connection reaper for idle connections
   */
  private startConnectionReaper(): void {
    this.reapInterval = setInterval(() => {
      this.reapIdleConnections();
    }, this.config.reapIntervalMs);
  }

  /**
   * Reap idle connections
   */
  private async reapIdleConnections(): Promise<void> {
    const now = Date.now();
    const connectionsToDestroy: string[] = [];

    // Find connections that have been idle too long
    for (const [id, wrapper] of this.connections.entries()) {
      if (
        !wrapper.isActive &&
        now - wrapper.lastUsedAt.getTime() > this.config.idleTimeoutMs &&
        this.connections.size > this.config.minConnections
      ) {
        connectionsToDestroy.push(id);
      }
    }

    // Destroy idle connections
    for (const id of connectionsToDestroy) {
      await this.destroyConnection(id);
    }

    if (connectionsToDestroy.length > 0) {
      console.log(`🧹 Reaped ${connectionsToDestroy.length} idle connections`);
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    // Metrics are updated in real-time, this is for logging
    if (this.config.enableMetrics) {
      console.log("📊 Redis Pool Metrics:", {
        total: this.metrics.totalConnections,
        active: this.metrics.activeConnections,
        idle: this.metrics.idleConnections,
        pending: this.metrics.pendingAcquires,
        avgAcquireTime: `${this.metrics.averageAcquireTime.toFixed(2)}ms`,
      });
    }
  }

  /**
   * Get current pool metrics
   */
  public getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pool status
   */
  public getStatus(): Record<string, any> {
    return {
      config: this.config,
      metrics: this.metrics,
      connections: Array.from(this.connections.values()).map((wrapper) => ({
        id: wrapper.id,
        createdAt: wrapper.createdAt,
        lastUsedAt: wrapper.lastUsedAt,
        isActive: wrapper.isActive,
        acquireCount: wrapper.acquireCount,
        status: wrapper.connection.status,
      })),
      availableConnections: this.availableConnections.length,
      pendingAcquires: this.pendingAcquires.length,
    };
  }

  /**
   * Resize the pool
   */
  public async resize(
    minConnections: number,
    maxConnections: number
  ): Promise<void> {
    console.log(`🔄 Resizing pool: ${minConnections}-${maxConnections}`);

    this.config.minConnections = minConnections;
    this.config.maxConnections = maxConnections;

    // Add connections if below minimum
    while (this.connections.size < minConnections) {
      await this.createConnection();
    }

    // Remove excess connections if above maximum
    if (this.connections.size > maxConnections) {
      const excessCount = this.connections.size - maxConnections;
      const idleConnections = this.availableConnections.slice(0, excessCount);

      for (const id of idleConnections) {
        await this.destroyConnection(id);
      }
    }
  }

  /**
   * Drain the pool (close all connections)
   */
  public async drain(): Promise<void> {
    console.log("🚰 Draining Redis connection pool...");

    // Clear intervals
    if (this.reapInterval) {
      clearInterval(this.reapInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Reject all pending acquires
    for (const pending of this.pendingAcquires) {
      pending.reject(new Error("Pool is being drained"));
    }
    this.pendingAcquires = [];

    // Close all connections
    const connectionIds = Array.from(this.connections.keys());
    for (const id of connectionIds) {
      await this.destroyConnection(id);
    }

    console.log("✅ Redis connection pool drained");
  }
}

/**
 * Optimized Redis manager with connection pooling
 */
export class OptimizedRedisManager {
  private static instance: OptimizedRedisManager;
  private pools: Map<string, RedisConnectionPool> = new Map();
  private defaultPool?: RedisConnectionPool;

  private constructor() {}

  public static getInstance(): OptimizedRedisManager {
    if (!OptimizedRedisManager.instance) {
      OptimizedRedisManager.instance = new OptimizedRedisManager();
    }
    return OptimizedRedisManager.instance;
  }

  /**
   * Initialize default pool
   */
  public async initializeDefaultPool(
    redisOptions: RedisOptions,
    config?: Partial<ConnectionPoolConfig>
  ): Promise<void> {
    this.defaultPool = new RedisConnectionPool(redisOptions, {
      minConnections: 3,
      maxConnections: 15,
      acquireTimeoutMs: 5000,
      idleTimeoutMs: 300000,
      reapIntervalMs: 60000,
      enableMetrics: true,
      connectionValidationMs: 30000,
      ...config,
    });
  }

  /**
   * Create named pool
   */
  public async createPool(
    name: string,
    redisOptions: RedisOptions,
    config?: Partial<ConnectionPoolConfig>
  ): Promise<void> {
    const pool = new RedisConnectionPool(redisOptions, config);
    this.pools.set(name, pool);
  }

  /**
   * Get connection from default pool
   */
  public async getConnection(): Promise<Redis> {
    if (!this.defaultPool) {
      throw new Error("Default pool not initialized");
    }
    return this.defaultPool.acquire();
  }

  /**
   * Get connection from named pool
   */
  public async getConnectionFromPool(poolName: string): Promise<Redis> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }
    return pool.acquire();
  }

  /**
   * Release connection to default pool
   */
  public async releaseConnection(connection: Redis): Promise<void> {
    if (!this.defaultPool) {
      throw new Error("Default pool not initialized");
    }
    return this.defaultPool.release(connection);
  }

  /**
   * Release connection to named pool
   */
  public async releaseConnectionToPool(
    poolName: string,
    connection: Redis
  ): Promise<void> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }
    return pool.release(connection);
  }

  /**
   * Get all pool metrics
   */
  public getAllPoolMetrics(): Record<string, PoolMetrics> {
    const metrics: Record<string, PoolMetrics> = {};

    if (this.defaultPool) {
      metrics.default = this.defaultPool.getMetrics();
    }

    for (const [name, pool] of this.pools.entries()) {
      metrics[name] = pool.getMetrics();
    }

    return metrics;
  }

  /**
   * Drain all pools
   */
  public async drainAllPools(): Promise<void> {
    const drainPromises: Promise<void>[] = [];

    if (this.defaultPool) {
      drainPromises.push(this.defaultPool.drain());
    }

    for (const pool of this.pools.values()) {
      drainPromises.push(pool.drain());
    }

    await Promise.all(drainPromises);
  }
}

// Export singleton instance
export const optimizedRedisManager = OptimizedRedisManager.getInstance();
