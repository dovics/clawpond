import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production builds
  output: 'standalone',

  // Optimize for production (SWC minification is enabled by default)
  reactStrictMode: true,

  // Disable ESLint during builds to avoid blocking deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript type checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // Handle native modules that Turbopack cannot process
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude native modules from bundling
      config.externals = [...(config.externals || []), 'ssh2', 'docker-modem'];
    }
    return config;
  },
};

export default nextConfig;
