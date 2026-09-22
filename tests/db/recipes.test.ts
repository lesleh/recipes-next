import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { recipes } from "@/db/schema";
import { findCurrentSlug, findRecipeBySlug, listRecipes } from "@/lib/recipes";

import { createRecipe } from "../support/factories";

describe("listRecipes", () => {
  it("gives every recipe in title order when no term is given", async () => {
    await createRecipe({ title: "Pancakes" });
    await createRecipe({ title: "Bread" });

    const found = await listRecipes();

    expect(found.map((recipe) => recipe.title)).toEqual(["Bread", "Pancakes"]);
  });

  it("gives every recipe when the term is blank", async () => {
    await createRecipe({ title: "Bread" });

    expect(await listRecipes("   ")).toHaveLength(1);
  });

  it("matches the title, whatever the case", async () => {
    await createRecipe({ title: "Chocolate Cake" });
    await createRecipe({ title: "Bread" });

    const found = await listRecipes("chocolate");

    expect(found.map((recipe) => recipe.title)).toEqual(["Chocolate Cake"]);
  });

  it("matches the description", async () => {
    await createRecipe({ title: "Bread", description: "A slow overnight rise" });

    expect(await listRecipes("overnight")).toHaveLength(1);
  });

  it("matches an ingredient name", async () => {
    await createRecipe({ title: "Bread", ingredients: [{ name: "Strong white flour" }] });
    await createRecipe({ title: "Salad" });

    const found = await listRecipes("flour");

    expect(found.map((recipe) => recipe.title)).toEqual(["Bread"]);
  });

  it("gives a recipe once even when the term matches two of its ingredients", async () => {
    await createRecipe({
      title: "Bread",
      ingredients: [{ name: "White flour" }, { name: "Rye flour" }],
    });

    expect(await listRecipes("flour")).toHaveLength(1);
  });

  it("gives nothing when the term matches nothing", async () => {
    await createRecipe({ title: "Bread" });

    expect(await listRecipes("pineapple")).toEqual([]);
  });

  // Without escaping, a term holding % or _ would match far more than it says.
  it("treats a LIKE wildcard in the term as an ordinary character", async () => {
    await createRecipe({ title: "100% rye bread" });
    await createRecipe({ title: "Pancakes" });

    expect((await listRecipes("100%")).map((recipe) => recipe.title)).toEqual(["100% rye bread"]);
    // A bare wildcard finds the title holding that character, not everything.
    expect((await listRecipes("%")).map((recipe) => recipe.title)).toEqual(["100% rye bread"]);
    expect(await listRecipes("_")).toEqual([]);
  });

  it("gives the ingredients in their stored order", async () => {
    await createRecipe({
      title: "Bread",
      ingredients: [{ name: "Flour" }, { name: "Water" }, { name: "Salt" }],
    });

    const [recipe] = await listRecipes();

    expect(recipe.ingredients.map((ingredient) => ingredient.name)).toEqual([
      "Flour",
      "Water",
      "Salt",
    ]);
  });
});

describe("findRecipeBySlug", () => {
  it("gives the recipe holding the slug, with its ingredients", async () => {
    await createRecipe({
      title: "Bread",
      ingredients: [{ name: "Flour", quantity: "500", unit: "g" }],
    });

    const recipe = await findRecipeBySlug("bread");

    expect(recipe?.title).toBe("Bread");
    expect(recipe?.ingredients).toHaveLength(1);
  });

  it("gives nothing for a slug no recipe holds", async () => {
    expect(await findRecipeBySlug("bread")).toBeUndefined();
  });

  // The slug a rename retired is not the slug the recipe answers at.
  it("gives nothing for a slug the recipe used to hold", async () => {
    await createRecipe({ title: "Sourdough", formerSlugs: ["bread"] });

    expect(await findRecipeBySlug("bread")).toBeUndefined();
  });
});

describe("findCurrentSlug", () => {
  it("gives the slug a recipe answers at now, from one it used to hold", async () => {
    await createRecipe({ title: "Sourdough", formerSlugs: ["bread"] });

    expect(await findCurrentSlug("bread")).toBe("sourdough");
  });

  // However many renames there have been, the history points straight at the
  // recipe, so an old address redirects in one hop rather than a chain.
  it("gives the current slug from the first of several renames", async () => {
    await createRecipe({ title: "Pain au levain", formerSlugs: ["bread", "sourdough"] });

    expect(await findCurrentSlug("bread")).toBe("pain-au-levain");
    expect(await findCurrentSlug("sourdough")).toBe("pain-au-levain");
  });

  it("gives the slug the recipe holds now", async () => {
    await createRecipe({ title: "Bread" });

    expect(await findCurrentSlug("bread")).toBe("bread");
  });

  it("gives nothing for a slug no recipe has ever held", async () => {
    expect(await findCurrentSlug("bread")).toBeUndefined();
  });

  it("gives nothing once the recipe holding the slug is deleted", async () => {
    const recipe = await createRecipe({ title: "Sourdough", formerSlugs: ["bread"] });

    await db.delete(recipes).where(eq(recipes.id, recipe.id));

    expect(await findCurrentSlug("bread")).toBeUndefined();
  });
});
