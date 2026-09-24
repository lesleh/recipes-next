import { db } from "@/db";
import { ingredients, recipeSlugs, recipes } from "@/db/schema";
import { replaceTags } from "@/lib/recipe-tags";
import { slugify } from "@/lib/slug";

type IngredientRow = { name: string; quantity?: string | null; unit?: string | null };

type RecipeAttributes = {
  title?: string;
  slug?: string;
  description?: string | null;
  servings?: number | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  instructions?: string | null;
  imageUrl?: string | null;
  imagePathname?: string | null;
  ingredients?: IngredientRow[];
  /** Tag names, as the form would have submitted them. */
  tags?: string[];
  /** Slugs the recipe held before this one, as a rename would have left them. */
  formerSlugs?: string[];
};

let counter = 0;

/**
 * A recipe row, with only what a test cares about spelled out. Writes the
 * `recipe_slugs` row too, because every recipe the application saves has one.
 */
export async function createRecipe(attributes: RecipeAttributes = {}) {
  counter += 1;

  const title = attributes.title ?? `Test recipe ${counter}`;
  const slug = attributes.slug ?? slugify(title);

  const [recipe] = await db
    .insert(recipes)
    .values({
      title,
      slug,
      description: attributes.description ?? null,
      servings: attributes.servings ?? null,
      prepTimeMinutes: attributes.prepTimeMinutes ?? null,
      cookTimeMinutes: attributes.cookTimeMinutes ?? null,
      instructions: attributes.instructions ?? null,
      imageUrl: attributes.imageUrl ?? null,
      imagePathname: attributes.imagePathname ?? null,
    })
    .returning();

  const held = [...(attributes.formerSlugs ?? []), slug];

  await db.insert(recipeSlugs).values(held.map((value) => ({ slug: value, recipeId: recipe.id })));

  const rows = attributes.ingredients ?? [];

  if (rows.length > 0) {
    await db.insert(ingredients).values(
      rows.map((row, index) => ({
        recipeId: recipe.id,
        name: row.name,
        quantity: row.quantity ?? null,
        unit: row.unit ?? null,
        position: index + 1,
      })),
    );
  }

  if (attributes.tags && attributes.tags.length > 0) {
    await replaceTags(db, recipe.id, attributes.tags);
  }

  return recipe;
}
