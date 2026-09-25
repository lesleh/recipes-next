import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { recipeSlugs, recipes } from "@/db/schema";
import { DEFAULT_RECIPE_MODEL } from "@/lib/ai-models";
import type { GeneratedRecipe } from "@/lib/recipe-writer";
import { findRecipeBySlug } from "@/lib/recipes";

import { createRecipe } from "../support/factories";
import { captureRedirect, revalidated, scheduled, signOut } from "../support/next-mocks";

const askModelForRecipe = vi.hoisted(() => vi.fn());

// Only the model call is stood in for, as in the tests for the new-recipe page.
vi.mock("@/lib/recipe-writer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/recipe-writer")>()),
  askModelForRecipe,
}));

const { changeRecipe } = await import("@/app/recipes/[slug]/edit/ai/actions");

const changed: GeneratedRecipe = {
  title: "Vegan red lentil dal",
  description: "A weeknight dal, made with coconut oil.",
  category: "Main course",
  cuisine: "Indian",
  tags: "dal, vegan",
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 25,
  instructions: "Rinse the lentils.\nSimmer for 20 minutes.",
  ingredients: [
    { quantity: "200", unit: "g", name: "Red lentils" },
    { quantity: "1", unit: "tbsp", name: "Coconut oil" },
  ],
};

type State = { draft: GeneratedRecipe | null; error: string | null };

/** The page starts with the saved recipe and no draft. */
const empty: State = { draft: null, error: null };

const withDraft: State = { draft: changed, error: null };

function form(fields: Record<string, string | number>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(fields)) data.set(key, String(value));

  return data;
}

async function savedDal() {
  return createRecipe({
    title: "Red lentil dal",
    description: "A weeknight dal.",
    servings: 4,
    instructions: "Rinse the lentils.\nSimmer for 20 minutes.",
    ingredients: [
      { name: "Red lentils", quantity: "200", unit: "g" },
      { name: "Butter", quantity: "1", unit: "tbsp" },
    ],
    tags: ["dal"],
    imageUrl: "https://example.test/dal.jpg",
    imagePathname: "uploads/dal.jpg",
  });
}

