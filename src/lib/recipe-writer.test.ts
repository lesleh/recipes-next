import { describe, expect, it } from "vitest";

import { generatedRecipeSchema, toRecipeInput, type GeneratedRecipe } from "./recipe-writer";
import { recipeSchema } from "./validation";

const generated: GeneratedRecipe = {
  title: "Red lentil dal",
  description: "A weeknight dal.",
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 25,
  instructions: "Rinse the lentils.\nSimmer for 20 minutes.",
  ingredients: [
    { quantity: "200", unit: "g", name: "Red lentils" },
    { quantity: "", unit: "", name: "Salt" },
  ],
};

describe("toRecipeInput", () => {
  it("carries the recipe across", () => {
    const recipe = toRecipeInput(generated);

    expect(recipe.title).toBe("Red lentil dal");
    expect(recipe.description).toBe("A weeknight dal.");
    expect(recipe.servings).toBe(4);
    expect(recipe.prepTimeMinutes).toBe(10);
    expect(recipe.cookTimeMinutes).toBe(25);
  });

  it("reads an empty string as no value", () => {
    const recipe = toRecipeInput({ ...generated, description: "   " });

    expect(recipe.description).toBeNull();
    expect(recipe.ingredients[1]).toEqual({ name: "Salt", quantity: null, unit: null });
  });

  it("drops blank lines from the method", () => {
    const recipe = toRecipeInput({
      ...generated,
      instructions: "Rinse the lentils.\n\n\nSimmer for 20 minutes.\n",
    });

    expect(recipe.instructions).toBe("Rinse the lentils.\nSimmer for 20 minutes.");
  });

  it("drops the model's own step numbers, because the page adds them", () => {
    const recipe = toRecipeInput({
      ...generated,
      instructions: "1. Rinse the lentils.\nStep 2) Simmer for 20 minutes.",
    });

    expect(recipe.instructions).toBe("Rinse the lentils.\nSimmer for 20 minutes.");
  });

  it("keeps a step that opens with a measurement", () => {
    const recipe = toRecipeInput({ ...generated, instructions: "200 g of lentils go in." });

    expect(recipe.instructions).toBe("200 g of lentils go in.");
  });

  it("reads a method of only blank lines as no method", () => {
    expect(toRecipeInput({ ...generated, instructions: "\n  \n" }).instructions).toBeNull();
  });

  it("drops an ingredient with no name", () => {
    const recipe = toRecipeInput({
      ...generated,
      ingredients: [...generated.ingredients, { quantity: "1", unit: "tsp", name: " " }],
    });

    expect(recipe.ingredients.map((row) => row.name)).toEqual(["Red lentils", "Salt"]);
  });

  it("gives something the recipe schema accepts", () => {
    expect(recipeSchema.safeParse(toRecipeInput(generated)).success).toBe(true);
  });
});

describe("generatedRecipeSchema", () => {
  it("accepts a whole recipe", () => {
    expect(generatedRecipeSchema.safeParse(generated).success).toBe(true);
  });

  it("refuses a time that is not a whole number of minutes", () => {
    expect(generatedRecipeSchema.safeParse({ ...generated, cookTimeMinutes: 2.5 }).success).toBe(
      false,
    );
  });

  it("refuses a reply with a field missing", () => {
    const incomplete: Record<string, unknown> = { ...generated };
    delete incomplete.servings;

    expect(generatedRecipeSchema.safeParse(incomplete).success).toBe(false);
  });
});
