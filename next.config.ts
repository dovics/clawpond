import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production builds
  output: 'standalone',

  // Optimize for production (SWC minification is enabled by default)
  reactStrictMode: true,
};

export default nextConfig;