beforeEach(() => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
  askModelForRecipe.mockReset();
  askModelForRecipe.mockResolvedValue(changed);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("changeRecipe write access", () => {
  it("refuses without a password, and asks no model", async () => {
    const recipe = await savedDal();
    signOut();

    await expect(
      changeRecipe(empty, form({ id: recipe.id, intent: "change", change: "make it vegan" })),
    ).rejects.toThrow("A password is needed");

    expect(askModelForRecipe).not.toHaveBeenCalled();
  });
});

describe("changeRecipe making a change", () => {
  it("starts the first change from the recipe as saved", async () => {
    const recipe = await savedDal();

    await changeRecipe(empty, form({ id: recipe.id, intent: "change", change: "make it vegan" }));

    expect(askModelForRecipe).toHaveBeenCalledWith({
      model: DEFAULT_RECIPE_MODEL,
      draft: expect.objectContaining({
        title: "Red lentil dal",
        tags: "dal",
        prepTimeMinutes: null,
        ingredients: [
          { quantity: "200", unit: "g", name: "Red lentils" },
          { quantity: "1", unit: "tbsp", name: "Butter" },
        ],
      }),
      change: "make it vegan",
    });
  });

  it("gives back a draft and leaves the saved recipe alone", async () => {
    const recipe = await savedDal();

    const state = await changeRecipe(
      empty,
      form({ id: recipe.id, intent: "change", change: "make it vegan" }),
    );

    expect(state).toEqual({ draft: changed, error: null });
    expect((await findRecipeBySlug("red-lentil-dal"))?.title).toBe("Red lentil dal");
  });

  it("starts a later change from the draft in hand", async () => {
    const recipe = await savedDal();

    await changeRecipe(withDraft, form({ id: recipe.id, intent: "change", change: "less salt" }));

    expect(askModelForRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ draft: changed, change: "less salt" }),
    );
  });

  it("asks the model the form chose", async () => {
    const recipe = await savedDal();

    await changeRecipe(
      empty,
      form({ id: recipe.id, intent: "change", change: "less salt", model: "openai/gpt-5-nano" }),
    );

    expect(askModelForRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ model: "openai/gpt-5-nano" }),
    );
  });

  it("refuses an empty change", async () => {
    const recipe = await savedDal();

    const state = await changeRecipe(withDraft, form({ id: recipe.id, intent: "change" }));

    expect(state).toEqual({ draft: changed, error: "Say what should change about the recipe." });
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("refuses a change that is too long", async () => {
    const recipe = await savedDal();

    const state = await changeRecipe(
      empty,
      form({ id: recipe.id, intent: "change", change: "x".repeat(301) }),
    );

    expect(state.error).toContain("300 characters or fewer");
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("keeps the draft when the model fails", async () => {
    const recipe = await savedDal();
    askModelForRecipe.mockRejectedValue(new Error("gateway said no"));

    const state = await changeRecipe(
      withDraft,
      form({ id: recipe.id, intent: "change", change: "less salt" }),
    );

    expect(state.draft).toEqual(changed);
    expect(state.error).toBe("The model could not change the recipe. gateway said no");
  });

  it("says so when there is no key, and asks no model", async () => {
    const recipe = await savedDal();
    vi.stubEnv("AI_GATEWAY_API_KEY", "");

    const state = await changeRecipe(
      empty,
      form({ id: recipe.id, intent: "change", change: "less salt" }),
    );

    expect(state.error).toContain("AI_GATEWAY_API_KEY");
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });
});

describe("changeRecipe saving the draft", () => {
  it("writes the draft over the recipe and sends the reader to it", async () => {
    const recipe = await savedDal();

    const destination = await captureRedirect(() =>
      changeRecipe(withDraft, form({ id: recipe.id, intent: "save" })),
    );

    expect(destination).toBe("/recipes/vegan-red-lentil-dal");

    const saved = await findRecipeBySlug("vegan-red-lentil-dal");

    expect(saved?.id).toBe(recipe.id);
    expect(saved?.ingredients.map((row) => row.name)).toEqual(["Red lentils", "Coconut oil"]);
    expect(saved?.tags.map((tag) => tag.name)).toEqual(["dal", "vegan"]);
    expect(await db.select().from(recipes)).toHaveLength(1);
  });

  it("keeps the photo, and draws nothing", async () => {
    const recipe = await savedDal();

    await captureRedirect(() => changeRecipe(withDraft, form({ id: recipe.id, intent: "save" })));

    const [row] = await db.select().from(recipes).where(eq(recipes.id, recipe.id));

    expect(row.imagePathname).toBe("uploads/dal.jpg");
    expect(scheduled).toEqual([]);
  });

  it("keeps the old address, which now redirects", async () => {
    const recipe = await savedDal();

    await captureRedirect(() => changeRecipe(withDraft, form({ id: recipe.id, intent: "save" })));

    const slugs = await db.select().from(recipeSlugs).where(eq(recipeSlugs.recipeId, recipe.id));

    expect(slugs.map((row) => row.slug).sort()).toEqual(["red-lentil-dal", "vegan-red-lentil-dal"]);
    expect(revalidated).toContain("/recipes/red-lentil-dal");
  });

  it("asks no model", async () => {
    const recipe = await savedDal();

    await captureRedirect(() => changeRecipe(withDraft, form({ id: recipe.id, intent: "save" })));

    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("refuses to save before anything has changed", async () => {
    const recipe = await savedDal();

    expect(await changeRecipe(empty, form({ id: recipe.id, intent: "save" }))).toEqual({
      draft: null,
      error: "Nothing has changed yet.",
    });
  });

  it("refuses a title another recipe already holds, and keeps the draft", async () => {
    const recipe = await savedDal();
    await createRecipe({ title: "Vegan red lentil dal" });

    const state = await changeRecipe(withDraft, form({ id: recipe.id, intent: "save" }));

    expect(state.draft).toEqual(changed);
    expect(state.error).toContain("already used by another recipe");
    expect((await findRecipeBySlug("red-lentil-dal"))?.title).toBe("Red lentil dal");
  });

  it("refuses a draft the site cannot store", async () => {
    const recipe = await savedDal();

    const state = await changeRecipe(
      { draft: { ...changed, title: "   " }, error: null },
      form({ id: recipe.id, intent: "save" }),
    );

    expect(state.error).toContain("cannot be stored");
    expect((await findRecipeBySlug("red-lentil-dal"))?.title).toBe("Red lentil dal");
  });

  it("still saves when there is no key, because saving needs no model", async () => {
    const recipe = await savedDal();
    vi.stubEnv("AI_GATEWAY_API_KEY", "");

    const destination = await captureRedirect(() =>
      changeRecipe(withDraft, form({ id: recipe.id, intent: "save" })),
    );

    expect(destination).toBe("/recipes/vegan-red-lentil-dal");
  });
});

describe("changeRecipe discarding the draft", () => {
  it("goes back to the recipe as saved, and writes nothing", async () => {
    const recipe = await savedDal();

    const state = await changeRecipe(withDraft, form({ id: recipe.id, intent: "discard" }));

    expect(state).toEqual({ draft: null, error: null });
    expect((await findRecipeBySlug("red-lentil-dal"))?.title).toBe("Red lentil dal");
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });
});

describe("changeRecipe when the form arrives broken", () => {
  it("says the recipe is gone when the id matches none", async () => {
    const state = await changeRecipe(withDraft, form({ id: 999, intent: "save" }));

    expect(state).toEqual({ draft: null, error: "This recipe no longer exists." });
    expect(await db.select().from(recipes)).toEqual([]);
  });

  it("says the recipe is gone when there is no id", async () => {
    const state = await changeRecipe(empty, form({ intent: "change", change: "less salt" }));

    expect(state.error).toBe("This recipe no longer exists.");
    expect(askModelForRecipe).not.toHaveBeenCalled();
  });

  it("treats a draft that is not a recipe as no draft at all", async () => {
    const recipe = await savedDal();
    const tampered = { servings: "lots" } as unknown as GeneratedRecipe;

    const state = await changeRecipe(
      { draft: tampered, error: null },
      form({ id: recipe.id, intent: "save" }),
    );

    expect(state.error).toBe("Nothing has changed yet.");
    expect((await findRecipeBySlug("red-lentil-dal"))?.title).toBe("Red lentil dal");
  });
});
