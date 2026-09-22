import { and, asc, eq, exists, ilike, or, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { ingredients, recipeSlugs, recipes } from "@/db/schema";

/** Escape the LIKE wildcards so a search for "100%" does not match everything. */
function likePattern(term: string) {
  return `%${term.trim().replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

function matchesIngredient(pattern: string) {
  return exists(
    db
      .select({ found: sql`1` })
      .from(ingredients)
      .where(and(eq(ingredients.recipeId, recipes.id), ilike(ingredients.name, pattern))),
  );
}

export async function listRecipes(query?: string) {
  const term = query?.trim();
  const pattern = term ? likePattern(term) : null;

  return db.query.recipes.findMany({
    where: pattern
      ? or(
          ilike(recipes.title, pattern),
          ilike(recipes.description, pattern),
          matchesIngredient(pattern),
        )
      : undefined,
    with: {
      ingredients: { orderBy: [asc(ingredients.position), asc(ingredients.id)] },
    },
    orderBy: [asc(recipes.title)],
  });
}

/**
 * The current address of every recipe, and when it last changed. The sitemap
 * needs nothing else, so this skips the ingredients the list page loads.
 *
 * Read from `recipes` rather than `recipe_slugs`, because that table holds
 * every slug a recipe has ever held and a retired one only redirects.
 */
export async function listRecipeAddresses() {
  return db
    .select({ slug: recipes.slug, updatedAt: recipes.updatedAt })
    .from(recipes)
    .orderBy(asc(recipes.slug));
}

/**
 * Wrapped in `cache` because a page and its `generateMetadata` both need the
 * recipe, and each render would otherwise ask the database for it twice. The
 * memo lasts one render and no longer, so a save is never served stale.
 */
export const findRecipeBySlug = cache(async (slug: string) => {
  return db.query.recipes.findFirst({
    where: eq(recipes.slug, slug),
    with: {
      ingredients: { orderBy: [asc(ingredients.position), asc(ingredients.id)] },
    },
  });
});

/**
 * The slug a recipe answers at now, given any slug it has ever held. Returns
 * undefined when no recipe has ever held the slug, or when the recipe holding
 * it was deleted.
 */
export async function findCurrentSlug(slug: string) {
  const [row] = await db
    .select({ slug: recipes.slug })
    .from(recipeSlugs)
    .innerJoin(recipes, eq(recipes.id, recipeSlugs.recipeId))
    .where(eq(recipeSlugs.slug, slug))
    .limit(1);

  return row?.slug;
}

export type RecipeListItem = Awaited<ReturnType<typeof listRecipes>>[number];
