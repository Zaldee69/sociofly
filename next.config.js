/** @type {import('next').NextConfig} */
// BullMQ warning fixes configuration
const BULLMQ_WARNING_FIXES = {
  webpackExternals: [
    'bullmq',
    'bullmq/dist/esm/classes/child-processor',
    'bullmq/dist/esm/classes/index',
    'bullmq/dist/esm/index'
  ],
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
    },
    {
      module: /node_modules\/@opentelemetry\/instrumentation/,
      message: /Critical dependency/,
    },
    {
      module: /node_modules\/@opentelemetry\/instrumentation/,
      message: /the request of a dependency is an expression/,
    }
  ],
  fallbacks: {
    'child_process': false,
    'worker_threads': false,
    'cluster': false
  }
};

const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    // Only apply these configurations for server-side builds
    if (isServer) {
      // Add fallbacks for Node.js modules that are not available in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        path: 'path-browserify',
        os: 'os-browserify/browser',
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
      };
    } else {
      // For client-side, exclude server-only modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
        'socket.io': false,
        'socket.io-client': false,
      };
    }

    // Exclude server-only modules from client bundle
    if (!isServer) {
      config.externals = [
        ...config.externals,
        'socket.io',
        'ioredis',
        'utfs.io',
        // BullMQ related modules from config
        ...BULLMQ_WARNING_FIXES.webpackExternals
      ];
    }

    // Apply BullMQ warning fixes
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      ...BULLMQ_WARNING_FIXES.ignoreWarnings
    ];

    // Apply additional fallbacks for BullMQ
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ...BULLMQ_WARNING_FIXES.fallbacks
      };
    }

    return config;
  },
};

module.exports = nextConfig;