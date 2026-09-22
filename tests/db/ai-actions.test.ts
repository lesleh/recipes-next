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

function form(fields: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(fields)) data.set(key, value);

  return data;
}

/** The page starts with no draft in hand. */
const empty = { draft: null, error: null };

const run = (state: typeof empty | { draft: GeneratedRecipe; error: null }, fields: Record<string, string>) =>
  writeRecipe(state, form(fields));

const generate = (fields: Record<string, string> = {}) =>
  run(empty, { intent: "generate", prompt: "a weeknight dal", ...fields });

const withDraft = { draft: generated, error: null };

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

    await expect(generate()).rejects.toThrow("A password is needed");

    expect(askModelForRecipe).not.toHaveBeenCalled();
    expect(await db.select().from(recipes)).toEqual([]);
  });
});

describe("writeRecipe writing a draft", () => {
  it("gives back a draft and saves nothing", async () => {
    const state = await generate();

    expect(state.draft?.title).toBe("Red lentil dal");
    expect(state.error).toBeNull();
    expect(await db.select().from(recipes)).toEqual([]);
  });

  it("asks for the recipe with no draft in hand", async () => {
    await generate();

    expect(askModelForRecipe).toHaveBeenCalledWith({
      prompt: "a weeknight dal",
      model: DEFAULT_RECIPE_MODEL,
      draft: null,
      change: "",
    });
  });

  it("asks the model the form chose", async () => {
    await generate({ model: "openai/gpt-5-nano" });

    expect(askModelForRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ model: "openai/gpt-5-nano" }),
    );
  });

  it("falls back to the default for a model that is not on the list", async () => {
    await generate({ model: "openai/gpt-5-pro" });

    expect(askModelForRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ model: DEFAULT_RECIPE_MODEL }),
    );
  });
});

describe("writeRecipe changing a draft", () => {
  it("sends the draft and the change back to the model", async () => {
    await run(withDraft, { intent: "change", prompt: "a weeknight dal", change: "make it vegan" });

    expect(askModelForRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ draft: generated, change: "make it vegan" }),
    );
  });

  it("replaces the draft with what came back, and still saves nothing", async () => {
    askModelForRecipe.mockResolvedValue({ ...generated, title: "Vegan red lentil dal" });

    const state = await run(withDraft, {
      intent: "change",
      prompt: "a weeknight dal",
      change: "make it vegan",
    });

    expect(state.draft?.title).toBe("Vegan red lentil dal");
    expect(await db.select().from(recipes)).toEqual([]);
  });

  it("refuses a change with nothing to change", async () => {
    const state = await run(empty, { intent: "change", prompt: "a dal", change: "make it vegan" });

    expect(state.error).toBe("There is no draft to change yet.");
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("refuses an empty change, and keeps the draft", async () => {
    const state = await run(withDraft, { intent: "change", prompt: "a dal", change: "  " });

    expect(state.error).toBe("Say what should change about the draft.");
    expect(state.draft).toEqual(generated);
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("keeps the draft when the model fails", async () => {
    askModelForRecipe.mockRejectedValue(new Error("gateway said no"));

    const state = await run(withDraft, { intent: "change", prompt: "a dal", change: "less salt" });

    expect(state.draft).toEqual(generated);
    expect(state.error).toContain("gateway said no");
  });
});

describe("writeRecipe saving a draft", () => {
  it("writes the recipe and sends the reader to it", async () => {
    const destination = await captureRedirect(() => run(withDraft, { intent: "save" }));

    expect(destination).toBe("/recipes/red-lentil-dal");

    const [recipe] = await db.select().from(recipes);
    expect(recipe.title).toBe("Red lentil dal");
    expect(recipe.instructions).toBe("Rinse the lentils.\nSimmer for 20 minutes.");
  });

  it("stores the ingredients in the order the model gave them", async () => {
    await captureRedirect(() => run(withDraft, { intent: "save" }));

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
    await captureRedirect(() => run(withDraft, { intent: "save" }));

    expect((await db.select().from(recipeSlugs)).map((row) => row.slug)).toEqual([
      "red-lentil-dal",
    ]);
  });

  it("asks no model", async () => {
    await captureRedirect(() => run(withDraft, { intent: "save" }));

    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("refuses to save with no draft in hand", async () => {
    expect(await run(empty, { intent: "save" })).toEqual({
      draft: null,
      error: "There is no draft to save yet.",
    });
  });

  it("refuses a draft the site cannot store, and writes nothing", async () => {
    const state = await run(
      { draft: { ...generated, title: "   " }, error: null },
      { intent: "save" },
    );

    expect(state.error).toContain("cannot be stored");
    expect(await db.select().from(recipes)).toEqual([]);
  });

  it("refuses a title another recipe already holds", async () => {
    await createRecipe({ title: "Red lentil dal" });

    const state = await run(withDraft, { intent: "save" });

    expect(state.error).toContain("already used by another recipe");
    expect(await db.select().from(recipes)).toHaveLength(1);
  });
});

describe("writeRecipe when the draft arrives broken", () => {
  it("treats a draft that is not a recipe as no draft at all", async () => {
    const tampered = { servings: "lots" } as unknown as GeneratedRecipe;

    const state = await run({ draft: tampered, error: null }, { intent: "save" });

    expect(state.error).toBe("There is no draft to save yet.");
    expect(await db.select().from(recipes)).toEqual([]);
  });
});

describe("writeRecipe when there is no key", () => {
  it("says so, and asks no model", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");

    const state = await generate();

    expect(state.error).toContain("AI_GATEWAY");
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("still saves a draft, because saving needs no model", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");

    const destination = await captureRedirect(() => run(withDraft, { intent: "save" }));

    expect(destination).toBe("/recipes/red-lentil-dal");
  });
});
