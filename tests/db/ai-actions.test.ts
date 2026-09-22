import { asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { ingredients, recipeSlugs, recipes } from "@/db/schema";
import { DEFAULT_RECIPE_MODEL } from "@/lib/ai-models";
import type { GeneratedRecipe } from "@/lib/recipe-writer";

import { createRecipe } from "../support/factories";
import { captureRedirect, signOut } from "../support/next-mocks";

const askModelForRecipe = vi.hoisted(() => vi.fn());

// Only the model call is stood in for. The schema, the mapping and the write
// are the code under test, and no test reaches the gateway.
vi.mock("@/lib/recipe-writer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/recipe-writer")>()),
  askModelForRecipe,
}));

const { writeRecipe } = await import("@/app/recipes/new/ai/actions");

const generated: GeneratedRecipe = {
  title: "Red lentil dal",
  description: "A weeknight dal.",
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 25,
  instructions: "Rinse the lentils.\nSimmer for 20 minutes.",
  ingredients: [
    { quantity: "200", unit: "g", name: "Red lentils" },
    { quantity: "1", unit: "tsp", name: "Cumin seeds" },
    { quantity: "", unit: "", name: "Salt" },
  ],
};

function promptForm(fields: Record<string, string> = {}) {
  const form = new FormData();

  for (const [key, value] of Object.entries({ prompt: "a weeknight dal", ...fields })) {
    form.set(key, value);
  }

  return form;
}

const write = (form: FormData) => writeRecipe({ error: null }, form);

beforeEach(() => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
  askModelForRecipe.mockReset();
  askModelForRecipe.mockResolvedValue(generated);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("writeRecipe write access", () => {
  it("refuses without a password, and asks no model", async () => {
    signOut();

    await expect(write(promptForm())).rejects.toThrow("A password is needed");

    expect(askModelForRecipe).not.toHaveBeenCalled();
    expect(await db.select().from(recipes)).toEqual([]);
  });
});

describe("writeRecipe saving what the model wrote", () => {
  it("stores the recipe and sends the reader to it", async () => {
    const destination = await captureRedirect(() => write(promptForm()));

    expect(destination).toBe("/recipes/red-lentil-dal");

    const [recipe] = await db.select().from(recipes);
    expect(recipe.title).toBe("Red lentil dal");
    expect(recipe.servings).toBe(4);
    expect(recipe.instructions).toBe("Rinse the lentils.\nSimmer for 20 minutes.");
  });

  it("stores the ingredients in the order the model gave them", async () => {
    await captureRedirect(() => write(promptForm()));

    const [recipe] = await db.select().from(recipes);
    const rows = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.recipeId, recipe.id))
      .orderBy(asc(ingredients.position));

    expect(rows.map((row) => row.name)).toEqual(["Red lentils", "Cumin seeds", "Salt"]);
    expect(rows[2].quantity).toBeNull();
  });

  it("records the slug in the history, as a typed recipe does", async () => {
    await captureRedirect(() => write(promptForm()));

    expect((await db.select().from(recipeSlugs)).map((row) => row.slug)).toEqual([
      "red-lentil-dal",
    ]);
  });
});

describe("writeRecipe choosing a model", () => {
  it("asks the model the form chose", async () => {
    await captureRedirect(() => write(promptForm({ model: "openai/gpt-5-nano" })));

    expect(askModelForRecipe).toHaveBeenCalledWith("a weeknight dal", "openai/gpt-5-nano");
  });

  it("falls back to the default for a model that is not on the list", async () => {
    await captureRedirect(() => write(promptForm({ model: "openai/gpt-5-pro" })));

    expect(askModelForRecipe).toHaveBeenCalledWith("a weeknight dal", DEFAULT_RECIPE_MODEL);
  });
});

describe("writeRecipe when nothing can be saved", () => {
  it("says so when the gateway key is missing, and asks no model", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");

    expect(await write(promptForm())).toEqual({ error: expect.stringContaining("AI_GATEWAY") });
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("refuses an empty prompt", async () => {
    expect(await write(promptForm({ prompt: "   " }))).toEqual({
      error: "Say what you would like a recipe for.",
    });
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("refuses a prompt longer than the limit", async () => {
    const state = await write(promptForm({ prompt: "x".repeat(501) }));

    expect(state.error).toContain("500 characters");
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("reports a model that failed, and writes nothing", async () => {
    askModelForRecipe.mockRejectedValue(new Error("gateway said no"));

    const state = await write(promptForm());

    expect(state.error).toContain("could not write a recipe");
    expect(await db.select().from(recipes)).toEqual([]);
  });

  it("reports a recipe the site cannot store, and writes nothing", async () => {
    askModelForRecipe.mockResolvedValue({ ...generated, title: "   " });

    const state = await write(promptForm());

    expect(state.error).toContain("cannot store");
    expect(await db.select().from(recipes)).toEqual([]);
  });

  it("reports a title another recipe already holds", async () => {
    await createRecipe({ title: "Red lentil dal" });

    const state = await write(promptForm());

    expect(state.error).toContain("already used by another recipe");
    expect(await db.select().from(recipes)).toHaveLength(1);
  });
});
