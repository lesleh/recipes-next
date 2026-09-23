import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { ingredients, recipeSlugs, recipes } from "@/db/schema";
import { deleteRecipe, saveRecipe } from "@/app/recipes/actions";

import { createRecipe } from "../support/factories";
import { captureRedirect, removeImage, signOut } from "../support/next-mocks";

/** The form the actions read, with everything the schema needs present. */
function recipeForm(fields: Record<string, string> = {}) {
  const form = new FormData();

  const values: Record<string, string> = {
    title: "Bread",
    description: "",
    servings: "",
    prepTimeMinutes: "",
    cookTimeMinutes: "",
    instructions: "",
    ingredients: "[]",
    ...fields,
  };

  for (const [key, value] of Object.entries(values)) form.set(key, value);

  return form;
}

function ingredientsJson(rows: { name: string; quantity?: string; unit?: string }[]) {
  return JSON.stringify(rows.map((row) => ({ quantity: "", unit: "", ...row })));
}

const save = (form: FormData) => saveRecipe({ errors: [] }, form);

async function rowsFor(recipeId: number) {
  return db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
    with: { ingredients: { orderBy: [asc(ingredients.position)] } },
  });
}

describe("saveRecipe write access", () => {
  it("refuses to save without a password", async () => {
    signOut();

    await expect(save(recipeForm())).rejects.toThrow("A password is needed");
    expect(await db.select().from(recipes)).toEqual([]);
  });
});

describe("saveRecipe creating a recipe", () => {
  it("stores the recipe and sends the reader to it", async () => {
    const destination = await captureRedirect(() => save(recipeForm({ title: "Chocolate Cake" })));

    expect(destination).toBe("/recipes/chocolate-cake");

    const [recipe] = await db.select().from(recipes);
    expect(recipe.title).toBe("Chocolate Cake");
    expect(recipe.slug).toBe("chocolate-cake");
  });

  it("stores the course, the cuisine and the keywords", async () => {
    await captureRedirect(() =>
      save(
        recipeForm({
          category: "Dessert",
          cuisine: "French",
          keywords: "tart, apples",
        }),
      ),
    );

    const [recipe] = await db.select().from(recipes);

    expect(recipe).toMatchObject({
      category: "Dessert",
      cuisine: "French",
      keywords: "tart, apples",
    });
  });

  it("stores a blank course, cuisine and keywords as nothing at all", async () => {
    await captureRedirect(() => save(recipeForm()));

    const [recipe] = await db.select().from(recipes);

    expect(recipe).toMatchObject({ category: null, cuisine: null, keywords: null });
  });

  it("records the slug in the history, so the address survives a rename", async () => {
    await captureRedirect(() => save(recipeForm({ title: "Bread" })));

    const held = await db.select().from(recipeSlugs);

    expect(held.map((row) => row.slug)).toEqual(["bread"]);
  });

  it("stores the ingredients in the order they were submitted", async () => {
    await captureRedirect(() =>
      save(
        recipeForm({
          ingredients: ingredientsJson([
            { name: "Flour", quantity: "500", unit: "g" },
            { name: "Water" },
            { name: "Salt" },
          ]),
        }),
      ),
    );

    const [recipe] = await db.select().from(recipes);
    const stored = await rowsFor(recipe.id);

    expect(stored?.ingredients.map((row) => [row.name, row.position])).toEqual([
      ["Flour", 1],
      ["Water", 2],
      ["Salt", 3],
    ]);
  });

  it("drops a blank ingredient row rather than refusing the save", async () => {
    await captureRedirect(() =>
      save(recipeForm({ ingredients: ingredientsJson([{ name: "Flour" }, { name: "   " }]) })),
    );

    const [recipe] = await db.select().from(recipes);
    const stored = await rowsFor(recipe.id);

    expect(stored?.ingredients).toHaveLength(1);
  });
});

describe("saveRecipe refusing a title", () => {
  it("refuses a title holding no letters or numbers", async () => {
    const state = await save(recipeForm({ title: "!!!" }));

    expect(state.errors[0]).toMatchObject({ field: "title" });
    expect(state.errors[0].message).toContain("at least one letter or number");
    expect(await db.select().from(recipes)).toEqual([]);
  });

  it("refuses a title whose slug is already a page on the site", async () => {
    const state = await save(recipeForm({ title: "New" }));

    expect(state.errors[0]).toMatchObject({ field: "title" });
    expect(state.errors[0].message).toContain("/recipes/new");
  });

  it("refuses a title another recipe already holds", async () => {
    await createRecipe({ title: "Chocolate Cake" });

    const state = await save(recipeForm({ title: "Chocolate cake!" }));

    expect(state.errors[0].message).toContain("already used by another recipe");
    expect(await db.select().from(recipes)).toHaveLength(1);
  });

  // The whole point of keeping retired slugs: a second recipe cannot take an
  // address the first one used to answer at.
  it("refuses a title whose slug another recipe retired", async () => {
    await createRecipe({ title: "Sourdough", formerSlugs: ["bread"] });

    const state = await save(recipeForm({ title: "Bread" }));

    expect(state.errors[0].message).toContain("already used by another recipe");
  });

  it("refuses a blank title with the message from the schema", async () => {
    const state = await save(recipeForm({ title: "  " }));

    expect(state.errors[0]).toMatchObject({ field: "title", message: "Title is required" });
  });
});

