import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production builds
  output: 'standalone',

  // Optimize for production
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
