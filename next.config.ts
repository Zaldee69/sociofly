import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// BullMQ warning fixes configuration
const BULLMQ_WARNING_FIXES = {
  webpackExternals: [
    "bullmq",
    "bullmq/dist/esm/classes/child-processor",
    "bullmq/dist/esm/classes/index",
    "bullmq/dist/esm/index",
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
    },
  ],
  fallbacks: {
    child_process: false,
    worker_threads: false,
    cluster: false,
  },
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["bullmq", "ioredis", "socket.io"],
  experimental: {
    // Future experimental features can be added here
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "scontent.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "scontent-cgk2-2.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "scontent-cgk1-2.cdninstagram.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  webpack: (config, { isServer }) => {
    // Server-side configuration
    if (isServer) {
      // For server-side, use native Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve("crypto"),
        stream: require.resolve("stream"),
        path: require.resolve("path"),
        os: require.resolve("os"),
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
      };

      // Add externals for server-only modules
      config.externals = [
        ...(config.externals || []),
        "socket.io",
        "ioredis",
        "http",
      ];
    } else {
      // Client-side configuration - exclude server-only modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        fs: false,
        net: false,
        tls: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        buffer: false,
        events: false,
        "socket.io": false,
        "socket.io-client": false,
        // BullMQ fallbacks
        child_process: false,
        worker_threads: false,
        cluster: false,
      };

      // Exclude server-only modules from client bundle
      config.externals = [
        ...(config.externals || []),
        "socket.io",
        "ioredis",
        "utfs.io",
        // BullMQ related modules
        ...BULLMQ_WARNING_FIXES.webpackExternals,
        {
          bullmq: "commonjs bullmq",
          ioredis: "commonjs ioredis",
        },
      ];
    }

    // Apply BullMQ warning fixes
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      ...BULLMQ_WARNING_FIXES.ignoreWarnings,
    ];

    return config;
  },
  poweredByHeader: false,
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "sociofly",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
