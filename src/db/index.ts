import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import { requireDatabaseUrl } from "./url";

function connect() {
  const pool = new Pool({
    connectionString: requireDatabaseUrl(),
    // A serverless instance serves one request at a time, so a larger pool only
    // holds connections open against the database's own limit.
    max: process.env.VERCEL ? 1 : 10,
  });

  return drizzle(pool, { schema });
}

// Next reloads modules on every edit in development, which would otherwise
// leave a pool behind each time.
const globalForDb = globalThis as typeof globalThis & {
  recipesDb?: ReturnType<typeof connect>;
};

export const db = globalForDb.recipesDb ?? connect();

if (process.env.NODE_ENV !== "production") globalForDb.recipesDb = db;
