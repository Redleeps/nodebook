import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "@/lib/env.mjs";

const client = createClient({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  url: env.TURSO_DB_URL,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  authToken: env.TURSO_DB_AUTH_TOKEN,
});

export const db = drizzle(client);
