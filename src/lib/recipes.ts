import { and, asc, eq, exists, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { ingredients, recipes } from "@/db/schema";

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

export async function findRecipe(id: number) {
  return db.query.recipes.findFirst({
    where: eq(recipes.id, id),
    with: {
      ingredients: { orderBy: [asc(ingredients.position), asc(ingredients.id)] },
    },
  });
}

export type RecipeListItem = Awaited<ReturnType<typeof listRecipes>>[number];
