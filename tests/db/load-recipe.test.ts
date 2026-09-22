import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { recipes } from "@/db/schema";
import { loadRecipeBySlug } from "@/app/recipes/[slug]/load";

import { createRecipe } from "../support/factories";
import { NotFoundError, captureRedirect } from "../support/next-mocks";

describe("loadRecipeBySlug", () => {
  it("gives the recipe at its current address", async () => {
    await createRecipe({ title: "Bread", ingredients: [{ name: "Flour" }] });

    const recipe = await loadRecipeBySlug("bread");

    expect(recipe.title).toBe("Bread");
    expect(recipe.ingredients).toHaveLength(1);
  });

  it("redirects an address the recipe used to answer at", async () => {
    await createRecipe({ title: "Sourdough", formerSlugs: ["bread"] });

    const destination = await captureRedirect(() => loadRecipeBySlug("bread"));

    expect(destination).toBe("/recipes/sourdough");
  });

  // However many renames there have been, the history points straight at the
  // recipe, so this is one hop rather than a chain.
  it("redirects the oldest address straight to the newest", async () => {
    await createRecipe({ title: "Pain au levain", formerSlugs: ["bread", "sourdough"] });

    expect(await captureRedirect(() => loadRecipeBySlug("bread"))).toBe("/recipes/pain-au-levain");
  });

  it("keeps the suffix, so an edit page redirects to an edit page", async () => {
    await createRecipe({ title: "Sourdough", formerSlugs: ["bread"] });

    const destination = await captureRedirect(() => loadRecipeBySlug("bread", "/edit"));

    expect(destination).toBe("/recipes/sourdough/edit");
  });

  it("gives a 404 for a slug nobody has ever held", async () => {
    await expect(loadRecipeBySlug("bread")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("gives a 404 for a numeric id, which is never an address here", async () => {
    await createRecipe({ title: "Bread" });

    await expect(loadRecipeBySlug("1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("gives a 404 once the recipe holding the slug is deleted", async () => {
    const recipe = await createRecipe({ title: "Sourdough", formerSlugs: ["bread"] });
    await db.delete(recipes).where(eq(recipes.id, recipe.id));

    await expect(loadRecipeBySlug("bread")).rejects.toBeInstanceOf(NotFoundError);
    await expect(loadRecipeBySlug("sourdough")).rejects.toBeInstanceOf(NotFoundError);
  });
});
