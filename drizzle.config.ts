import type { Config } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd())

export default {
  schema: "./src/lib/schema.ts",
  driver: "turso",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_DB_AUTH_TOKEN,
  },
  verbose: true,
  strict: true,
} satisfies Config;
