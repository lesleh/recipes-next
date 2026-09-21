import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }

  return url;
}

// pg currently treats these as verify-full, but pg 9 will give them libpq
// semantics, which skip certificate and hostname checks. Pinning verify-full
// keeps the behaviour we have rather than quietly weakening it on upgrade.
const UNVERIFIED_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

function withVerifiedTls(url: string) {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (UNVERIFIED_SSL_MODES.has(parsed.searchParams.get("sslmode") ?? "")) {
    parsed.searchParams.set("sslmode", "verify-full");
  }

  return parsed.toString();
}

// TLS is driven entirely by sslmode in the connection string, so the same code
// reaches both the local Compose database and a managed one.
function connect() {
  const pool = new Pool({
    connectionString: withVerifiedTls(requireDatabaseUrl()),
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
