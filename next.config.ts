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
      // Health & module dispatcher
      { source: "/health", destination: "/api/health" },
      { source: "/outreach", destination: "/api/dispatcher" },
      { source: "/sms", destination: "/api/dispatcher" },
      { source: "/voice", destination: "/api/dispatcher" },
      { source: "/freestyle", destination: "/api/dispatcher" },

      // Email
      { source: "/email/send", destination: "/api/email/send" },
      { source: "/relays/next-healthy", destination: "/api/relays/next-healthy" },
      { source: "/senders", destination: "/api/senders" },
      { source: "/templates/sync", destination: "/api/templates/sync" },

      // Portals
      { source: "/portals/upload", destination: "/api/upload" },
      { source: "/portals/categories", destination: "/api/portals/categories" },
      { source: "/portals/sessions", destination: "/api/portals/sessions" },
      { source: "/portals/sessions/:id/close", destination: "/api/portals/sessions/:id/close" },
      { source: "/portals/sessions/:id/autofill", destination: "/api/portals/sessions/:id/autofill" },
      { source: "/portals/sessions/:id/navigate", destination: "/api/portals/sessions/:id/navigate" },
      { source: "/portals/sessions/:id/state", destination: "/api/portals/sessions/:id/state" },

      // Portal router
      { source: "/portals/router", destination: "/router" },
    ];
  },
};

export default nextConfig;