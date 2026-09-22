import { sql } from "drizzle-orm";
import { expect, it } from "vitest";

import { db } from "@/db";
import { recipes } from "@/db/schema";

import { createRecipe } from "../support/factories";

it("runs against a database whose name ends in _test", () => {
  expect(process.env.DATABASE_URL).toMatch(/_test$/);
});

it("has the migrated schema", async () => {
  const recipe = await createRecipe({ title: "Chocolate Cake" });

  expect(recipe.slug).toBe("chocolate-cake");
});

it("starts each test with empty tables", async () => {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(recipes);

  expect(count).toBe(0);
});
