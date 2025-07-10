import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "localhost",
      "res.cloudinary.com",
      "images.unsplash.com",
      "utfs.io",
      "scontent.cdninstagram.com",
      "scontent-cgk2-2.cdninstagram.com",
    ],
    formats: ["image/avif", "image/webp"],
  },
  serverExternalPackages: ["bullmq"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only packages from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        buffer: false,
        events: false,
      };

      // Ignore server-only modules in client bundle
      config.externals = config.externals || [];
      config.externals.push({
        bullmq: "commonjs bullmq",
        ioredis: "commonjs ioredis",
      });
    }
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

export default nextConfig;
