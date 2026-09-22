import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import sitemap from "@/app/sitemap";
import { db } from "@/db";
import { recipes } from "@/db/schema";

import { createRecipe } from "../support/factories";

beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://recipes.example");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** The addresses in the sitemap, in the order it lists them. */
async function addresses() {
  return (await sitemap()).map((entry) => entry.url);
}

describe("sitemap", () => {
  it("lists the home page on its own when there are no recipes", async () => {
    expect(await addresses()).toEqual(["https://recipes.example/"]);
  });

  it("lists the home page and every recipe, as absolute addresses", async () => {
    await createRecipe({ title: "Pancakes" });
    await createRecipe({ title: "Bread" });

    expect(await addresses()).toEqual([
      "https://recipes.example/",
      "https://recipes.example/recipes/bread",
      "https://recipes.example/recipes/pancakes",
    ]);
  });

  it("gives each recipe the date it last changed", async () => {
    const recipe = await createRecipe({ title: "Pancakes" });
    const changed = new Date("2026-06-04T09:30:00.000Z");

    await db.update(recipes).set({ updatedAt: changed }).where(eq(recipes.id, recipe.id));

    const entry = (await sitemap()).find((row) => row.url.endsWith("/recipes/pancakes"));

    expect(entry?.lastModified).toEqual(changed);
  });

  it("dates the home page from the newest recipe, not from now", async () => {
    const older = await createRecipe({ title: "Bread" });
    const newer = await createRecipe({ title: "Pancakes" });

    await db
      .update(recipes)
      .set({ updatedAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(recipes.id, older.id));
    const newest = new Date("2026-06-04T09:30:00.000Z");
    await db.update(recipes).set({ updatedAt: newest }).where(eq(recipes.id, newer.id));

    const [home] = await sitemap();

    expect(home.lastModified).toEqual(newest);
  });

  it("leaves the home page undated when there are no recipes to date it from", async () => {
    const [home] = await sitemap();

    expect(home.lastModified).toBeUndefined();
  });

  /* A retired slug answers with a permanent redirect, so listing one would put
     a redirect in the sitemap. */
  it("lists only the address a recipe answers at now", async () => {
    await createRecipe({ title: "Pancakes", formerSlugs: ["flapjacks", "griddle-cakes"] });

    expect(await addresses()).toEqual([
      "https://recipes.example/",
      "https://recipes.example/recipes/pancakes",
    ]);
  });

  it("leaves out the pages that need the write password", async () => {
    await createRecipe({ title: "Pancakes" });

    const found = await addresses();

    expect(found).not.toContain("https://recipes.example/recipes/new");
    expect(found.some((url) => url.endsWith("/edit"))).toBe(false);
  });

  it("drops a recipe once it is deleted", async () => {
    const recipe = await createRecipe({ title: "Pancakes" });
    await createRecipe({ title: "Bread" });

    await db.delete(recipes).where(eq(recipes.id, recipe.id));

    expect(await addresses()).toEqual([
      "https://recipes.example/",
      "https://recipes.example/recipes/bread",
    ]);
  });

  it("uses the Vercel production domain when SITE_URL is unset", async () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "recipes.lesleh.co.uk");
    await createRecipe({ title: "Pancakes" });

    expect(await addresses()).toEqual([
      "https://recipes.lesleh.co.uk/",
      "https://recipes.lesleh.co.uk/recipes/pancakes",
    ]);
  });
});
