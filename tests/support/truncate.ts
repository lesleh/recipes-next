import { sql } from "drizzle-orm";
import { afterEach } from "vitest";

import { db } from "@/db";

import { requireTestDatabase } from "./database";

// Checked again here, and not only in the global setup, because this is the
// statement that empties the tables.
requireTestDatabase(process.env.DATABASE_URL);

// Ingredients, slug history and the tag join rows all cascade, so these three
// clear everything. Tags are named as well as recipes, because a tag belongs
// to no recipe and nothing would cascade to it. Truncation is slower than
// rolling back a transaction, but the code under test opens transactions of
// its own against a pooled connection, so it cannot share one with the test.
afterEach(async () => {
  await db.execute(sql`TRUNCATE recipes, recipe_slugs, tags RESTART IDENTITY CASCADE`);
});
