import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    if (process.env.NODE_ENV === "development") {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: "@dyad-sh/nextjs-webpack-component-tagger",
      });
    }
    return config;
  },
  async rewrites() {
    return [
      { source: "/health", destination: "/api/health" },
      { source: "/outreach", destination: "/api/email/send" },
      { source: "/portals/upload", destination: "/api/upload" },
      { source: "/portals/router", destination: "/router" },
    ];
  },
};

export default nextConfig;