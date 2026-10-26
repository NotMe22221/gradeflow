// Loads .env.local, then .env (the same precedence as Next.js and
// prisma.config.ts). Imported first by the seed so the database URL it reads
// matches the one `prisma db push` used.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });
