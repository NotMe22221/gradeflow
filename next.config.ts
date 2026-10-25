import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it out of the server bundle.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  poweredByHeader: false,
  // Don't write an AGENTS.md into the repo on `next dev`.
  agentRules: false,
};

export default nextConfig;
