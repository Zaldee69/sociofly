/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for faster builds
  experimental: {
    // Enable faster refresh and package optimization
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'lucide-react',
      'framer-motion'
    ],
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

  // Minimal webpack configuration
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Only add externals for server-side to avoid bundling issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@opentelemetry/instrumentation');
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
