import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    // Enable WebAssembly or binary handling if needed
    return config;
  },
};

export default nextConfig;
