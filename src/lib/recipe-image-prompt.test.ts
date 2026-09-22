import { describe, expect, it } from "vitest";

import type { RecipeWithIngredients } from "@/db/schema";

import { IMAGE_PROMPT_PREFIX, imagePromptFor, recipeAsText } from "./recipe-image-prompt";

const now = new Date("2026-01-01T00:00:00Z");

function recipe(attributes: Partial<RecipeWithIngredients> = {}): RecipeWithIngredients {
  return {
    id: 1,
    title: "Red lentil dal",
    slug: "red-lentil-dal",
    description: "A weeknight dal.",
    servings: 4,
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    instructions: "Rinse the lentils.\nSimmer for 20 minutes.",
    imageUrl: null,
    imagePathname: null,
    createdAt: now,
    updatedAt: now,
    ingredients: [
      {
        id: 1,
        recipeId: 1,
        name: "Red lentils",
        quantity: "200",
        unit: "g",
        position: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        recipeId: 1,
        name: "Salt",
        quantity: null,
        unit: null,
        position: 2,
        createdAt: now,
        updatedAt: now,
      },
    ],
    ...attributes,
  };
}

describe("recipeAsText", () => {
  it("opens with the title", () => {
    expect(recipeAsText(recipe()).split("\n")[0]).toBe("Red lentil dal");
  });

  it("carries the description, the servings and the times", () => {
    const text = recipeAsText(recipe());

    expect(text).toContain("A weeknight dal.");
    expect(text).toContain("Serves 4");
    expect(text).toContain("Prep 10 min");
    expect(text).toContain("Cook 25 min");
  });

  it("lists each ingredient with its amount", () => {
    expect(recipeAsText(recipe())).toContain("- 200 g Red lentils");
  });

  it("lists an ingredient with no amount as itself", () => {
    expect(recipeAsText(recipe())).toContain("- Salt");
  });

  it("numbers the method", () => {
    const text = recipeAsText(recipe());

    expect(text).toContain("1. Rinse the lentils.");
    expect(text).toContain("2. Simmer for 20 minutes.");
  });

  it("leaves out what the recipe does not have", () => {
    const text = recipeAsText(
      recipe({
        description: null,
        servings: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        instructions: null,
        ingredients: [],
      }),
    );

    expect(text).toBe("Red lentil dal");
  });

  it("keeps a time that is set when the others are not", () => {
    const text = recipeAsText(recipe({ servings: null, prepTimeMinutes: null }));

    expect(text).toContain("Cook 25 min");
    expect(text).not.toContain("Serves");
    expect(text).not.toContain("Prep");
  });
});

describe("imagePromptFor", () => {
  it("puts the style block first, unchanged", () => {
    expect(imagePromptFor(recipe()).startsWith(IMAGE_PROMPT_PREFIX)).toBe(true);
  });

  it("puts the recipe after the boundary, which is the last thing the prefix says", () => {
    const prompt = imagePromptFor(recipe());
    const [before, after] = prompt.split("\n---\n");

    expect(before).toContain("reference material describing");
    expect(after.trim().startsWith("Red lentil dal")).toBe(true);
  });

  it("holds the whole recipe", () => {
    const prompt = imagePromptFor(recipe());

    expect(prompt).toContain("- 200 g Red lentils");
    expect(prompt).toContain("1. Rinse the lentils.");
  });
});
