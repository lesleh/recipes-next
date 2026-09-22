import { afterEach, describe, expect, it, vi } from "vitest";

import { breadcrumbJsonLd, jsonLdScript, recipeJsonLd } from "./recipe-jsonld";

type Overrides = Partial<Parameters<typeof recipeJsonLd>[0]>;

function recipe(overrides: Overrides = {}) {
  return {
    title: "Pancakes",
    slug: "pancakes",
    description: null,
    servings: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    instructions: null,
    imageUrl: null,
    createdAt: new Date("2026-05-28T18:00:00.000Z"),
    updatedAt: new Date("2026-06-04T09:30:00.000Z"),
    ingredients: [],
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("recipeJsonLd", () => {
  it("describes a full recipe", () => {
    vi.stubEnv("SITE_URL", "https://recipes.example");

    expect(
      recipeJsonLd(
        recipe({
          description: "Thin ones, the way they should be.",
          servings: 4,
          prepTimeMinutes: 20,
          cookTimeMinutes: 10,
          instructions: "Whisk the batter\nFry the pancakes",
          imageUrl: "https://blob.example/recipes/pancakes.jpg",
          ingredients: [
            { name: "plain flour", quantity: "200", unit: "g" },
            { name: "eggs", quantity: "2", unit: null },
          ],
        }),
      ),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Pancakes",
      author: { "@type": "Person", name: "Leslie Hoare" },
      description: "Thin ones, the way they should be.",
      image: "https://blob.example/recipes/pancakes.jpg",
      recipeYield: "4 servings",
      prepTime: "PT20M",
      cookTime: "PT10M",
      totalTime: "PT30M",
      recipeIngredient: ["200 g plain flour", "2 eggs"],
      recipeInstructions: [
        {
          "@type": "HowToStep",
          text: "Whisk the batter",
          url: "https://recipes.example/recipes/pancakes#step-1",
        },
        {
          "@type": "HowToStep",
          text: "Fry the pancakes",
          url: "https://recipes.example/recipes/pancakes#step-2",
        },
      ],
      datePublished: "2026-05-28T18:00:00.000Z",
      dateModified: "2026-06-04T09:30:00.000Z",
    });
  });

  it("leaves out everything a recipe with only a title does not have", () => {
    expect(recipeJsonLd(recipe())).toEqual({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Pancakes",
      author: { "@type": "Person", name: "Leslie Hoare" },
      datePublished: "2026-05-28T18:00:00.000Z",
      dateModified: "2026-06-04T09:30:00.000Z",
    });
  });

  it("leaves out a description that is only spaces", () => {
    expect(recipeJsonLd(recipe({ description: "   " }))).not.toHaveProperty("description");
  });

  it("says one serving in the singular", () => {
    expect(recipeJsonLd(recipe({ servings: 1 })).recipeYield).toBe("1 serving");
  });

  it("adds the site origin to a photo held in public/uploads", () => {
    vi.stubEnv("SITE_URL", "https://recipes.example");

    expect(recipeJsonLd(recipe({ imageUrl: "/uploads/abc-pancakes.jpg" })).image).toBe(
      "https://recipes.example/uploads/abc-pancakes.jpg",
    );
  });

  it("uses the Vercel production domain when SITE_URL is unset", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "recipes.lesleh.co.uk");

    expect(recipeJsonLd(recipe({ imageUrl: "/uploads/abc-pancakes.jpg" })).image).toBe(
      "https://recipes.lesleh.co.uk/uploads/abc-pancakes.jpg",
    );
  });

  it("totals whichever of the two times the recipe has", () => {
    expect(recipeJsonLd(recipe({ cookTimeMinutes: 45 }))).toMatchObject({
      cookTime: "PT45M",
      totalTime: "PT45M",
    });
    expect(recipeJsonLd(recipe({ cookTimeMinutes: 45 }))).not.toHaveProperty("prepTime");
  });

  it("keeps ingredients in display order and drops a missing amount", () => {
    expect(
      recipeJsonLd(
        recipe({
          ingredients: [
            { name: "salt", quantity: null, unit: null },
            { name: "milk", quantity: "300", unit: "ml" },
          ],
        }),
      ).recipeIngredient,
    ).toEqual(["salt", "300 ml milk"]);
  });

  it("drops blank lines from the method, and numbers the steps that are left", () => {
    vi.stubEnv("SITE_URL", "https://recipes.example");

    expect(
      recipeJsonLd(recipe({ instructions: "Whisk\n\n  \nFry\n" })).recipeInstructions,
    ).toEqual([
      { "@type": "HowToStep", text: "Whisk", url: "https://recipes.example/recipes/pancakes#step-1" },
      { "@type": "HowToStep", text: "Fry", url: "https://recipes.example/recipes/pancakes#step-2" },
    ]);
  });
});

describe("breadcrumbJsonLd", () => {
  it("runs from the recipe list to the recipe", () => {
    vi.stubEnv("SITE_URL", "https://recipes.example");

    expect(breadcrumbJsonLd({ title: "Pancakes" })).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Recipes", item: "https://recipes.example/" },
        { "@type": "ListItem", position: 2, name: "Pancakes" },
      ],
    });
  });

  it("leaves the address off the recipe itself, which is the page being read", () => {
    expect(breadcrumbJsonLd({ title: "Pancakes" }).itemListElement[1]).not.toHaveProperty("item");
  });
});

describe("jsonLdScript", () => {
  it("escapes the opening bracket, so a title cannot end the script tag", () => {
    const html = jsonLdScript(recipeJsonLd(recipe({ title: "Cake </script><b>x</b>" })));

    expect(html).not.toContain("<");
    expect(html).toContain("\\u003c/script>");
  });

  it("keeps quotes readable to a JSON parser", () => {
    const html = jsonLdScript(recipeJsonLd(recipe({ title: 'The "best" cake' })));

    expect(JSON.parse(html.replaceAll("\\u003c", "<")).name).toBe('The "best" cake');
  });
});
