import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100MB",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: 'avatar.iran.liara.run',
      },
      {
        protocol: "https",
        hostname: 'cloud.appwrite.io',
      },
      {
        protocol: "https",
        hostname: 'png.pngtree.com',
      },
    ]
  }
};

export default nextConfig;
