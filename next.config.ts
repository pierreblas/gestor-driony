import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for Docker (.next/standalone).
  output: "standalone",
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
