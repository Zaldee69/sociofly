/** @type {import('next').NextConfig} */
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
        'bullmq',
        'ioredis',
        'utfs.io'
      ];
    }

    return config;
  },
};

module.exports = nextConfig;