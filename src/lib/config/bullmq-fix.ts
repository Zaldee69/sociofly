/**
 * BullMQ Configuration and Warning Fixes
 * Menangani warning dan masalah kompatibilitas BullMQ dengan Next.js
 */

// Type definitions untuk BullMQ yang di-import secara dinamis
export interface BullMQTypes {
  Queue: any;
  Worker: any;
  Job: any;
}

/**
 * Dynamic import BullMQ untuk menghindari SSR issues
 * Hanya tersedia di server-side
 */
export async function loadBullMQ(): Promise<BullMQTypes | null> {
  // Pastikan hanya berjalan di server-side
  if (typeof window !== 'undefined') {
    console.warn('BullMQ should only be used on server-side');
    return null;
  }

  try {
    // Dynamic import untuk menghindari bundling issues
    const bullmq = await import('bullmq');
    return {
      Queue: bullmq.Queue,
      Worker: bullmq.Worker,
      Job: bullmq.Job
    };
  } catch (error) {
    console.error('Failed to load BullMQ:', error);
    return null;
  }
}

/**
 * Pengecekan apakah BullMQ tersedia
 */
export function isBullMQAvailable(): boolean {
  return typeof window === 'undefined' && typeof require !== 'undefined';
}

/**
 * Konfigurasi untuk mengatasi warning BullMQ
 */
export const BULLMQ_WARNING_FIXES = {
  // Webpack externals untuk client-side
  webpackExternals: [
    'bullmq',
    'bullmq/dist/esm/classes/child-processor',
    'bullmq/dist/esm/classes/index',
    'bullmq/dist/esm/index'
  ],
  
  // Ignore warnings untuk webpack
  ignoreWarnings: [
    {
      module: /node_modules\/bullmq\/dist\/esm/,
      message: /Critical dependency/,
    },
    {
      module: /node_modules\/bullmq/,
      message: /the request of a dependency is an expression/,
    },
    {
      module: /node_modules\/bullmq\/dist\/esm\/classes\/child-processor/,
      message: /Critical dependency/,
    }
  ],
  
  // Fallbacks untuk Node.js modules
  fallbacks: {
    'child_process': false,
    'worker_threads': false,
    'cluster': false
  }
};

/**
 * Utility untuk safe BullMQ operations
 */
export class SafeBullMQ {
  private static bullmq: BullMQTypes | null = null;
  private static initialized = false;

  /**
   * Initialize BullMQ safely
   */
  static async initialize(): Promise<boolean> {
    if (this.initialized) {
      return this.bullmq !== null;
    }

    if (!isBullMQAvailable()) {
      console.warn('BullMQ not available in current environment');
      this.initialized = true;
      return false;
    }

    try {
      this.bullmq = await loadBullMQ();
      this.initialized = true;
      return this.bullmq !== null;
    } catch (error) {
      console.error('Failed to initialize BullMQ:', error);
      this.initialized = true;
      return false;
    }
  }

  /**
   * Get BullMQ classes safely
   */
  static getBullMQ(): BullMQTypes | null {
    return this.bullmq;
  }

  /**
   * Check if BullMQ is ready
   */
  static isReady(): boolean {
    return this.initialized && this.bullmq !== null;
  }

  /**
   * Create Queue safely
   */
  static createQueue(name: string, options: any): any {
    if (!this.isReady() || !this.bullmq) {
      throw new Error('BullMQ not initialized');
    }
    return new this.bullmq.Queue(name, options);
  }

  /**
   * Create Worker safely
   */
  static createWorker(name: string, processor: any, options: any): any {
    if (!this.isReady() || !this.bullmq) {
      throw new Error('BullMQ not initialized');
    }
    return new this.bullmq.Worker(name, processor, options);
  }
}

/**
 * Error handler untuk BullMQ warnings
 */
export function suppressBullMQWarnings(): void {
  // Only run on server-side
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    const originalEmitWarning = process.emitWarning;
    process.emitWarning = function(warning: any, ...args: any[]) {
      // Suppress specific BullMQ warnings
      if (typeof warning === 'string' && (
        warning.includes('bullmq') ||
        warning.includes('Critical dependency') ||
        warning.includes('the request of a dependency is an expression')
      )) {
        return; // Suppress the warning
      }
      
      // Call original function for other warnings
      return originalEmitWarning.call(this, warning, ...args);
    };
  }
}

// Auto-suppress warnings saat file di-import
if (typeof window === 'undefined') {
  suppressBullMQWarnings();
}