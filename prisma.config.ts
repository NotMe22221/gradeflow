import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Same precedence as Next.js: .env.local first, then .env.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

const { DATABASE_URL } = await import("./src/lib/db-url");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Zero-setup default: a local SQLite file next to the schema.
    url: DATABASE_URL,
  },
});
