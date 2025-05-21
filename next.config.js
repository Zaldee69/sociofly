/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your other configurations
  eslint: {
    // Disable ESLint during builds
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 