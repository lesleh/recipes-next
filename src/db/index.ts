import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

// TLS is driven entirely by sslmode in the connection string, so the same code
// reaches both the local Compose database and a managed one.
function connect() {
  return drizzle(new Pool({ connectionString: databaseUrl }), { schema });
}

// Next reloads modules on every edit in development, which would otherwise
// leave a pool behind each time.
const globalForDb = globalThis as typeof globalThis & {
  recipesDb?: ReturnType<typeof connect>;
};

export const db = globalForDb.recipesDb ?? connect();

if (process.env.NODE_ENV !== "production") globalForDb.recipesDb = db;
