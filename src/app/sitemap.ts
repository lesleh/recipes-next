import type { MetadataRoute } from "next";

import { listRecipeAddresses } from "@/lib/recipes";
import { absoluteUrl } from "@/lib/site";

/**
 * Read on every request rather than cached. A sitemap route is cached by
 * default, which would leave it listing the recipes that existed when the site
 * was built, and would need a reachable database during the build.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const recipes = await listRecipeAddresses();

  // The list page shows every recipe, so it is as new as the newest of them.
  // Saying "now" instead would claim it changed on every fetch.
  const newest = recipes.reduce<Date | null>(
    (latest, recipe) => (latest === null || recipe.updatedAt > latest ? recipe.updatedAt : latest),
    null,
  );

  return [
    { url: absoluteUrl("/"), ...(newest ? { lastModified: newest } : {}) },
    ...recipes.map((recipe) => ({
      url: absoluteUrl(`/recipes/${recipe.slug}`),
      lastModified: recipe.updatedAt,
    })),
  ];
}
