import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable instrumentation.ts for cron job registration at server startup
  experimental: {
    instrumentationHook: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
