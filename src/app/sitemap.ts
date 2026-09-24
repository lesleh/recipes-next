import type { MetadataRoute } from "next";

import { listRecipeAddresses, listTagAddresses } from "@/lib/recipes";
import { absoluteUrl } from "@/lib/site";
import { tagHref } from "@/lib/tags";

/**
 * Read on every request rather than cached. A sitemap route is cached by
 * default, which would leave it listing the recipes that existed when the site
 * was built, and would need a reachable database during the build.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [recipes, tags] = await Promise.all([listRecipeAddresses(), listTagAddresses()]);

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
    // The same address the tag page calls its canonical, so the two agree. A
    // tag is as new as the newest recipe carrying it.
    ...tags.map((tag) => ({
      url: absoluteUrl(tagHref(tag.slug)),
      ...(tag.updatedAt ? { lastModified: tag.updatedAt } : {}),
    })),
  ];
}
