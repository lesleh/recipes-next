import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { ingredients, recipes } from "@/db/schema";
import { askModelForIllustration } from "@/lib/recipe-illustrator";

export const DRAWING_KEY_MISSING =
  "AI_GATEWAY_API_KEY is not set, so no illustration can be drawn. Add it to .env.local, or to the Vercel project in production.";

/**
 * Draw a recipe's illustration and store it. Returns null when the recipe is
 * gone. Throws when the model fails, and leaves any earlier drawing in place.
 *
 * Does not touch `updated_at`: the recipe itself has not changed, and the
 * sitemap reads that column.
 */
export async function illustrateRecipe(id: number) {
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
    with: { ingredients: { orderBy: [asc(ingredients.position), asc(ingredients.id)] } },
  });

  if (!recipe) return null;

  const illustration = await askModelForIllustration({
    title: recipe.title,
    category: recipe.category,
    cuisine: recipe.cuisine,
    ingredients: recipe.ingredients.map((ingredient) => ingredient.name),
  });

  // The slug is read back, because a rename during a 30 second drawing would
  // leave the one read above stale.
  const [saved] = await db
    .update(recipes)
    .set({ illustration, illustratedAt: new Date() })
    .where(eq(recipes.id, id))
    .returning({ slug: recipes.slug });

  if (!saved) return null;

  revalidatePath(`/recipes/${saved.slug}`);
  revalidatePath(`/recipes/${saved.slug}/edit`);

  return illustration;
}
