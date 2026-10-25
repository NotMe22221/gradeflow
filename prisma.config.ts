import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Zero-setup default: a local SQLite file next to the schema.
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
