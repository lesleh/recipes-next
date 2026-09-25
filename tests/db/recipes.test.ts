import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { recipes } from "@/db/schema";
import {
  findCurrentSlug,
  findRecipeById,
  findRecipeBySlug,
  listRecipes,
  listTags,
} from "@/lib/recipes";

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

    expect(await listRecipes({ query: "   " })).toHaveLength(1);
  });

  it("matches the title, whatever the case", async () => {
    await createRecipe({ title: "Chocolate Cake" });
    await createRecipe({ title: "Bread" });

    const found = await listRecipes({ query: "chocolate" });

    expect(found.map((recipe) => recipe.title)).toEqual(["Chocolate Cake"]);
  });

  it("matches the description", async () => {
    await createRecipe({ title: "Bread", description: "A slow overnight rise" });

    expect(await listRecipes({ query: "overnight" })).toHaveLength(1);
  });

  it("matches an ingredient name", async () => {
    await createRecipe({ title: "Bread", ingredients: [{ name: "Strong white flour" }] });
    await createRecipe({ title: "Salad" });

    const found = await listRecipes({ query: "flour" });

    expect(found.map((recipe) => recipe.title)).toEqual(["Bread"]);
  });

  it("gives a recipe once even when the term matches two of its ingredients", async () => {
    await createRecipe({
      title: "Bread",
      ingredients: [{ name: "White flour" }, { name: "Rye flour" }],
    });

    expect(await listRecipes({ query: "flour" })).toHaveLength(1);
  });

  it("gives nothing when the term matches nothing", async () => {
    await createRecipe({ title: "Bread" });

    expect(await listRecipes({ query: "pineapple" })).toEqual([]);
  });

  // Without escaping, a term holding % or _ would match far more than it says.
  it("treats a LIKE wildcard in the term as an ordinary character", async () => {
    await createRecipe({ title: "100% rye bread" });
    await createRecipe({ title: "Pancakes" });

    expect((await listRecipes({ query: "100%" })).map((recipe) => recipe.title)).toEqual(["100% rye bread"]);
    // A bare wildcard finds the title holding that character, not everything.
    expect((await listRecipes({ query: "%" })).map((recipe) => recipe.title)).toEqual(["100% rye bread"]);
    expect(await listRecipes({ query: "_" })).toEqual([]);
  });

  it("gives a recipe's tags in slug order, whatever case they were typed in", async () => {
    await createRecipe({ title: "Bread", tags: ["Weeknight", "apple", "Baking"] });

    const [recipe] = await listRecipes();

    expect(recipe.tags.map((tag) => tag.name)).toEqual(["apple", "Baking", "Weeknight"]);
  });

  it("gives only the recipes carrying the chosen tag", async () => {
    await createRecipe({ title: "Bread", tags: ["baking"] });
    await createRecipe({ title: "Salad", tags: ["quick"] });

    const found = await listRecipes({ tag: "baking" });

    expect(found.map((recipe) => recipe.title)).toEqual(["Bread"]);
  });

  it("gives a recipe once however many of its tags were asked for", async () => {
    await createRecipe({ title: "Bread", tags: ["baking", "weeknight"] });

    expect(await listRecipes({ tag: "baking" })).toHaveLength(1);
  });

  it("applies a search and a tag together", async () => {
    await createRecipe({ title: "Bread", tags: ["baking"] });
    await createRecipe({ title: "Brioche", tags: ["baking"] });
    await createRecipe({ title: "Bread sauce", tags: ["quick"] });

    const found = await listRecipes({ query: "bread", tag: "baking" });

    expect(found.map((recipe) => recipe.title)).toEqual(["Bread"]);
  });

  it("gives nothing for a tag no recipe carries", async () => {
    await createRecipe({ title: "Bread", tags: ["baking"] });

    expect(await listRecipes({ tag: "nonsense" })).toEqual([]);
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

describe("listTags", () => {
  it("gives every tag in use, with how many recipes carry it", async () => {
    await createRecipe({ title: "Bread", tags: ["baking"] });
    await createRecipe({ title: "Brioche", tags: ["baking"] });

    expect(await listTags()).toEqual([{ name: "baking", slug: "baking", recipeCount: 2 }]);
  });

  it("counts two spellings of one tag as that one tag", async () => {
    await createRecipe({ title: "Bread", tags: ["Weeknight"] });
    await createRecipe({ title: "Salad", tags: ["weeknight"] });

    expect(await listTags()).toEqual([{ name: "Weeknight", slug: "weeknight", recipeCount: 2 }]);
  });

  it("orders by the count, highest first, then by slug", async () => {
    await createRecipe({ title: "Bread", tags: ["baking", "Weeknight", "apple"] });
    await createRecipe({ title: "Brioche", tags: ["baking"] });

    expect((await listTags()).map((tag) => tag.slug)).toEqual(["baking", "apple", "weeknight"]);
  });

  it("gives nothing when no recipe carries a tag", async () => {
    await createRecipe({ title: "Bread" });

    expect(await listTags()).toEqual([]);
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

  it("gives the recipe's tags in slug order", async () => {
    await createRecipe({ title: "Bread", tags: ["Weeknight", "apple"] });

    const recipe = await findRecipeBySlug("bread");

    expect(recipe?.tags.map((tag) => tag.name)).toEqual(["apple", "Weeknight"]);
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

describe("findRecipeById", () => {
  it("gives the recipe with its ingredients in order and its tags", async () => {
    const created = await createRecipe({
      title: "Bread",
      ingredients: [{ name: "Flour" }, { name: "Water" }],
      tags: ["Weeknight", "apple"],
    });

    const recipe = await findRecipeById(created.id);

    expect(recipe?.title).toBe("Bread");
    expect(recipe?.ingredients.map((row) => row.name)).toEqual(["Flour", "Water"]);
    expect(recipe?.tags.map((tag) => tag.name)).toEqual(["apple", "Weeknight"]);
  });

  it("gives nothing for an id no recipe holds", async () => {
    expect(await findRecipeById(1)).toBeUndefined();
  });

  // A form sends text, and an empty or mangled id arrives here as NaN.
  it("gives nothing for an id that is not a whole number", async () => {
    expect(await findRecipeById(Number.NaN)).toBeUndefined();
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
