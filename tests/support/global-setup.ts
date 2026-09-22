import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { testDatabaseUrl } from "./database";

/**
 * Build the schema once, before any test runs.
 *
 * The migrations are applied by drizzle's own migrator rather than by
 * `drizzle-kit migrate`, because drizzle.config.ts loads .env.local, which
 * points at the development database.
 *
 * Both schemas are dropped first, so a container left running from an earlier
 * branch does not carry its schema into this run.
 */
export async function setup() {
  const pool = new Pool({ connectionString: testDatabaseUrl(), max: 1 });

  try {
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
    // Where drizzle keeps its record of which migrations have run.
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.query("CREATE SCHEMA public");

    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
