import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Same precedence as Next.js: .env.local first, then .env.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

const { DIRECT_DATABASE_URL } = await import("./src/lib/db-url");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Schema changes use a direct (unpooled) connection when the host offers
    // one; with nothing configured, Prisma's local Postgres (npm run db:start).
    // For a URL that asks for TLS it carries sslaccept=strict, so the CLI
    // checks the server's certificate like the app does (cliDatabaseUrl()).
    url: DIRECT_DATABASE_URL,
  },
});
