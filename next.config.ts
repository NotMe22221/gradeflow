import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Postgres driver loads optional modules at runtime; keep it out of the server bundle.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  poweredByHeader: false,
  // Don't write an AGENTS.md into the repo on `next dev`.
  agentRules: false,
};

export default nextConfig;
