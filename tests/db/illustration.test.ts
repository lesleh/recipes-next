import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { recipes } from "@/db/schema";
import { drawIllustration, saveRecipe } from "@/app/recipes/actions";
import { HOME_ILLUSTRATION } from "@/lib/illustration-examples";

import { createRecipe } from "../support/factories";
import { captureRedirect, revalidated, scheduled, signOut } from "../support/next-mocks";

const askModelForIllustration = vi.hoisted(() => vi.fn());

// Only the model call is stood in for. No test reaches the gateway.
vi.mock("@/lib/recipe-illustrator", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/recipe-illustrator")>()),
  askModelForIllustration,
}));

const earlier = { ...HOME_ILLUSTRATION, ground: "pink" as const };

function idForm(id: number | string) {
  const form = new FormData();
  form.set("id", String(id));
  return form;
}

const draw = (id: number | string) => drawIllustration({ error: null }, idForm(id));

function recipeForm(fields: Record<string, string> = {}) {
  const form = new FormData();
  const values = { title: "Bread", instructions: "", ingredients: "[]", ...fields };

  for (const [key, value] of Object.entries(values)) form.set(key, value);

  return form;
}

async function stored(id: number) {
  return db.query.recipes.findFirst({ where: eq(recipes.id, id) });
}

beforeEach(() => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
  askModelForIllustration.mockReset();
  askModelForIllustration.mockResolvedValue(HOME_ILLUSTRATION);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("drawIllustration", () => {
  it("refuses without a password, and asks no model", async () => {
    const recipe = await createRecipe();
    signOut();

    await expect(draw(recipe.id)).rejects.toThrow("A password is needed");
    expect(askModelForIllustration).not.toHaveBeenCalled();
  });

  it("draws from the title and the ingredients, stores it and clears the pages", async () => {
    const recipe = await createRecipe({
      title: "Lemon drizzle cake",
      ingredients: [{ name: "Lemons" }, { name: "Butter" }],
    });

    await expect(draw(recipe.id)).resolves.toEqual({ error: null });

    expect(askModelForIllustration).toHaveBeenCalledWith({
      title: "Lemon drizzle cake",
      category: null,
      cuisine: null,
      ingredients: ["Lemons", "Butter"],
    });

    const row = await stored(recipe.id);
    expect(row?.illustration).toEqual(HOME_ILLUSTRATION);
    expect(row?.illustratedAt).toBeInstanceOf(Date);
    expect(row?.updatedAt).toEqual(recipe.updatedAt);
    expect(revalidated).toEqual(["/recipes/lemon-drizzle-cake", "/recipes/lemon-drizzle-cake/edit"]);
  });

  it("keeps the earlier drawing and says why when the model fails", async () => {
    const recipe = await createRecipe();
    await db.update(recipes).set({ illustration: earlier }).where(eq(recipes.id, recipe.id));
    askModelForIllustration.mockRejectedValue(new Error("The drawing was refused twice."));

    const state = await draw(recipe.id);

    expect(state.error).toBe(
      "The model could not draw an illustration. The drawing was refused twice.",
    );
    expect((await stored(recipe.id))?.illustration).toEqual(earlier);
  });

  it("says so when the gateway key is not set", async () => {
    const recipe = await createRecipe();
    vi.stubEnv("AI_GATEWAY_API_KEY", "");

    const state = await draw(recipe.id);

    expect(state.error).toContain("AI_GATEWAY_API_KEY is not set");
    expect(askModelForIllustration).not.toHaveBeenCalled();
  });

  it("says so when the recipe is gone", async () => {
    await expect(draw(999)).resolves.toEqual({ error: "This recipe no longer exists." });
  });
});

describe("saveRecipe and drawing", () => {
  it("draws a new recipe once, after the reader is sent on", async () => {
    await captureRedirect(() => saveRecipe({ errors: [] }, recipeForm({ title: "Focaccia" })));

    expect(askModelForIllustration).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);

    await scheduled[0]();

    const [row] = await db.select().from(recipes);
    expect(askModelForIllustration).toHaveBeenCalledTimes(1);
    expect(row.illustration).toEqual(HOME_ILLUSTRATION);
  });

  it("never draws on an edit", async () => {
    const recipe = await createRecipe({ title: "Focaccia" });

    await captureRedirect(() =>
      saveRecipe({ errors: [] }, recipeForm({ id: String(recipe.id), title: "Rosemary focaccia" })),
    );

    expect(scheduled).toEqual([]);
  });

  it("schedules nothing when the gateway key is not set", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");

    await captureRedirect(() => saveRecipe({ errors: [] }, recipeForm()));

    expect(scheduled).toEqual([]);
  });

  it("keeps the recipe when the drawing after it fails", async () => {
    askModelForIllustration.mockRejectedValue(new Error("No access to this model at this time."));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await captureRedirect(() => saveRecipe({ errors: [] }, recipeForm()));
    await scheduled[0]();

    const [row] = await db.select().from(recipes);
    expect(row.title).toBe("Bread");
    expect(row.illustration).toBeNull();
    expect(error).toHaveBeenCalled();

    error.mockRestore();
  });
});
