import type { NextConfig } from "next";

// Our app is a dashboard behind a login, and every page loads its data
// in the browser (with axios). So we keep the config simple and do NOT
// turn on "cacheComponents" (server pre-rendering + caching).
const nextConfig: NextConfig = {
  // don't create an AGENTS.md file in this project
  agentRules: false,
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
