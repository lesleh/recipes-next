/**
 * Slugs that a recipe cannot take, because a page already answers at that
 * address under /recipes.
 */
export const RESERVED_SLUGS = new Set(["new"]);

/**
 * Build a URL slug from a recipe title.
 *
 * Accented letters are reduced to their base letter, so "Crème Brûlée" gives
 * "creme-brulee". Letters from other scripts are kept as they are. Everything
 * else becomes a separator. A title with no letters or numbers gives "", which
 * the caller has to refuse.
 */
export function slugify(title: string) {
  return title
    .normalize("NFKD")
    // NFKD leaves the accent behind as a combining mark; drop it.
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