describe("saveRecipe editing a recipe", () => {
  it("replaces the ingredient rows wholesale", async () => {
    const recipe = await createRecipe({
      title: "Bread",
      ingredients: [{ name: "Flour" }, { name: "Water" }],
    });

    await captureRedirect(() =>
      save(
        recipeForm({
          id: String(recipe.id),
          title: "Bread",
          ingredients: ingredientsJson([{ name: "Rye flour" }]),
        }),
      ),
    );

    const stored = await rowsFor(recipe.id);

    expect(stored?.ingredients.map((row) => row.name)).toEqual(["Rye flour"]);
  });

  it("keeps the old slug in the history when the title changes", async () => {
    const recipe = await createRecipe({ title: "Bread" });

    const destination = await captureRedirect(() =>
      save(recipeForm({ id: String(recipe.id), title: "Sourdough" })),
    );

    expect(destination).toBe("/recipes/sourdough");

    const held = await db
      .select()
      .from(recipeSlugs)
      .where(eq(recipeSlugs.recipeId, recipe.id))
      .orderBy(asc(recipeSlugs.slug));

    expect(held.map((row) => row.slug)).toEqual(["bread", "sourdough"]);
  });

  it("lets a recipe take back a slug from its own history", async () => {
    const recipe = await createRecipe({ title: "Sourdough", formerSlugs: ["bread"] });

    const destination = await captureRedirect(() =>
      save(recipeForm({ id: String(recipe.id), title: "Bread" })),
    );

    expect(destination).toBe("/recipes/bread");
  });

  it("sends the reader home when the recipe has since been deleted", async () => {
    const destination = await captureRedirect(() =>
      save(recipeForm({ id: "9999", title: "Bread" })),
    );

    expect(destination).toBe("/");
  });
});

describe("deleteRecipe", () => {
  function deleteForm(id: string) {
    const form = new FormData();
    form.set("id", id);

    return form;
  }

  it("refuses to delete without a password", async () => {
    const recipe = await createRecipe({ title: "Bread" });
    signOut();

    await expect(deleteRecipe(deleteForm(String(recipe.id)))).rejects.toThrow(
      "A password is needed",
    );
    expect(await db.select().from(recipes)).toHaveLength(1);
  });

  it("deletes the recipe and sends the reader home", async () => {
    const recipe = await createRecipe({ title: "Bread" });

    const destination = await captureRedirect(() => deleteRecipe(deleteForm(String(recipe.id))));

    expect(destination).toBe("/");
    expect(await db.select().from(recipes)).toEqual([]);
  });

  it("clears the ingredients and the slug history through the cascade", async () => {
    const recipe = await createRecipe({
      title: "Sourdough",
      formerSlugs: ["bread"],
      ingredients: [{ name: "Flour" }, { name: "Water" }],
    });

    await captureRedirect(() => deleteRecipe(deleteForm(String(recipe.id))));

    expect(await db.select().from(ingredients)).toEqual([]);
    expect(await db.select().from(recipeSlugs)).toEqual([]);
  });

  // Every slug the deleted recipe held is free again, so another recipe can
  // take one.
  it("frees the slugs it held for another recipe", async () => {
    const recipe = await createRecipe({ title: "Sourdough", formerSlugs: ["bread"] });
    await captureRedirect(() => deleteRecipe(deleteForm(String(recipe.id))));

    const destination = await captureRedirect(() => save(recipeForm({ title: "Bread" })));

    expect(destination).toBe("/recipes/bread");
  });

  it("removes the photo it held", async () => {
    const recipe = await createRecipe({
      title: "Bread",
      imageUrl: "https://example.test/bread.jpg",
      imagePathname: "uploads/bread.jpg",
    });

    await captureRedirect(() => deleteRecipe(deleteForm(String(recipe.id))));

    expect(removeImage).toHaveBeenCalledWith("uploads/bread.jpg");
  });

  it("sends the reader home when the recipe is already gone", async () => {
    const destination = await captureRedirect(() => deleteRecipe(deleteForm("9999")));

    expect(destination).toBe("/");
  });
});
