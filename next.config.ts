/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for faster builds
  experimental: {
    // Enable faster builds with SWC
    swcMinify: true,
    // Enable build cache
    incrementalCacheHandlerPath: undefined,
    // Optimize bundle analyzer
    bundlePagesRouterDependencies: true,
    // Enable faster refresh
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'lucide-react',
      'framer-motion'
    ]
  },

  // Build optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Output configuration for Docker
  output: 'standalone',

  // Optimize images
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
    unoptimized: false,
    minimumCacheTTL: 60,
  },

  // Webpack optimizations
  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        // Enable module concatenation
        concatenateModules: true,
        // Optimize chunk splitting
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Reduce bundle size
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use lighter alternatives where possible
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
      };
    }

    // Optimize for faster builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Enable static optimization
  trailingSlash: false,
  
  // Reduce build output
  eslint: {
    ignoreDuringBuilds: true, // Skip ESLint during builds (run separately)
  },
  
  typescript: {
    ignoreBuildErrors: false, // Keep type checking
  },

  // Optimize static generation
  generateBuildId: async () => {
    // Use shorter build IDs
    return process.env.BUILD_ID || 'build-' + Date.now().toString(36);
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
